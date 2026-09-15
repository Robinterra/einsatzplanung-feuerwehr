"use server"
import { getAvailableMembers, getVehiclesWithSeats, getMemberQualifications, confirmVehicleInstruction, getAvailableMemberWithQualifications } from "../db/queries";
import { Alarm } from "../divera/alarm";

type SeatAssignments = Record<string, string | null>;
type Einteilung = Record<string, SeatAssignments>;

export async function verteileEinsatzkraefte(alarm: Alarm ): Promise<Einteilung> {
  const availableMembers = await getAvailableMemberWithQualifications();
  const einteilung: Einteilung = {};

  const vehiclesWithSeats = await getVehiclesWithSeats(alarm.vehicles ?? []);

  for (const vehicle of vehiclesWithSeats) {
    if (!vehicle.opta) {
      continue;
    }

    if (!einteilung[vehicle.opta]) {
      einteilung[vehicle.opta] = {};
    }

    for (const seat of vehicle.seats) {
      let assigned = false;
      let i = 0;
      while (!assigned) {
        if (availableMembers.length === 0) {
          break;
        }

        const member = availableMembers[i];
        if (!member) {
          break;
        }


        if (seat.leadership === "TF" && !member.members.member_trainings_view.some(training => training.training.key === "TF")) {
          i++;
          continue;
        }
        if (seat.leadership === "GF" && !member.members.member_trainings_view.some(training => training.training.key === "GF1") && !member.members.member_trainings_view.some(training => training.training.key === "GF2")) {
          i++;
          continue;
        }
        if (seat.leadership === "ZF" && !member.members.member_trainings_view.some(training => training.training.key === "ZF1") && !member.members.member_trainings_view.some(training => training.training.key === "ZF2")) {
          i++;
          continue;
        }
        if (seat.agt && !member.members.member_trainings_view.some(training => training.training.key === "AGT")) {
          i++;
          continue;
        }
        if (seat.seat === "MA" && !member.members.member_trainings_view.some(training => training.training.key === "MA")) {
          if (member.members.vehicle_instructions_view.some(instruction => instruction.vehicles.opta === vehicle.opta)) {
            i++;
            continue;
          }
        }

        assigned = true;
        availableMembers.splice(i, 1); // Remove the assigned member from the list
        einteilung[vehicle.opta][seat.seat] = `${member.last_name}, ${member.first_name}`;
      }
    }
  }

  return einteilung;
}