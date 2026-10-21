/* Idee: Nimm denn am längsten anwesenden Member und gib ihm den sitz mit der niedrigsten Differenz zu seinen Qualifikationen
Berechnunge: Qualifikationen nicht erfüllt: -1, bzw -1 wenn nocht vertretbar, -2 wenn nicht ok
ein wert für führung: TM 0. TF 1, GF 3, ZF 5
ein wert für maschi: kein FS -1, ELW 1, GW-L 2, LkW 3, LKW und Kran 4
ein wert für AGT: kein AGT -1,  AGT 1, AGT und TF 2


BSP: Member mit Qualifikationen: TF, AGT, Maschi für GW-L
Sitze: 

reihnfolge der seats übernehmen, member nach ankunftszeit auf den ersten seat, der passt
 */

//
"use server";
import { trainings_ref } from "@prisma/client";
import {
  getVehiclesWithSeats,
  getAvailableMemberWithQualifications,
  assignMembersToSeats,
  MemberWithQualifications,
  getMemberInformation,
  seat,
  vehicleWithSeats,
  getAssignedSeatIds,
} from "../db/queries";
import {
  verifymemberQualificationsForSeat,
  verifyMemberIsMissonReady,
} from "./rules";
import { saveAssignment } from "./saveAssignment";
import path from "path";
import { readFile } from "fs/promises";

export type SeatAssignments = Record<string, string | null>;

const einteilung: SeatAssignments = {};

export async function assignMembersToVehicles(
  vehicles: string[],
  signal?: AbortSignal,
): Promise<boolean> {
  if (signal?.aborted) {
    return true;
  }
  const availableMembers: MemberWithQualifications[] =
    await getAvailableMemberWithQualifications();
  availableMembers.filter((member) => {
    return verifyMemberIsMissonReady(member);
  });
  //sort nach ankunftszeit
  availableMembers.sort((a, b) => {
    const aArrival = a.presence_timestamp
      ? new Date(a.presence_timestamp).getTime()
      : 0;
    const bArrival = b.presence_timestamp
      ? new Date(b.presence_timestamp).getTime()
      : 0;
    return aArrival - bArrival;
  });
  console.log("members:", availableMembers.length);
  const vehiclesWithSeats = await getVehiclesWithSeats(vehicles ?? []);
  const seatsInAssignmentOrder = await orderSeats(vehiclesWithSeats);

  const assignedSeats = (await getAssignedSeatIds()).map((s) => s.seat_id);
  let assignmetFinished = true;
  let i = 0;

  const remainingSeats = deleteAlreadyAssignedSeats(seatsInAssignmentOrder, assignedSeats);
  for (const member of availableMembers) {
    if (availableMembers.length === 0) {
      break;
    }
    for (const seatId of remainingSeats) {
      assignmetFinished = false;

      const vehicle = vehiclesWithSeats.find((vehicle) =>
        vehicle.seats.some((seat) => seat.id === seatId),
      );
      if (!vehicle) {
        continue;
      }
      const seat = vehicle.seats.find((seat) => seat.id === seatId);
      if (verifymemberQualificationsForSeat(member, vehicle.opta, seat)) {
        einteilung[`${seat.id}`] = `${member.id}`;
        availableMembers.splice(availableMembers.indexOf(member), 1);
        break; // Move to the next member after assigning a seat
      }
    }
  }

  
  const modifiedAssignment = await modifyAssignment(
    einteilung,
    vehiclesWithSeats,
  );
  saveAssignment(modifiedAssignment, vehiclesWithSeats);
  return assignmetFinished;
}
function deleteAlreadyAssignedSeats(
  seatsInAssignmentOrder: string[],
  assignedSeats: string[],){
    let i=0;
     for (const seatId of seatsInAssignmentOrder) {
    //remove already assigned seats from the assignment order
    if (assignedSeats.includes(seatId)) {
      console.log("Seat is already assigned.");
      seatsInAssignmentOrder.splice(i, 1);
    }
    i++;
  }
  return seatsInAssignmentOrder;
  }

async function modifyAssignment(
  einteilung: SeatAssignments,
  vehiclesWithSeats: vehicleWithSeats[],
): Promise<SeatAssignments> {
  function moveMember(
    fromSeat: { seat: seat["seat"]; opta: string },
    toSeat: { seat: seat["seat"]; opta: string },
  ) {
    console.log("try to move");
    const fromSeatId = vehiclesWithSeats
      .find((vehicle) => vehicle.opta === fromSeat.opta)
      ?.seats.find((seat) => seat.seat === fromSeat.seat)?.id;
    const toSeatId = vehiclesWithSeats
      .find((vehicle) => vehicle.opta === toSeat.opta)
      ?.seats.find((seat) => seat.seat === toSeat.seat)?.id;

    if (!einteilung[toSeatId] && einteilung[fromSeatId]) {
      console.log("moving member from %s to %s", fromSeat.seat, toSeat.seat);
      einteilung[toSeatId] = einteilung[fromSeatId];
    }
  }
  //if ATM HLF leer, setzte ATF KatS, if WTM HLF leer, setzte WTF KatS
  console.log("moving AGTs");

  moveMember(
    { seat: "WTF", opta: "80-44-01" }, //find ATM für HLF
    { seat: "ATM", opta: "09-46-56" },
  );
  moveMember(
    { seat: "ATF", opta: "80-44-01" },
    { seat: "ATM", opta: "09-46-56" },
  );
  moveMember(
    { seat: "WTF", opta: "09-46-56" },
    { seat: "ATM", opta: "09-46-56" },
  );
  moveMember(
    { seat: "WTF", opta: "80-44-01" }, //find WTM für HLF
    { seat: "WTM", opta: "09-46-56" },
  );
  moveMember(
    { seat: "ATF", opta: "80-44-01" },
    { seat: "WTM", opta: "09-46-56" },
  );

  const requiredHLFSeats = ["MA", "ATF", "ATM", "WTF", "WTM"];
  const HLFisStaffel = requiredHLFSeats.every((seatName) => {
    const seat = vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-46-56")
      ?.seats.find((seat) => seat.seat === seatName);

    return seat !== undefined && einteilung[seat.id] != null;
  });

  if (HLFisStaffel) {
    console.log("ZF wird GF");
    moveMember(
      { seat: "GF", opta: "09-19-56" },
      { seat: "GF", opta: "09-46-56" },
    );
  }

  const GF1 =
    einteilung[
      vehiclesWithSeats
        .find((vehicle) => vehicle.opta === "09-46-56")
        ?.seats.find((seat) => seat.seat === "GF")?.id
    ];
  const GF1withInfo = await getMemberInformation(GF1 ?? "");
  const GF1isZF = GF1withInfo?.trainings.includes("ZF");
  const GF2Id = vehiclesWithSeats
    .find((vehicle) => vehicle.opta === "80-44-01")
    ?.seats.find((seat) => seat.seat === "GF")?.id;
  const GF2exsits = einteilung[GF2Id] != null;

  if (GF1isZF && GF2exsits) {
    console.log("moving GF cascade");
    moveMember(
      { seat: "GF", opta: "09-46-56" },
      { seat: "GF", opta: "09-19-56" },
    );
    moveMember(
      { seat: "GF", opta: "80-44-01" },
      { seat: "GF", opta: "09-46-56" },
    );
    moveMember(
      { seat: "GF", opta: "09-64-56" },
      { seat: "GF", opta: "80-44-01" },
    );
  }
  return einteilung;
}

async function orderSeats(
  vehiclesWithSeats: vehicleWithSeats[],
): Promise<string[]> {
  const seatsInAssignmentOrder: string[] = [];

  function findAndPushSeat(opta: string, seatName: seat["seat"]) {
    const seatId = vehiclesWithSeats
      .find((vehicle) => vehicle.opta === opta)
      ?.seats.find((seat) => seat.seat === seatName)?.id;
    if (seatId && !seatsInAssignmentOrder.includes(seatId)) {
      seatsInAssignmentOrder.push(seatId);
    }
  }

  const filePath = path.join(process.cwd(), "public", "seatOrder.csv");
  const fileContent = await readFile(filePath, "utf-8");

  for (const line of fileContent.split(/\r?\n/)) {
    const [opta, seatName] = line.split(";").map((value) => value.trim());
    if (opta && seatName) {
      findAndPushSeat(opta, seatName as seat["seat"]);
    }
  }

  vehiclesWithSeats.forEach((vehicle) => {
    vehicle.seats.forEach((seat) => {
      if (!seatsInAssignmentOrder.includes(seat.id)) {
        seatsInAssignmentOrder.push(seat.id);
      }
    });
  });
  return seatsInAssignmentOrder;
}
