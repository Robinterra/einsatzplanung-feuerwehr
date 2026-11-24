import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAssignedVehicles, getAvailableMemberWithQualifications } from "../db/queries";
import { Alarm } from "../divera/alarm";
import { assignMembersToVehicles } from "./assignmentAlgo";
import { setPresence } from "@/lib/controlling/queries";
import { verifyMemberIsMissonReady } from "@/lib/algorithms/rules"
import { getDBIdsOfMembers, getTimeTillSquadron, getTimeTillFullVehicle, longestMemberWaitingTime, getVehiclesWithSeats, countEmpytRequiredSeats } from "@/lib/db/queries";

export type AssignmentAlgorithm = (
    vehicles: string[],
    signal?: AbortSignal,
) => Promise<boolean>;

export async function startAssignment(
    alarm: Alarm,
    signal?: AbortSignal,
    algorithm: AssignmentAlgorithm = assignMembersToVehicles,
    memberIds?: string[],
)
{
    let vehiclesToBeAssigned = alarm.vehicles
    const startingTime = Date.now();
    console.log("Einteilungszyklus gestartet");
    let i = 1;
    const longestWaitingTimes : Map<number, number> = new Map();
    let timeToCalculateThings : number = 0;
    const membersWithoutSeat : number[] = [];
    const timesTillSquadron : Map<string, number> = new Map();

    while (!signal?.aborted) 
    {
        const assignedVehicles = await getAssignedVehicles();
        const assignedVehicleIds = new Set(assignedVehicles.map(v => v.id));
        console.log("assaigned:", assignedVehicleIds)
        vehiclesToBeAssigned = vehiclesToBeAssigned.filter((vehicleId) => !assignedVehicleIds.has(vehicleId),);//schon eingeteilte Fahrzeuge werden direkt aus den einzuteilenden Fahrzeugen genommen
        console.log("Zyklus %d. Noch nicht assiged:", i, vehiclesToBeAssigned);
        const timeStartAddMembers = Date.now();
        const currentMemberIds = memberIds?.[i - 1];
        if (currentMemberIds !== undefined) {
            const processedMemberIds = currentMemberIds
                .split(",")
                .map((memberId) => memberId.trim())
                .filter((memberId) => memberId.length > 0);
            if (processedMemberIds.length > 0) {
                const dbMemberIds = await getDBIdsOfMembers(processedMemberIds);
                await setPresence(dbMemberIds, true);
            }
        }
        let countMembersWithoutSeat : number = 0;
        const members = await getAvailableMemberWithQualifications();
        for (const member of members) {
            if (verifyMemberIsMissonReady(member)) {
                countMembersWithoutSeat += 1;
            }
        }
        membersWithoutSeat.push(countMembersWithoutSeat);
        timeToCalculateThings += Date.now() - timeStartAddMembers;
        i++;

        const assignmentFinished = await algorithm(vehiclesToBeAssigned, signal);

        const timeToCalculate : number = Date.now();

        const longestWaitingTime = await longestMemberWaitingTime(startingTime);
        longestWaitingTimes.set(longestWaitingTime[0], longestWaitingTime[1]);

        let timeTillSquadron : number = 0;
        for (const vehicle of await getVehiclesWithSeats(vehiclesToBeAssigned)) {
            if (vehicle.opta === "09-46-56" || vehicle.opta === "80-44-01") {
                timeTillSquadron = 0;
                timeTillSquadron = await getTimeTillSquadron(vehicle, startingTime);
                if (!timesTillSquadron.has(vehicle.opta) && timeTillSquadron > 0) {
                    timesTillSquadron.set(vehicle.opta, timeTillSquadron);
                }
            }
        }

        timeToCalculateThings += Date.now() - timeToCalculate;

        if (signal?.aborted) {
            console.log("Abbruch");
            console.log("Dauer der Einteilung: ", Date.now() - startingTime, "ms");
            console.log("Zeit Member hinzufügen: ", timeToCalculateThings, "ms");
            console.log("Anzahl Member ohne Sitz (über Zeit): ", membersWithoutSeat);
            await calculateResults(alarm, longestWaitingTimes, startingTime, timeToCalculateThings, timesTillSquadron, membersWithoutSeat, "aborted");
            return;
        }

        if (assignmentFinished) {
            console.log("Fertig");
            console.log("Dauer der Einteilung: ", Date.now() - startingTime, "ms");
            console.log("Zeit Member hinzufügen: ", timeToCalculateThings, "ms");
            console.log("Anzahl Member ohne Sitz (über Zeit): ", membersWithoutSeat);
            await calculateResults(alarm, longestWaitingTimes, startingTime, timeToCalculateThings, timesTillSquadron, membersWithoutSeat, "finished");
            return;
        }

        await new Promise<void>
        (
            (resolve) => 
            {
            const timeout = setTimeout(resolve, 2_000);
            signal?.addEventListener("abort", () => 
                {
                    clearTimeout(timeout); 
                    resolve();
                },
                { once: true }
            );
            }
        );
    }
    console.log("Dauer der Einteilung: ", Date.now() - startingTime, "ms");
    console.log("Zeit Member hinzufügen: ", timeToCalculateThings, "ms");
    console.log("Anzahl Member ohne Sitz (über Zeit): ", membersWithoutSeat);
    await calculateResults(alarm, longestWaitingTimes, startingTime, timeToCalculateThings, timesTillSquadron, membersWithoutSeat, "finished");
    return;
}

async function calculateResults(
    alarm: Alarm,
    longestWaitingTimes: Map<number, number>,
    startingTime: number,
    timeToCalculateThings: number,
    timesTillSquadron : Map<string, number>,
    membersWithoutSeatOverTime: number[],
    status: "finished" | "aborted",
) {
    const timesTillFullVehicle : Map<string, number> = new Map();
    const timeFinishedAssignement : number = Date.now();
    let unassignedRequiredSeats : number = 0;

    const vehiclesWithSeats = await getVehiclesWithSeats(alarm.vehicles);
    for (const vehicle of vehiclesWithSeats) {
        const timeTillFullVehicle = await getTimeTillFullVehicle(vehicle, startingTime);
        timesTillFullVehicle.set(vehicle.opta, timeTillFullVehicle);
        unassignedRequiredSeats += await countEmpytRequiredSeats(vehicle);
    }

    let membersWithoutSeat : number = 0;
    const members = await getAvailableMemberWithQualifications();
    for (const member of members) {
        if (verifyMemberIsMissonReady(member)) {
            membersWithoutSeat += 1;
        }
    }

    console.log("Längste Wartezeit: ", longestWaitingTimes, "ms");
    console.log("Squadron: ", timesTillSquadron, "ms");
    console.log("Full: ", timesTillFullVehicle, "ms");
    console.log("Anzahl Member ohne Sitz: ", membersWithoutSeat);

    await saveResultsCsv({
        alarm,
        status,
        durationMs: timeFinishedAssignement - startingTime,
        timeToCalculateThingsMs: timeToCalculateThings,
        unassignedRequiredSeats,
        longestWaitingTimes,
        timesTillSquadron: Object.fromEntries(timesTillSquadron),
        timesTillFullVehicle: Object.fromEntries(timesTillFullVehicle),
        membersWithoutSeatOverTime,
        membersWithoutSeat: membersWithoutSeat,
    });
}

type ResultRow = {
    alarm: Alarm;
    status: "finished" | "aborted";
    durationMs: number;
    timeToCalculateThingsMs: number;
    unassignedRequiredSeats: number;
    longestWaitingTimes: Map<number, number>;
    timesTillSquadron: Record<string, number>;
    timesTillFullVehicle: Record<string, number>;
    membersWithoutSeatOverTime: number[];
    membersWithoutSeat: number;
};

function escapeCsv(value: unknown): string {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function saveResultsCsv(result: ResultRow): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const resultsDirectory = path.join(process.cwd(), "results");
    const fileName = `${timestamp}-alarm-${result.alarm.alarmcode_id || "unknown"}.csv`;

    const headers = [
        "status",
        "alarmcode_id",
        "alarm_title",
        "alarm_kind",
        "duration_ms",
        "time_to_calc_things_ms",
        "duration_without_calc_ms",
        "cycles",
        "empty_required_seats",
        "members_without_seat",
        "messung_zeitpunkt_ms",
        "waiting_time_ms",
        "members_without_seat_over_time",
        "squadron_vehicle_opta",
        "time_till_squadron_ms",
        "full_vehicle_opta",
        "time_till_full_vehicle_ms",
    ];

    const commonValues = [
        result.status,
        result.alarm.alarmcode_id,
        result.alarm.title,
        result.alarm.kindOfAlarm ?? "",
        result.durationMs,
        result.timeToCalculateThingsMs,
        result.durationMs - result.timeToCalculateThingsMs,
        result.longestWaitingTimes.size,
        result.unassignedRequiredSeats,
        result.membersWithoutSeat,
    ];

    const waitingTimeEntries = [...result.longestWaitingTimes.entries()].sort(
        ([timeA], [timeB]) => timeA - timeB,
    );
    const squadronEntries = Object.entries(result.timesTillSquadron).sort(
        ([optaA], [optaB]) => optaA.localeCompare(optaB),
    );
    const fullVehicleEntries = Object.entries(result.timesTillFullVehicle).sort(
        ([optaA], [optaB]) => optaA.localeCompare(optaB),
    );
    const rowCount = Math.max(
        waitingTimeEntries.length,
        result.membersWithoutSeatOverTime.length,
        squadronEntries.length,
        fullVehicleEntries.length,
        1,
    );
    const emptyCommonValues = new Array(commonValues.length).fill("");
    const rows = Array.from({ length: rowCount }, (_, index) => {
        const [measurementTime, waitingTime] = waitingTimeEntries[index] ?? ["", ""];
        const [squadronOpta, squadronTime] = squadronEntries[index] ?? ["", ""];
        const [fullVehicleOpta, fullVehicleTime] = fullVehicleEntries[index] ?? ["", ""];
        return [
            ...(index === 0 ? commonValues : emptyCommonValues),
            measurementTime,
            waitingTime,
            result.membersWithoutSeatOverTime[index] ?? "",
            squadronOpta,
            squadronTime,
            fullVehicleOpta,
            fullVehicleTime,
        ];
    });

    await mkdir(resultsDirectory, { recursive: true });
    await writeFile(
        path.join(resultsDirectory, fileName),
        [
            headers.map(escapeCsv).join(","),
            ...rows.map((row) => row.map(escapeCsv).join(",")),
        ].join("\r\n") + "\r\n",
        "utf-8",
    );

    console.log("Ergebnisse gespeichert:", path.join(resultsDirectory, fileName));
}