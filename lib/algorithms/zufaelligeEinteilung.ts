"use server"
import { getAvailableMembers, getVehiclesWithSeats } from "@/lib/db/queries";
import { Alarm } from "@/lib/divera/alarm";

type SeatAssignments = Record<string, string | null>;
type Einteilung = Record<string, SeatAssignments>;

export async function verteileEinsatzkraefte(alarm: Alarm): Promise<Einteilung> {
  const availableMembers = [...(await getAvailableMembers())].reverse();
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
      const member = availableMembers.pop();
      einteilung[vehicle.opta][seat.seat] = member ? `${member.last_name}, ${member.first_name}` : null;
    }
  }

  return einteilung;
}
