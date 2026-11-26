"use server";

import { trainings_ref } from "@prisma/client";
import {
  getVehiclesWithSeats,
  getAvailableMemberWithQualifications,
  assignMembersToSeats,
} from "../db/queries";
import { hasAGTQualification } from "./rules";
import { MemberWithQualifications, vehicleWithSeats, seat, getAssignedSeatIds } from "../db/queries";
import { verifymemberQualificationsForSeat } from "./rules";
import path from "path";
import { readFile } from "fs/promises";

type SeatAssignments = Record<string, string | null>;

export async function assignMembersToVehicles(vehicles: string[], signal?: AbortSignal) {
  if (signal?.aborted) {
    return true;
  }
  const vehiclesWithSeats = await getVehiclesWithSeats(vehicles ?? []);
  const orderedSeatsOfVehicles = await orderSeats(vehiclesWithSeats);
  const availableMembers : MemberWithQualifications[] = await getAvailableMemberWithQualifications();
  const assignedMembers : MemberWithQualifications[] = [];
  const assignedSeatsOfVehicles = await getAssignedSeatIds();
  const seatsToBeAssigned = orderedSeatsOfVehicles.filter(
    (seatId) => !assignedSeatsOfVehicles.some(({ seat_id }) => seat_id === seatId),
  );
  const einteilung: SeatAssignments = {};
  
  const availableZF = createNewSet(availableMembers, trainings_ref.ZF);
  const availableGF = createNewSet(availableMembers, trainings_ref.GF);
  const availableTF = createNewSet(availableMembers, trainings_ref.TF);
  const availableMA = createNewSet(availableMembers, trainings_ref.MA);
  const availableAGT = createNewSet(availableMembers, trainings_ref.AGT);

  const orderedBySize = [
    { training: trainings_ref.ZF, members: availableZF },
    { training: trainings_ref.GF, members: availableGF },
    { training: trainings_ref.TF, members: availableTF },
    { training: trainings_ref.MA, members: availableMA },
    { training: trainings_ref.AGT, members: availableAGT },
  ].sort((a, b) => a.members.size - b.members.size);
  
  let assignmentFinished = true;

  for (const seatId of seatsToBeAssigned) {
    const vehicle = vehiclesWithSeats.find((vehicle) => vehicle.seats.some((seat) => seat.id === seatId));
    const seat = vehicle.seats.find((seat) => seat.id === seatId);

    if (signal?.aborted) {
      return true;
    }
    const requiredTrainings = getRequiredTrainings(seat);
    if (requiredTrainings.length > 0) {
      const candidateGroups = orderedBySize.filter(({ training })=> requiredTrainings.includes(training));
      for (const group of candidateGroups) {
        const member = [...group.members].find((member)=>
          assignedMembers.every((assigned) => assigned.id !== member.id) &&
          verifymemberQualificationsForSeat(member, vehicle.opta, seat));
        if(member) {
          einteilung[seat.id] = member.id;
          assignedMembers.push(member);
        }
      }
    } else {
      const member = [...availableMembers].find((member)=>
        assignedMembers.every((assigned) => assigned.id !== member.id) &&
        verifymemberQualificationsForSeat(member, vehicle.opta, seat));
      if (member) {
        einteilung[seat.id] = member.id;
        assignedMembers.push(member);
      }
    }
  }
  for (const seat of seatsToBeAssigned) {
    if (!einteilung[seat]) {
      assignmentFinished = false;
      break;
    }
  }
  let vehicleAssigned = true;
  checkAllVehicles : for (const vehicle of vehiclesWithSeats) {
    const vehicleAssignment: SeatAssignments = {};
    for (const seat of vehicle.seats) {
      if (!einteilung[seat.id] && seatsToBeAssigned.includes(seat.id)) {
        for (const assignedSeatId of Object.keys(vehicleAssignment)) {
          delete vehicleAssignment[assignedSeatId];
        }
        vehicleAssigned = false;
        break;
      }
      vehicleAssignment[seat.id] = einteilung[seat.id];
    }
    if (vehicleAssigned) {
      assignMembersToSeats(vehicleAssignment, [vehicle.id]);
      continue checkAllVehicles;
    }

    vehicleAssigned = true;
    if (vehicle.opta === "09-46-56" || vehicle.opta === "80-44-01") {
      for (const seat of vehicle.seats) {
        if (seat.seat !== "ME" && seat.seat !== "STF" && seat.seat !== "STM") {
          if (!einteilung[seat.id] && seatsToBeAssigned.includes(seat.id)) {
            for (const assignedSeatId of Object.keys(vehicleAssignment)) {
              delete vehicleAssignment[assignedSeatId];
            }
            vehicleAssigned = false;
            break;
          }
          vehicleAssignment[seat.id] = einteilung[seat.id];
        } 
      }
      assignMembersToSeats(vehicleAssignment, [vehicle.id]);
    } 
    if (vehicleAssigned) {
      assignMembersToSeats(vehicleAssignment, [vehicle.id]);
      continue checkAllVehicles;
    }

    vehicleAssigned = true;
    for (const seat of vehicle.seats) {
      if (seat.id === "GF" || seat.id === "MA") {
        if (!einteilung[seat.id] && seatsToBeAssigned.includes(seat.id)) {
          continue checkAllVehicles;
        }
        vehicleAssignment[seat.id] = einteilung[seat.id];
      }
    }
    assignMembersToSeats(vehicleAssignment, [vehicle.id]);
  }

  if (signal?.aborted) {
    return true;
  }
  return assignmentFinished;
}

function createNewSet(members : MemberWithQualifications[], training : trainings_ref) {
  return new Set(
    members.filter((member) => training === trainings_ref.AGT
      ? hasAGTQualification(member.members.member_trainings_view.map((training) => training.training.ref))
      : member.members.member_trainings_view.some(
          (memberTraining) => memberTraining.training.ref === training,
        )),
  );
}

function getRequiredTrainings(currentSeat: seat): trainings_ref[] {
  const requiredTrainings: trainings_ref[] = [];

  if (currentSeat.agt) {
    requiredTrainings.push(trainings_ref.AGT);
  }
  if (currentSeat.leadership) {
    requiredTrainings.push(currentSeat.leadership as trainings_ref);
  }
  if (currentSeat.seat === trainings_ref.MA) {
    requiredTrainings.push(trainings_ref.MA);
  }

  return requiredTrainings;
}


async function orderSeats(vehiclesWithSeats: vehicleWithSeats[]): Promise<string[]> {
  const seatsInAssignmentOrder: string[] = [];

  function findAndPushSeat(opta: string, seatName: seat["seat"]) {
    const seatId = vehiclesWithSeats
      .find((vehicle) => vehicle.opta === opta)
      ?.seats.find((seat) => seat.seat === seatName)?.id;
    if (seatId && !seatsInAssignmentOrder.includes(seatId)) {
      seatsInAssignmentOrder.push(seatId);
    }
  }

  const filePath = path.join(process.cwd(), "public", "niklasSeatOrder.csv");
  const fileContent = await readFile(filePath, "utf-8");

  for (const line of fileContent.split(/\r?\n/)) {
    const [opta, seatName] = line.split(";").map((value) => value.trim());
    if (opta && seatName) {
      findAndPushSeat(opta, seatName as seat["seat"]);
    }
  }

  vehiclesWithSeats.forEach((vehicle) => {
    vehicle.seats.forEach((seat) => {
      if (!seatsInAssignmentOrder.includes(seat.id)) {
        seatsInAssignmentOrder.push(seat.id);
      }
    });
  });
  return seatsInAssignmentOrder;
}