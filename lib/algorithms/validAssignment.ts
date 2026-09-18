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
export async function assignMembersToVehicles(vehicles: string[], signal?: AbortSignal){
  if (signal?.aborted) {
    return [];
  }
  const availableMembers = await getAvailableMemberWithQualifications();
  console.log("members:", availableMembers.length);
  const einteilung: SeatAssignments = {};

  const vehiclesWithSeats = await getVehiclesWithSeats(vehicles ?? []);
  const assignedVehicles: typeof vehiclesWithSeats = [];

  assignmentLoop: for (const vehicle of vehiclesWithSeats) 
  {
    console.log("try vehicle:", vehicle.opta);
    let vehicleAssigned = true;
    if (signal?.aborted) {
      return assignedVehicles.map((vehicle) => vehicle.id);
    }

    if (!vehicle.opta) 
    {
      continue;
    }

    for (const seat of vehicle.seats) 
    {
      console.log("try seat");
      if (availableMembers.length === 0) 
        {
          vehicleAssigned = false;
          break assignmentLoop;
        }

      let assigned = false;
      let i = 0;
      while (!assigned) 
      {
        const member = availableMembers[i];

        if (!member) 
        {
          console.log("No Memeber found for ", seat.seat);
          vehicleAssigned = false;
          break;
        }

        if (!verifymemberQualificationsForSeat(member, vehicle, seat)) 
        {
          i++;
          continue;
        }

        assigned = true;
        console.log(`Assigning member %d to seat`, i);
        availableMembers.splice(i, 1); // Remove the assigned member from the list
        
        einteilung[`${seat.id}`] = `${member.id}`;
      }
    }
    if (vehicleAssigned){assignedVehicles.push(vehicle)};
  }
  if (signal?.aborted) {
    return assignedVehicles.map((vehicle) => vehicle.id);
  }

  await assignMembersToSeats(einteilung, assignedVehicles.map(v => v.id));
  return assignedVehicles.map((vehicle) => vehicle.id);
}