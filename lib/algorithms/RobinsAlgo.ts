"use server"
import {
  getVehiclesWithSeats,
  getAvailableMemberWithQualifications,
  assignMembersToSeats,
} from "../db/queries";
import { verifymemberQualificationsForSeat } from "./rules";

type SeatAssignments = Record<string, string | null>;

class MemberWithMeta
{
    member: any;
    isInUse: boolean;
}

function hasNonEmptyValue(fields: SeatAssignments, key: string): boolean {
  const value = fields[key];
  return Boolean(value);
}

function doesGF(availableMembers: Array<MemberWithMeta>, vehiclesWithSeats: any[], einteilung: SeatAssignments, signal?: AbortSignal)
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
            if (!verifymemberQualificationsForSeat(member.member, zfSeat.opta, zfSeat))
                continue;

            einteilung[`${zfSeat.id}`] = `${member.member.id}`;
            member.isInUse = true;
            console.log(`ZF: Assigning member ${member.member.id} to seat ${zfSeat.id}`);
            break;
        }
    }

    const gfSeats = allfSeats.filter((seat) => seat.leadership === "GF");
    createEinteilungToSeats(gfSeats, availableMembers, einteilung);

    const tfSeats = allfSeats.filter((seat) => seat.leadership === "TF");
    createEinteilungToSeats(tfSeats, availableMembers, einteilung);
}

function doesMaschinist(availableMembers: Array<MemberWithMeta>, vehiclesWithSeats: any[], einteilung: SeatAssignments, signal?: AbortSignal)
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

  createEinteilungToSeats(maschinistSeats, availableMembers, einteilung);
}

function createEinteilungToSeats(seats: any[], availableMembers: Array<MemberWithMeta>, einteilung: SeatAssignments)
{
    for (const seat of seats)
    {
        for (const member of availableMembers)
        {
            if (member.isInUse) continue;
            if (!verifymemberQualificationsForSeat(member.member, seat.opta, seat))
                continue;

            einteilung[`${seat.id}`] = `${member.member.id}`;
            console.log(`${seat.seat}: Assigning member ${member.member.id} to seat ${seat.id}`);
            member.isInUse = true;
            break;
        }
    }
}

function doesAngriffstrupp(availableMembers: Array<MemberWithMeta>, vehiclesWithSeats: any[], einteilung: SeatAssignments, signal?: AbortSignal)
{
    if (signal?.aborted) {
        return [];
    }

    const atfSeats = vehiclesWithSeats.flatMap((vehicle) => 
    vehicle.seats
        .filter((seat) => seat.seat === "ATF")
        .map((seat) => ({
            ...seat,
            opta: vehicle.opta
        }))
    );
    createEinteilungToSeats(atfSeats, availableMembers, einteilung);

    const atmSeats = vehiclesWithSeats.flatMap((vehicle) => 
    vehicle.seats
        .filter((seat) => seat.seat === "ATM")
        .map((seat) => ({
            ...seat,
            opta: vehicle.opta
        }))
    );
    createEinteilungToSeats(atmSeats, availableMembers, einteilung);
}

function doesWassertrupp(availableMembers: Array<MemberWithMeta>, vehiclesWithSeats: any[], einteilung: SeatAssignments, signal?: AbortSignal)
{
    if (signal?.aborted) {
        return [];
    }

    const atfSeats = vehiclesWithSeats.flatMap((vehicle) => 
    vehicle.seats
        .filter((seat) => seat.seat === "WTF")
        .map((seat) => ({
            ...seat,
            opta: vehicle.opta
        }))
    );
    createEinteilungToSeats(atfSeats, availableMembers, einteilung);

    const atmSeats = vehiclesWithSeats.flatMap((vehicle) => 
    vehicle.seats
        .filter((seat) => seat.seat === "WTM")
        .map((seat) => ({
            ...seat,
            opta: vehicle.opta
        }))
    );
    createEinteilungToSeats(atmSeats, availableMembers, einteilung);
}

function doesSchlauchtrupp(availableMembers: Array<MemberWithMeta>, vehiclesWithSeats: any[], einteilung: SeatAssignments, signal?: AbortSignal)
{
    if (signal?.aborted) {
        return [];
    }

    const atfSeats = vehiclesWithSeats.flatMap((vehicle) => 
    vehicle.seats
        .filter((seat) => seat.seat === "STF")
        .map((seat) => ({
            ...seat,
            opta: vehicle.opta
        }))
    );
    createEinteilungToSeats(atfSeats, availableMembers, einteilung);

    const atmSeats = vehiclesWithSeats.flatMap((vehicle) => 
    vehicle.seats
        .filter((seat) => seat.seat === "STM")
        .map((seat) => ({
            ...seat,
            opta: vehicle.opta
        }))
    );
    createEinteilungToSeats(atmSeats, availableMembers, einteilung);
}

function doesMelder(availableMembers: Array<MemberWithMeta>, vehiclesWithSeats: any[], einteilung: SeatAssignments, signal?: AbortSignal)
{
    if (signal?.aborted) {
        return [];
    }

    const atfSeats = vehiclesWithSeats.flatMap((vehicle) => 
    vehicle.seats
        .filter((seat) => seat.seat === "ME")
        .map((seat) => ({
            ...seat,
            opta: vehicle.opta
        }))
    );
    createEinteilungToSeats(atfSeats, availableMembers, einteilung);
}

function tryGesamtZuteilung(vehiclesWithSeats: any[], availableMembers: Array<MemberWithMeta>, einteilung: SeatAssignments, signal?: AbortSignal)
{
    if (signal?.aborted) {
        return [];
    }

    doesGF(availableMembers, vehiclesWithSeats, einteilung, signal);
    doesMaschinist(availableMembers, vehiclesWithSeats, einteilung, signal);
    doesAngriffstrupp(availableMembers, vehiclesWithSeats, einteilung, signal);
    doesWassertrupp(availableMembers, vehiclesWithSeats, einteilung, signal);
    doesSchlauchtrupp(availableMembers, vehiclesWithSeats, einteilung, signal);
    doesMelder(availableMembers, vehiclesWithSeats, einteilung, signal);
}

function canVehicleSended(vehicles: string[], einteilung: SeatAssignments, vehiclesWithSeats: any[], assignedVehic: Array<string>, signal?: AbortSignal): boolean
{
    var assigned: boolean = false;
    for (const vehic of vehicles)
    {
        var fzgFull = true;

        for (const vecWithSeat of vehiclesWithSeats)
        {
            if (vecWithSeat.opta !== fzgFull) continue;

            for (var seat of vecWithSeat.seats)
            {
                if (!hasNonEmptyValue(einteilung, seat.id)) continue;

                fzgFull = false;
            }
        }

        if (fzgFull) assigned = true;
        assignedVehic.push(vehic);
    }

    return assigned;
}

async function applyVehic(vehiclesWithSeats: any[], assigmentVehicles: string[], einteilung: SeatAssignments)
{

    var filteredVehic = vehiclesWithSeats.filter((vec) => assigmentVehicles.includes(vec.opt));

    for (var vehic of filteredVehic)
    {
        await assignMembersToSeats(einteilung, [vehic.id]);
    }
}

//verteile Einsatzkraefte, return true wenn alle Plätze besetzt sind, bzw wenn alle Fahrzeuge ausgerückt sind
export async function assignMembersToVehicles(vehicles: string[], signal?: AbortSignal): Promise<boolean>{
    if (signal?.aborted) {
        return true;
    }
    const availableMembers = shuffle(await getAvailableMemberWithQualifications());

    var allMembers: Array<MemberWithMeta>;
    for (var member of availableMembers)
    {
        var memMeta = new MemberWithMeta();
        memMeta.isInUse = false;
        memMeta.member = member;
        allMembers.push(memMeta);
    }
    console.log("members:", availableMembers.length);
    const einteilung: SeatAssignments = {};

    const vehiclesWithSeats = await getVehiclesWithSeats(vehicles ?? []);
    var assignedVehicles: Array<string>;

    tryGesamtZuteilung(vehiclesWithSeats, allMembers, einteilung, signal);
    var canSended: boolean = canVehicleSended(vehicles, einteilung, vehiclesWithSeats, assignedVehicles, signal);

    await applyVehic(vehiclesWithSeats, assignedVehicles, einteilung);

  return canSended;
}


function shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

