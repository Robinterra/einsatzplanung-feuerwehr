"use server";

import { trainings_ref } from "@prisma/client";
import {
  getVehiclesWithSeats,
  getAvailableMemberWithQualifications,
  assignMembersToSeats,
} from "../db/queries";
import { hasAGTQualification } from "./rules";
import { MemberWithQualifications, vehicleWithSeats, seat } from "../db/queries";
import { verifymemberQualificationsForSeat } from "./rules";

type SeatAssignments = Record<string, string | null>;

export async function assignMembersToVehicles(vehicles: string[], signal?: AbortSignal) {
  if (signal?.aborted) {
    return true;
  }
  const vehiclesWithSeats = await getVehiclesWithSeats(vehicles ?? []);
  const availableMembers : MemberWithQualifications[] = await getAvailableMemberWithQualifications();
  const assignedMembers : MemberWithQualifications[] = [];
  
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
  
    console.log("ZF:",availableZF.size);
    console.log("GF:",availableGF.size);
    console.log("TF:",availableTF.size);
    console.log("MA:",availableMA.size);
    console.log("AGT:",availableAGT.size);
  //*/

  
  let assignmentFinished = true;

  for (const vehicle of vehiclesWithSeats) {
    let einteilung : SeatAssignments = {};
    const weigthedSeats = vehicle.seats
      .map((seat) => ({vehicle, seat}))
      .sort((a, b) => getRarity(a.seat, orderedBySize) - getRarity(b.seat, orderedBySize));
    for (const {vehicle, seat} of weigthedSeats) {
      if (signal?.aborted) {
        return true;
      }
      let assignedMember : MemberWithQualifications | undefined = undefined;
      const requiredTrainings = getRequiredTrainings(seat);
      if (requiredTrainings.length > 0) {
        const candidateGroups = orderedBySize.filter(({ training })=> requiredTrainings.includes(training));
        for (const group of candidateGroups) {
          assignedMember = [...group.members].find((member)=>
            assignedMembers.every((assigned) => assigned.id !== member.id) &&
            verifymemberQualificationsForSeat(member, vehicle.opta, seat));
          if (assignedMember) {
            break;
          }
        }
      } else {
        assignedMember = [...availableOthers].find((member)=>
          assignedMembers.every((assigned) => assigned.id !== member.id) &&
          verifymemberQualificationsForSeat(member, vehicle.opta, seat));
        if (!assignedMember) {
          assignedMember = availableMembers.find((member)=>
          assignedMembers.every((assigned) => assigned.id !== member.id) &&
          verifymemberQualificationsForSeat(member, vehicle.opta, seat));
        }
      }
      if (assignedMember) {
        einteilung[seat.id] = assignedMember.id;
        assignedMembers.push(assignedMember);
      }
    }
    let vehicleAssigned = true;
    for (const seat of vehicle.seats) {
      if (!einteilung[seat.id]) {
        assignmentFinished = false;
        vehicleAssigned = false;
        break;
      }
    }
    if (vehicleAssigned) {
      console.log(einteilung);
      await assignMembersToSeats(einteilung, [vehicle.id]);
      for (const memberId of Object.values(einteilung)) {
        const member = availableMembers.find((member) => member.id === memberId);
        if (member) {
          removeMemberFromSets(member, orderedBySize);
        }
      }
    }
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