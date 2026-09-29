"use server";

import { trainings_ref } from "@prisma/client";
import {
  getVehiclesWithSeats,
  getAvailableMemberWithQualifications,
  getPresentMemberAssignments,
  assignMembersToSeats,
} from "../db/queries";
import { hasAGTQualification } from "./rules";
import { MemberWithQualifications, vehicleWithSeats, seat } from "../db/queries";
import { verifymemberQualificationsForSeat } from "./rules";

type SeatAssignments = Record<string, string | null>;
type PresavedAssignment = {vehicleId : string; seatId: string};

class Index{
  static i = 0;
}

export async function assignMembersToVehicles(vehicles: string[], signal?: AbortSignal) {
  if (signal?.aborted) {
    return;
  }
  const availableMembers : MemberWithQualifications[] = await getAvailableMemberWithQualifications();
  const einteilung: SeatAssignments = {};
  const vehiclesWithSeats = await getVehiclesWithSeats(vehicles ?? []);
  const assignedVehicles: vehicleWithSeats[] = [];
  

  const availableZF = createNewSet(availableMembers, trainings_ref.ZF);
  const availableGF = createNewSet(availableMembers, trainings_ref.GF);
  const availableTF = createNewSet(availableMembers, trainings_ref.TF);
  const availableMA = createNewSet(availableMembers, trainings_ref.MA);
  const availableAGT = createNewSet(availableMembers, trainings_ref.AGT);
  const availableOthers = new Set(availableMembers.filter(
    (member) =>
      !availableZF.has(member) &&
      !availableGF.has(member) &&
      !availableTF.has(member) &&
      !availableMA.has(member) &&
      !availableAGT.has(member),
  ));
  

  const orderedBySize = [
    { training: trainings_ref.ZF, members: availableZF },
    { training: trainings_ref.GF, members: availableGF },
    { training: trainings_ref.TF, members: availableTF },
    { training: trainings_ref.MA, members: availableMA },
    { training: trainings_ref.AGT, members: availableAGT },
  ].sort((a, b) => a.members.size - b.members.size);
  let i = 0;
  for (const set of orderedBySize) {
    i += set.members.size;
  }
  i += availableOthers.size;
  console.log(i);

  const orderedSeats = vehiclesWithSeats.flatMap((vehicle)=>
    vehicle.seats.map((seat)=>({vehicle, seat}))
  ).sort((a, b)=> getRarity(a.seat, orderedBySize) - getRarity(b.seat, orderedBySize));

  const assignedMembers = new Set<string>();
  const presavedAssignment = new Map<string, PresavedAssignment>();
  Index.i += 1;
  console.log("Text: ", Index.i)
  /*
  Also zuerst nach seltenheit der sitze im verhältnis zur anzahl der member mit der quali gehen
  Die Sitze nacheinander besetzen (vormerken wer wo sitzt)
  Volle Fahrzeuge abspeichern -> Member entfernen die platziert wurden
  wenn das nicht funktioniert nach fahrzeug und seltenheit sortieren
  */
  if (Index.i < 4) {
    for (const {vehicle, seat} of orderedSeats) {
      if (signal?.aborted) {
        return assignedVehicles.map((vehicle)=>vehicle.id)
      }
      let assignedMember : MemberWithQualifications | undefined;
      const requiredTrainings = getRequiredTrainings(seat);
      if (requiredTrainings.length > 0) {
        const candidateGroups = orderedBySize.filter(({ training })=> requiredTrainings.includes(training));
        for (const group of candidateGroups) {
          assignedMember = [...group.members].find((member)=>
            !assignedMembers.has(member.id) &&
            !presavedAssignment.has(member.id) && 
            verifymemberQualificationsForSeat(member, vehicle.opta, seat));
          if (assignedMember) {
            break;
          }
        }
      } else {
        assignedMember = [...availableOthers].find((member)=>
          !assignedMembers.has(member.id) &&
          !presavedAssignment.has(member.id) &&
          verifymemberQualificationsForSeat(member, vehicle.opta, seat));
        if (!assignedMember) {
          assignedMember = availableMembers.find((member)=>
          !assignedMembers.has(member.id) &&
          !presavedAssignment.has(member.id) &&
          verifymemberQualificationsForSeat(member, vehicle.opta, seat));
        }
      }
      if (assignedMember) {
        presavedAssignment.set(assignedMember.id, {
          vehicleId : vehicle.id,
          seatId : seat.id
        });
      }
      checkForFullVehicles : for (const vehicle of vehiclesWithSeats) {
        const currentVehicleAssignment : SeatAssignments = {};
        for (const seat of vehicle.seats) {
          const memberId = [...presavedAssignment.entries()]
            .find(([_, assignment]) =>
              assignment.vehicleId === vehicle.id &&
              assignment.seatId === seat.id
            )?.[0];

          if (!memberId) {
            continue checkForFullVehicles;
          }

          currentVehicleAssignment[seat.id] = memberId;
        }
        for (const memberId of Object.values(currentVehicleAssignment)) {
          if (!memberId) continue;

          const member = availableMembers.find(
            (member) => member.id === memberId
          );

          if (member) {
            removeMemberFromSets(member, orderedBySize);
            removeMemberFromSets(member, [{members : availableOthers}]);
            assignedMembers.add(memberId);
          }
        }
        assignedVehicles.push(vehicle);
        for (const seat of Object.keys(currentVehicleAssignment)) {
          einteilung[seat] = currentVehicleAssignment[seat];
        }
      }
    }
  } else {
    Index.i = 0;
    const vehicle = vehiclesWithSeats[0];
    const weigthedSeats = vehicle.seats
      .map((seat) => ({vehicle, seat}))
      .sort((a, b) => getRarity(a.seat, orderedBySize) - getRarity(b.seat, orderedBySize));
    for (const {vehicle, seat} of weigthedSeats) {
      if (signal?.aborted) {
        return assignedVehicles.map((vehicle)=>vehicle.id)
      }
      let assignedMember : MemberWithQualifications | undefined;
      const requiredTrainings = getRequiredTrainings(seat);
      if (requiredTrainings.length > 0) {
        const candidateGroups = orderedBySize.filter(({ training })=> requiredTrainings.includes(training));
        for (const group of candidateGroups) {
          assignedMember = [...group.members].find((member)=>
            !assignedMembers.has(member.id) &&
            !presavedAssignment.has(member.id) && 
            verifymemberQualificationsForSeat(member, vehicle.opta, seat));
          if (assignedMember) {
            break;
          }
        }
      } else {
        assignedMember = [...availableOthers].find((member)=>
          !assignedMembers.has(member.id) &&
          !presavedAssignment.has(member.id) &&
          verifymemberQualificationsForSeat(member, vehicle.opta, seat));
        if (!assignedMember) {
          assignedMember = availableMembers.find((member)=>
          !assignedMembers.has(member.id) &&
          !presavedAssignment.has(member.id) &&
          verifymemberQualificationsForSeat(member, vehicle.opta, seat));
        }
      }
      if (assignedMember) {
        presavedAssignment.set(assignedMember.id, {
          vehicleId : vehicle.id,
          seatId : seat.id
        });
      }
      checkForFullVehicles : for (const vehicle of vehiclesWithSeats) {
        const currentVehicleAssignment : SeatAssignments = {};
        for (const seat of vehicle.seats) {
          const memberId = [...presavedAssignment.entries()]
            .find(([_, assignment]) =>
              assignment.vehicleId === vehicle.id &&
              assignment.seatId === seat.id
            )?.[0];

          if (!memberId) {
            continue checkForFullVehicles;
          }

          currentVehicleAssignment[seat.id] = memberId;
        }
        for (const memberId of Object.values(currentVehicleAssignment)) {
          if (!memberId) continue;

          const member = availableMembers.find(
            (member) => member.id === memberId
          );

          if (member) {
            removeMemberFromSets(member, orderedBySize);
            removeMemberFromSets(member, [{members : availableOthers}]);
            assignedMembers.add(memberId);
          }
        }
        assignedVehicles.push(vehicle);
        for (const seat of Object.keys(currentVehicleAssignment)) {
          einteilung[seat] = currentVehicleAssignment[seat];
        }
      }
    }
  }
  if (signal?.aborted) {
    return;
  }

  await assignMembersToSeats(einteilung, assignedVehicles.map(v => v.id));
  return;
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

function getRarity(
  currentSeat: seat,
  orderedBySize: { training: trainings_ref; members: Set<MemberWithQualifications> }[],
) {
  const requiredTrainings = getRequiredTrainings(currentSeat);
  const matchingGroups = orderedBySize.filter(({ training }) => requiredTrainings.includes(training));
  return matchingGroups.length > 0
    ? Math.min(...matchingGroups.map(({ members }) => members.size))
    : Number.MAX_SAFE_INTEGER;
}

function removeMemberFromSets(
  member: MemberWithQualifications,
  groups: { members: Set<MemberWithQualifications> }[],
) {
  for (const group of groups) {
    group.members.delete(member);
  }
}