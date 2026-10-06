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
import { verifymemberQualificationsForSeat,
  verifyMemberIsMissonReady
 } from "./rules";
import { saveAssignment } from "./saveAssignment";

export type SeatAssignments = Record<string, string | null>;

const einteilung: SeatAssignments = {};

export async function assignMembersToVehicles(
  vehicles: string[],
  signal?: AbortSignal,
) {
  if (signal?.aborted) {
    return [];
  }
  const availableMembers: MemberWithQualifications[] =
    await getAvailableMemberWithQualifications();
  availableMembers.filter((member) => {return verifyMemberIsMissonReady(member)});
  console.log("members:", availableMembers.length);
  const vehiclesWithSeats = await getVehiclesWithSeats(vehicles ?? []);
  const assignedVehicles: typeof vehiclesWithSeats = [];
  const seatsInAssignmentOrder = orderSeats(vehiclesWithSeats);

  const assignedSeats = (await getAssignedSeatIds()).map((s) => s.seat_id); //TODO: irgendwas falsch, Member werden geswitcht

  for (const seatId of seatsInAssignmentOrder) {
    if (assignedSeats.includes(seatId)) continue;
    if (availableMembers.length === 0) {
      //vehicleAssigned = false;
      break;
    }
    const vehicle = vehiclesWithSeats.find((vehicle) =>
      vehicle.seats.some((seat) => seat.id === seatId),
    );
    if (!vehicle) {
      continue;
    }
    const seat = vehicle.seats.find((seat) => seat.id === seatId);
    findAndSetMember(availableMembers, seat, vehicle.opta);
  }

  const modifiedAssignment = await modifyAssignment(einteilung, vehiclesWithSeats);
  saveAssignment(modifiedAssignment, vehiclesWithSeats);
  return;
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
  moveMember({ seat: "ATF", opta: "80-44-01" }, { seat: "ATM", opta: "09-46-56" });
  moveMember({ seat: "WTF", opta: "80-44-01" }, { seat: "WTM", opta: "09-46-56" });
  
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

  const GF1 = await getMemberInformation(einteilung[vehiclesWithSeats.find((vehicle) => vehicle.opta === "09-46-56")?.seats.find((seat) => seat.seat === "GF")?.id]);
  const GF1isZF = GF1?.trainings.includes("ZF");
  const GF2Id = vehiclesWithSeats.find((vehicle) => vehicle.opta === "80-44-01")?.seats.find((seat) => seat.seat === "GF")?.id;
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


function makeSet(
  reqQualis: trainings_ref[],
  members: MemberWithQualifications[],
) {
  return new Set(
    members.filter((m) =>
      reqQualis.every((reqQuali) =>
        m.members.member_trainings_view.some(
          (training) => training.training.ref === reqQuali,
        ),
      ),
    ),
  );
}

function findAndSetMember(
  members: MemberWithQualifications[],
  seat: seat,
  opta: string,
) {
  let assigned = false;
  let i = 0;
  while (!assigned) {
    const member = members[i];

    if (!member) {
      console.log("No Memeber found for %s from", seat.seat, opta);
      //vehicleAssigned = false;
      return false;
    }

    if (!verifymemberQualificationsForSeat(member, opta, seat)) {
      i++;
      continue;
    }

    assigned = true;
    console.log(`Assigning member %d to seat %s from`, i, seat.seat, opta);
    members.splice(i, 1); // Remove the assigned member from the list
    einteilung[`${seat.id}`] = `${member.id}`;
  }
}

//TODO: später Reihenfolge aus Datei auslesen
function orderSeats(vehiclesWithSeats: vehicleWithSeats[]): string[] {
  const seatsInAssignmentOrder: string[] = [];
  //   1. ELW Zugführer -> direkt anzeigen ✅ -> wenn kein zweiter GF kommt, muss erster ZF GF werden
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-19-56")
      ?.seats.find((seat) => seat.seat === "GF").id,
  );
  //     2. Maschi für alle ausser ELW -> bevorzugt ohne Gruppenführer
  seatsInAssignmentOrder.push(
    ...vehiclesWithSeats
      .filter((vehicle) => vehicle.opta != "09-19-56")
      .flatMap((vehicle) => vehicle.seats)
      .filter((seat) => seat.seat === "MA")
      .map((seat) => seat.id),
  );
  //     3. Gruppenführer für HLF und KatS -> ✅
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-46-56")
      ?.seats.find((seat) => seat.seat === "GF").id,
  );

  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "80-44-01")
      ?.seats.find((seat) => seat.seat === "GF").id,
  );
  //     4. AGTs mit TF für HLF und KatS
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-46-56")
      ?.seats.find((seat) => seat.seat === "ATF").id,
  );
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-46-56")
      ?.seats.find((seat) => seat.seat === "WTF").id,
  );
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "80-44-01")
      ?.seats.find((seat) => seat.seat === "ATF").id,
  );
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "80-44-01")
      ?.seats.find((seat) => seat.seat === "WTF").id,
  );
  //     6. HLF voll ✅
  seatsInAssignmentOrder.push(
    ...(vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-46-56")
      ?.seats.filter((seat) => !seatsInAssignmentOrder.includes(seat.id))
      ?.map((seat) => seat.id) ?? []),
  );
  //     7. TF, bevorzugt auch Maschi für WLF ✅
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-65-56")
      ?.seats.find((seat) => seat.seat === "GF").id,
  );
  //     9. KatS voll -> wenn keine AGTS mehr, wird WTF zu ATM ✅ (wenn voll)
  seatsInAssignmentOrder.push(
    ...(vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "80-44-01")
      ?.seats.filter((seat) => !seatsInAssignmentOrder.includes(seat.id))
      ?.map((seat) => seat.id) ?? []),
  );
  //     8. Funker und Maschinist auf ELW -> am besten ohne AGT, aber vielleicht mit TF => Funker ist kein trainingsref ✅
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-19-56")
      ?.seats.find((seat) => seat.seat === "MA").id,
  );

  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-19-56")
      ?.seats.find((seat) => seat.seat === "ATF").id,
  );
  // GF auf GW-L
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-64-56")
      ?.seats.find((seat) => seat.seat === "GF").id,
  );
  //     9. Maschinist auf GW-L
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-64-56")
      ?.seats.find((seat) => seat.seat === "MA").id,
  );

  //     10. Restlich AGT auf GW-L
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-64-56")
      ?.seats.find((seat) => !seatsInAssignmentOrder.includes(seat.id)).id,
  );
  //     11. Restliche PLätze nach Ankunftszeit besetzen

  vehiclesWithSeats.forEach((vehicle) => {
    vehicle.seats.forEach((seat) => {
      if (!seatsInAssignmentOrder.includes(seat.id)) {
        seatsInAssignmentOrder.push(seat.id);
      }
    });
  });
  return seatsInAssignmentOrder;
}

/*  const ZF = makeSet(["ZF"], availableMembers);
  const MA = makeSet(["MA"], availableMembers);
  const AGT = makeSet(["AGT"], availableMembers);
  const GF = makeSet(["GF"], availableMembers);
  const MAohneGF = MA.difference(GF);
  const TF = makeSet(["TF"], availableMembers);*/

/*Idee: Sitze nach dringlichkeit bzw Verfügbarkeit der Qualifikationen sortieren und dann den erstbesten member einteilen
Zusätzlich fahrzeuge/sitze in Reihenfolge einteilen: 
B ohne HFS:
    1. ELW Zugführer -> direkt anzeigen ✅ -> wenn kein zweiter GF kommt, muss erster ZF GF werden
    2. Maschi für alle ausser ELW -> bevorzugt ohne Gruppenführer
    3. Gruppenführer für HLF und KatS -> ✅
    4. AGTs mit TF für HLF und KatS
    6. HLF voll ✅
    7. TF, bevorzugt auch Maschi für WLF ✅
    8. Funker und Maschinist auf ELW -> am besten ohne AGT, aber vielleicht mit TF => Funker ist kein trainingsref ✅
    9. Maschinist auf GW-L
    9. KatS voll -> wenn keine AGTS mehr, wird WTF zu ATM ✅ (wenn voll)
    10. Restlich AGT auf GW-L
    11. Restliche PLätze nach Ankunftszeit besetzen

availableMembers in Gruppen unterteilen: => sets
1.Zugführer
2.Gruppenführer
3.Maschinisten
 => Ma ohne GF?
4.AGT
5.TF
6.Funker -> geht nicht


B mit HFS:

TH:

*/
