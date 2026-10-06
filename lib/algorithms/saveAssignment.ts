import { SeatAssignments } from "./LisasAlgoritmus";
import { assignMembersToSeats, vehicleWithSeats, seat } from "../db/queries";
import { ALL } from "dns";

//TODO: später anzeigereihenfolge aus Datei auslesen
function filterSeats(
  einteilung: SeatAssignments,
  vehicles: vehicleWithSeats[],
): SeatAssignments {
  function resetIfNotAllAssigned( //TODO auf belibige anzahl an sitzen erweitern, sowohl eingabe als auch löschen
    assignedSeats: seat["seat"][],
    opta: string,
    resetSeats?: seat["seat"][],
  ): boolean {
    if (resetSeats === undefined) {
      resetSeats = assignedSeats;
    }
    const seats = vehicles.find((vehicles) => vehicles.opta == opta)?.seats??[];
    const assignedSeatIds = assignedSeats.map(
      (s) => seats.find((seat) => (seat.seat == s))?.id,
    );
    const resetSeatIds = resetSeats.map(
      (s) => seats.find((seat) => (seat.seat == s))?.id,
    );
    const SomeNotAssigned = assignedSeatIds.some((sid) => !einteilung[sid]);
    if (SomeNotAssigned) {
      resetSeatIds.forEach((sid) => {
        einteilung[sid] = null;
      });
      console.log("reseted from", opta);
    }
    return SomeNotAssigned;
  }

  const AT: seat["seat"][] = ["ATF", "ATM"];
  const WT: seat["seat"][] = ["WTF", "WTM"];
  const ST: seat["seat"][] = ["STF", "STM"];

  const seatGroups: Record<string, seat["seat"][]> = {
    AT,
    WT,
    ST,

    CREW: [...AT, ...WT, ...ST, "ME"],

    ALL: ["GF", "MA", "ME", ...AT, ...WT, ...ST],
  };

  //if 09-19-56 nicht voll, entferne Crew
  
  resetIfNotAllAssigned(seatGroups.ALL, "09-19-56", seatGroups.CREW);
  //if 09-46-56 Truppweise anzeigen


  let reseted = false;
  Object.values(seatGroups).forEach((seats) => {
    reseted = resetIfNotAllAssigned(seats, "09-46-56") && reseted;
  });

  Object.values(seatGroups).forEach((seats) => {
    reseted = resetIfNotAllAssigned(seats, "80-44-01") && reseted;
  });

  //if 09-65-56 Maschi anzeigen
  resetIfNotAllAssigned(["GF", "MA", "ME"], "09-65-56", ["MA"]);

  //ELW und GWL alles anzeigen, sobald LFs voll
  if (reseted) {
    resetIfNotAllAssigned(seatGroups.ALL, "09-19-56", seatGroups.CREW);
    resetIfNotAllAssigned(seatGroups.ALL, "09-64-56", [...seatGroups.CREW, "MA"]);
  }
  //if 09-67-56 Nur vollständig anzeigen
  resetIfNotAllAssigned(seatGroups.ALL, "09-67-56")
  //
  //TODO
  return einteilung;
}

export async function saveAssignment(
  assignment: SeatAssignments,
  vehicles: vehicleWithSeats[],
) {
  const filteredAssignment = filterSeats(assignment, vehicles);
  await assignMembersToSeats(
    filteredAssignment,
    vehicles.map((v) => v.id),
  );
}
