"use server"
import {
  getVehiclesWithSeats,
  confirmVehicleInstruction,
  getAvailableMemberWithQualifications,
  assignMembersToSeats,
  getPresentMemberAssignments,
} from "../db/queries";
import { Alarm } from "../divera/alarm";
import { verifymemberQualificationsForSeat } from "./rules";

type SeatAssignments = Record<string, string | null>;

//verteile Einsatzkraefte, return true wenn alle Plätze besetzt sind, bzw wenn alle Fahrzeuge ausgerückt sind
export async function assignMembersToVehicles(alarm: Alarm, signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) {
    return false;
  }

  console.log("Verteile Einsatzkräfte für Alarm:", alarm);
  const availableMembers = await getAvailableMemberWithQualifications();
  const einteilung: SeatAssignments = {};

  const vehiclesWithSeats = await getVehiclesWithSeats(alarm.vehicles ?? []);
  const currentAssignments = await getPresentMemberAssignments(alarm.vehicles ?? []);

  assignmentLoop: for (const vehicle of vehiclesWithSeats) 
  {
    if (signal?.aborted) {
      return false;
    }

    if (!vehicle.opta) 
    {
      continue;
    }

    for (const seat of vehicle.seats) 
    {
      if (currentAssignments[vehicle.opta]?.[seat.seat]) {
        continue;
      }

      if (availableMembers.length === 0) 
        {
          break assignmentLoop;
        }

      let assigned = false;
      let i = 0;
      while (!assigned) 
      {

        const member = availableMembers[i];

        if (!member) 
        {
          break assignmentLoop;
        }

        if (!verifymemberQualificationsForSeat(member, vehicle, seat)) 
        {
          i++;
          continue;
        }

        assigned = true;
        console.log(`Assigning memberto seat`);
        availableMembers.splice(i, 1); // Remove the assigned member from the list
        
        einteilung[`${seat.id}`] = `${member.id}`;
      }
    }
  }
  if (signal?.aborted) {
    return false;
  }

  console.log("Einteilung:", einteilung);
  await assignMembersToSeats(einteilung);

  const updatedAssignments = await getPresentMemberAssignments(alarm.vehicles ?? []);
  return vehiclesWithSeats.every((vehicle) =>
    vehicle.seats.length > 0
    && vehicle.seats.every((seat) => Boolean(updatedAssignments[vehicle.opta]?.[seat.seat])),
  );
}