"use server"
import { getAvailableMembers, getVehiclesWithSeats } from "@/lib/db/queries";
import { Alarm } from "@/lib/divera/alarm";

type SeatAssignments = Record<string, string | null>;
type Einteilung = Record<string, SeatAssignments>;

export async function verteileEinsatzkraefte(alarm: Alarm | Alarm[]): Promise<Einteilung> {
  const alarms = Array.isArray(alarm) ? alarm : [alarm];
  const availableMembers = [...(await getAvailableMembers())].reverse();
  const einteilung: Einteilung = {};

  for (const currentAlarm of alarms) {
    const vehiclesWithSeats = await getVehiclesWithSeats(currentAlarm.vehicles ?? []);

    for (const vehicle of vehiclesWithSeats) {
      if (!vehicle.opta) {
        continue;
      }

      if (!einteilung[vehicle.opta]) {
        einteilung[vehicle.opta] = {};
      }

      for (const seat of vehicle.seats) {
        const member = availableMembers.pop();
        einteilung[vehicle.opta][seat] = member ? `${member.last_name}, ${member.first_name}` : null;
      }
    }
  }

  return einteilung;
}
