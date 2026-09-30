"use server"
import {
  getVehiclesWithSeats,
  getAvailableMemberWithQualifications,
  assignMembersToSeats,
} from "../db/queries";
import { verifymemberQualificationsForSeat } from "./rules";

type SeatAssignments = Record<string, string | null>;

function doesGF(availableMembers: any[], vehiclesWithSeats: any[], einteilung: SeatAssignments, signal?: AbortSignal)
{
  if (signal?.aborted) {
    return [];
  }

  const allfSeats = vehiclesWithSeats.flatMap((vehicle) => 
  vehicle.seats
      .filter((seat) => seat.seat === "GF")
      .map((seat) => ({
        ...seat,
        opta: vehicle.opta
      }))
  );

  const zfSeat = allfSeats.filter((seat) => seat.leadership === "ZF")[0] || null;
  if (zfSeat) {
    for (const member of availableMembers)
    {
      if (!verifymemberQualificationsForSeat(member, zfSeat.opta, zfSeat))
        continue;

      einteilung[`${zfSeat.id}`] = `${member.id}`;
      console.log(`ZF: Assigning member ${member.id} to seat ${zfSeat.id}`);
      break;
    }
  }

  const gfSeats = allfSeats.filter((seat) => seat.leadership === "GF");
  for (const gfSeat of gfSeats) {
    for (const member of availableMembers)
    {
      if (!verifymemberQualificationsForSeat(member, gfSeat.opta, gfSeat))
        continue;

      einteilung[`${gfSeat.id}`] = `${member.id}`;
      console.log(`GF: Assigning member ${member.id} to seat ${gfSeat.id}`);
      break;
    }
  }

  const tfSeats = allfSeats.filter((seat) => seat.leadership === "TF");
  for (const tfSeat of tfSeats) {
    for (const member of availableMembers)
    {
      if (!verifymemberQualificationsForSeat(member, tfSeat.opta, tfSeat))
        continue;

      einteilung[`${tfSeat.id}`] = `${member.id}`;
      console.log(`TF: Assigning member ${member.id} to seat ${tfSeat.id}`);
      break;
    }
  }
}

function doesMaschinist(availableMembers: any[], vehiclesWithSeats: any[], einteilung: SeatAssignments, signal?: AbortSignal)
{
  if (signal?.aborted) {
    return [];
  }

  const maschinistSeats = vehiclesWithSeats.flatMap((vehicle) => 
    vehicle.seats
      .filter((seat) => seat.seat === "MA")
      .map((seat) => ({
        ...seat,
        opta: vehicle.opta
      }))
  );

  for (const maschinistSeat of maschinistSeats) {
    for (const member of availableMembers)
    {
      if (!verifymemberQualificationsForSeat(member, maschinistSeat.opta, maschinistSeat))
        continue;

      einteilung[`${maschinistSeat.id}`] = `${member.id}`;
      console.log(`MA: Assigning member ${member.id} to seat ${maschinistSeat.id}`);
      break;
    }
  }
}

function tryGesamtZuteilung(vehiclesWithSeats: any[], availableMembers: any[], einteilung: SeatAssignments, signal?: AbortSignal)
{
  if (signal?.aborted) {
    return [];
  }

  doesGF(availableMembers, vehiclesWithSeats, einteilung, signal);
  doesMaschinist(availableMembers, vehiclesWithSeats, einteilung, signal);
}

//verteile Einsatzkraefte, return true wenn alle Plätze besetzt sind, bzw wenn alle Fahrzeuge ausgerückt sind
export async function assignMembersToVehicles(vehicles: string[], signal?: AbortSignal){
  if (signal?.aborted) {
    return [];
  }
  const availableMembers = shuffle(await getAvailableMemberWithQualifications());
  console.log("members:", availableMembers.length);
  const einteilung: SeatAssignments = {};

  const vehiclesWithSeats = await getVehiclesWithSeats(vehicles ?? []);
  const assignedVehicles: typeof vehiclesWithSeats = [];

  tryGesamtZuteilung(vehiclesWithSeats, availableMembers, einteilung, signal);

  /*assignmentLoop: for (const vehicle of vehiclesWithSeats) 
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

        if (!verifymemberQualificationsForSeat(member, vehicle.opta, seat)) 
        {
          i++;
          continue;
        }

        assigned = true;
        console.log(`Assigning member %d to seat`, i, seat.seat);
        availableMembers.splice(i, 1); // Remove the assigned member from the list
        
        einteilung[`${seat.id}`] = `${member.id}`;
      }
    }
    if (vehicleAssigned){assignedVehicles.push(vehicle)};
  }
  if (signal?.aborted) {
    return;
  }

  await assignMembersToSeats(einteilung, assignedVehicles.map(v => v.id));*/
  return;
}


function shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

