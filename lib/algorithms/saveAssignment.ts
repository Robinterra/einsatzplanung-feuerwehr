import { SeatAssignments } from "./LisasAlgoritmus";
import { assignMembersToSeats, vehicleWithSeats, seat } from "../db/queries";

//TODO: später anzeigereihenfolge aus Datei auslesen
function filterSeats(
  einteilung: SeatAssignments,
  vehicles: vehicleWithSeats[],
): SeatAssignments {
  function resetIfNotAllAssigned( //
    opta: string,
    assignedSeats: seat["seat"][],  
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
      console.log("reset from", opta);
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

    CREW: [...AT, ...WT, ...ST, "ME", "MA"],

    ALL: ["GF", "MA", "ME", ...AT, ...WT, ...ST],
  };

  //LFs Truppweise anzeigen:
  let LFsNotFull = false;
  for (const troup of [AT, WT, ST]) {
    for (const opta of ["09-46-56", "80-44-01"]) {
        LFsNotFull = resetIfNotAllAssigned(opta, [...troup, "GF"], troup) || LFsNotFull;
    }
  }
  

  //09-65-56 Maschi anzeigen bzw GF(TF) und ME zurücksetzen

  resetIfNotAllAssigned("09-65-56", ["GF", "MA"], ["MA", "ME"]);
  resetIfNotAllAssigned("09-65-56", ["GF", "MA", "ME"], ["ME"]);

  //ELW und GWL alles anzeigen, sobald LFs voll. Sonst nur GF anzeigen
  if (LFsNotFull
  ) {
    resetIfNotAllAssigned("09-19-56", seatGroups.ALL, seatGroups.CREW);
    resetIfNotAllAssigned("09-64-56", seatGroups.ALL, seatGroups.CREW);
  }
  //if 09-67-56 Nur vollständig anzeigen
  resetIfNotAllAssigned("09-67-56", seatGroups.ALL, seatGroups.ALL)
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
