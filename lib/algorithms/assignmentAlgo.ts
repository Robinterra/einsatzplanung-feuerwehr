"use server";

import { trainings_ref } from "@prisma/client";
import {
  getVehiclesWithSeats,
  getAvailableMemberWithQualifications,
  assignMembersToSeats,
} from "../db/queries";
import { hasAGTQualification } from "./rules";
import { verifymemberQualificationsForSeat } from "./rules";

type SeatAssignments = Record<string, string | null>;


export async function assignMembersToVehicles(vehicles: string[], signal?: AbortSignal) {
  if (signal?.aborted) {
    return;
  }
  const availableMembers = await getAvailableMemberWithQualifications();
  const einteilung: SeatAssignments = {};
  const vehiclesWithSeats = await getVehiclesWithSeats(vehicles ?? []);
  const assignedVehicles: typeof vehiclesWithSeats = [];
  const trainings : trainings_ref[] = ["MA", "TM", "TF", "GF", "ZF", "AGT"];
  let rarestTraining: {ref: trainings_ref; count: number; members : typeof availableMembers} [] = [];

  for (const ref of trainings) {
    if (signal?.aborted) {
      return;
    }
    let memberWithQualification : typeof availableMembers = [];
    let count = 0;
    for (const member of availableMembers) {
      if (signal?.aborted) {
        return;
      }
      if (ref === "AGT") {
        if (hasAGTQualification(member.members.member_trainings_view.map(t => t.training.ref))) {
          count++;
          memberWithQualification.push(member);
        }
        /*if (member.members.member_trainings_view.some(training => training.training.ref === ref)) {
          count++;
          memberWithQualification.push(member);
        }*/
      } else {
        if (member.members.member_trainings_view.some(training => training.training.ref === ref)) {
          count++;
          memberWithQualification.push(member);
        }
      }
    }
    rarestTraining.push({ref, count, members : memberWithQualification});
  }
  rarestTraining.sort((a, b) => a.count - b.count);

  console.log("rarestTraining:", rarestTraining);
  let assigned = false;

  assignmnetLoop : while (!assigned) {
    if (signal?.aborted) {
      return assignedVehicles.map((vehicle) => vehicle.id);
    }
    for (const vehicle of vehiclesWithSeats) {
    }
  }
}