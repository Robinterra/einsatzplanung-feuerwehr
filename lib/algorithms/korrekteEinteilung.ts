"use server"
import { getAvailableMembers, getVehiclesWithSeats, getMemberQualifications, confirmVehicleInstruction } from "../db/queries";
import { Alarm } from "../divera/alarm";

type SeatAssignments = Record<string, string | null>;
type Einteilung = Record<string, SeatAssignments>;

export async function verteileEinsatzkraefte(alarm: Alarm ): Promise<Einteilung> {
  const availableMembers = [...(await getAvailableMembers())];
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

        const qualifications = await getMemberQualifications(member.id);

        if (seat.leadership === "TF" && !qualifications.some(q => q.key === "TF")) {
          i++;
          continue;
        }
        if (seat.leadership === "GF" && !qualifications.some(q => q.key === "GF1") && !qualifications.some(q => q.key === "GF2")) {
          i++;
          continue;
        }
        if (seat.leadership === "ZF" && !qualifications.some(q => q.key === "ZF1") && !qualifications.some(q => q.key === "ZF2")) {
          i++;
          continue;
        }
        if (seat.agt && !qualifications.some(q => q.key === "AGT")) {
          i++;
          continue;
        }
        if (seat.seat === "MA" && !qualifications.some(q => q.key === "MA")) {
          if (!await confirmVehicleInstruction(member.id, vehicle.opta)) {
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