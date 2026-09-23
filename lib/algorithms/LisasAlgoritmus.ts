"use server";
import { trainings_ref } from "@prisma/client";
import {
  getVehiclesWithSeats,
  getAvailableMemberWithQualifications,
  assignMembersToSeats,
  MemberWithQualifications,
  seat,
} from "../db/queries";
import { verifymemberQualificationsForSeat } from "./rules";

type SeatAssignments = Record<string, string | null>;

const einteilung: SeatAssignments = {};

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
export async function assignMembersToVehicles(
  vehicles: string[],
  signal?: AbortSignal,
) {
  if (signal?.aborted) {
    return [];
  }
  const availableMembers: MemberWithQualifications[] =
    await getAvailableMemberWithQualifications();
  const ZF = makeSet(["ZF"], availableMembers);
  const MA = makeSet(["MA"], availableMembers);
  const AGT = makeSet(["AGT"], availableMembers);
  const GF = makeSet(["GF"], availableMembers);
  const MAohneGF = MA.difference(GF);
  const TF = makeSet(["TF"], availableMembers);

  const vehiclesWithSeats = await getVehiclesWithSeats(vehicles ?? []);
  const assignedVehicles: typeof vehiclesWithSeats = [];
  const seatsInAssignmentOrder:seat[] = [];

  //   1. ELW Zugführer -> direkt anzeigen ✅ -> wenn kein zweiter GF kommt, muss erster ZF GF werden
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-46-56")
      ?.seats.find((seat) => seat.seat === "GF"),
  );
  //     2. Maschi für alle ausser ELW -> bevorzugt ohne Gruppenführer
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta != "09-19-56")
      ?.seats.find((seat) => seat.seat === "MA"),
  );
  //     3. Gruppenführer für HLF und KatS -> ✅
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-46-56")
      ?.seats.find((seat) => seat.seat === "GF"),
  );
      seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "80-44-01")
      ?.seats.find((seat) => seat.seat === "GF"),
  );
  //     4. AGTs mit TF für HLF und KatS
seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-46-56")
      ?.seats.find((seat) => seat.seat === "ATF"),
  );
      seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "80-44-01")
      ?.seats.find((seat) => seat.seat === "ATF"),
  );
  //     6. HLF voll ✅
        seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-46-56")
      ?.seats.find((seat) => !seatsInAssignmentOrder.includes(seat)),
  );
  //     7. TF, bevorzugt auch Maschi für WLF ✅
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-65-56")
      ?.seats.find((seat) => seat.seat === "GF"),
  );
  //     8. Funker und Maschinist auf ELW -> am besten ohne AGT, aber vielleicht mit TF => Funker ist kein trainingsref ✅
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-19-56")
      ?.seats.find((seat) => seat.seat === "ATF"),
  );
  //     9. Maschinist auf GW-L
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-64-56")
      ?.seats.find((seat) => seat.seat === "GF"),
  );
  //     9. KatS voll -> wenn keine AGTS mehr, wird WTF zu ATM ✅ (wenn voll)
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "80-44-01")
      ?.seats.find((seat) => !seatsInAssignmentOrder.includes(seat)),
  );
  //     10. Restlich AGT auf GW-L
  seatsInAssignmentOrder.push(
    vehiclesWithSeats
      .find((vehicle) => vehicle.opta === "09-46-56")
      ?.seats.find((seat) => !seatsInAssignmentOrder.includes(seat)),
  );
  //     11. Restliche PLätze nach Ankunftszeit besetzen
  
  vehiclesWithSeats.forEach((vehicle) => {
  vehicle.seats.forEach((seat) => {
    if (!seatsInAssignmentOrder.includes(seat)) {
      seatsInAssignmentOrder.push(seat);
    }
  });
});

  assignmentLoop: for (const vehicle of vehiclesWithSeats) {
    findAndSetMember(availableMembers, vehicle.seats[0], vehicle.opta);
  }
  //getAssignment( einzuteilemde Fahrzeuge ohne leere fahrzeuge)
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
  opta,
) {
  if (members.length === 0) {
    //vehicleAssigned = false;
    return;
  }

  let assigned = false;
  let i = 0;
  while (!assigned) {
    const member = members[i];

    if (!member) {
      console.log("No Memeber found for ", seat.seat);
      //vehicleAssigned = false;
      return;
    }

    if (!verifymemberQualificationsForSeat(member, opta, seat)) {
      i++;
      continue;
    }

    assigned = true;
    console.log(`Assigning member %d to seat`, i, seat.seat);
    members.splice(i, 1); // Remove the assigned member from the list

    einteilung[`${seat.id}`] = `${member.id}`;
  }
}
