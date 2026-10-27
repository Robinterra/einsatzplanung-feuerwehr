import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assignMembersToVehicles as assignWithLisaAlgorithm } from "@/lib/algorithms/LisasAlgoritmus";
import { assignMembersToVehicles as assignWithDefaultAlgorithm } from "@/lib/algorithms/assignmentAlgo";
import { startAssignment, type AssignmentAlgorithm } from "@/lib/algorithms/startAssignment";
import {
  registerAssignment,
  stopAssignment,
  unregisterAssignment,
} from "@/lib/algorithms/assignmentCancellation";
import { showAlarms } from "@/lib/divera/alarm";
import { setPresence } from "@/lib/controlling/queries";

const assignmentAlgorithms: Record<string, AssignmentAlgorithm> = {
  assignmentAlgo: assignWithDefaultAlgorithm,
  LisasAlgoritmus: assignWithLisaAlgorithm,
};

export async function GET() {
  try {
    const alarms = await showAlarms();

    return NextResponse.json(alarms);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Einsätze konnten nicht abgerufen werden" },
      { status: 500 }
    );
  }
}


export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("text" in body) ||
    typeof body.text !== "string"
  ) {
    return NextResponse.json(
      { error: "Erwartet wird eine Eingabe im Format AlarmId, Algorithmus, Members" },
      { status: 400 }
    );
  }

  const [rawAlarmId, rawAlgorithm, ...membersFileNameParts] = body.text.split(",");
  const alarmId = rawAlarmId?.trim();
  const algorithmName = rawAlgorithm?.trim();
  const membersFileName = membersFileNameParts.join(",").trim();

  if (!alarmId || !Number.isInteger(Number(alarmId)) || !algorithmName) {
    return NextResponse.json(
      { error: "AlarmId und Algorithmus müssen angegeben werden" },
      { status: 400 }
    );
  }

  const algorithm = assignmentAlgorithms[algorithmName];
  if (!algorithm) {
    return NextResponse.json(
      { error: `Unbekannter Algorithmus: ${algorithmName}` },
      { status: 400 }
    );
  }

  if (!membersFileName || path.basename(membersFileName) !== membersFileName) {
    return NextResponse.json(
      { error: "Ungültiger Dateiname für die Mitgliederdatei" },
      { status: 400 }
    );
  }
  const signal = registerAssignment(Number(alarmId));
  try {
    const membersFilePath = path.join(process.cwd(), "public", membersFileName);
    const memberIds = (await readFile(membersFilePath, "utf-8")).split(/\r?\n/);

    if (signal.aborted) {
      return NextResponse.json({
        success: true,
        canceled: true,
        alarmId: Number(alarmId),
        timing: [],
      });
    }

    const availableAlarms = await showAlarms();
    const alarm = availableAlarms?.find(
      (availableAlarm) => availableAlarm.alarmcode_id === Number(alarmId)
    );

    if (!alarm) {
      return NextResponse.json(
        { error: `Alarm ${alarmId} wurde nicht gefunden` },
        { status: 404 }
      );
    }

    if (signal.aborted) {
      return NextResponse.json({
        success: true,
        canceled: true,
        alarmId: alarm.alarmcode_id,
        timing: [],
      });
    }

    await setPresence(null, false);
    //Timeout für Timestamps (Fehler in View beheben)
    await new Promise<void>
        (
            (resolve) => 
            {
            const timeout = setTimeout(resolve, 1_000);
            }
        );

    const startingTime = Date.now();
    const timing = await startAssignment(alarm, signal, algorithm, memberIds);
    const elapsedTime = Date.now() - startingTime;

    return NextResponse.json({
      success: true,
      alarmId: alarm.alarmcode_id,
      algorithm: algorithmName,
      elapsedTime,
      timing,
      canceled: signal.aborted,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Einteilung konnte nicht gestartet werden" },
      { status: 500 }
    );
  } finally {
    unregisterAssignment(Number(alarmId), signal);
  }
}

export async function DELETE(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("alarmcode_id" in body) ||
    typeof body.alarmcode_id !== "number" ||
    !Number.isInteger(body.alarmcode_id)
  ) {
    return NextResponse.json(
      { error: "Eine gültige Alarm-ID muss angegeben werden" },
      { status: 400 }
    );
  }

  return NextResponse.json({ stopped: stopAssignment(body.alarmcode_id) });
}