"use server"
import {
  getVehiclesWithSeats,
  confirmVehicleInstruction,
  getAvailableMemberWithQualifications,
  assignMembersToSeats,
} from "../db/queries";
import { Alarm } from "../divera/alarm";
import { verifymemberQualificationsForSeat } from "./rules";

type SeatAssignments = Record<string, string | null>;


export async function verteileEinsatzkraefte(alarm: Alarm )
{
  console.log("Verteile Einsatzkräfte für Alarm:", alarm);
  const availableMembers = await getAvailableMemberWithQualifications();
  const einteilung: SeatAssignments = {};

  const vehiclesWithSeats = await getVehiclesWithSeats(alarm.vehicles ?? []);

  for (const vehicle of vehiclesWithSeats) 
  {
    if (!vehicle.opta) 
    {
      continue;
    }

    for (const seat of vehicle.seats) 
    {
      if (availableMembers.length === 0) 
        {
          return; // No more available members to assign
        }

      let assigned = false;
      let i = 0;
      while (!assigned) 
      {

        const member = availableMembers[i];

        if (!member) 
        {
          break // No more fitting member for this seat
        }

        if (!await verifymemberQualificationsForSeat(member, vehicle, seat)) 
        {
          i++;
          continue;
        }

        assigned = true;
        availableMembers.splice(i, 1); // Remove the assigned member from the list
        
        einteilung[`${seat.id}`] = `${member.id}`;
      }
    }
  }
  console.log("Einteilung:", einteilung);
  await assignMembersToSeats(einteilung);
  return;
}