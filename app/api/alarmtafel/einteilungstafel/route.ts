import { NextResponse } from "next/server";
import { startAssignment } from "@/lib/algorithms/startAssignment";
import {
	registerAssignment,
	stopAssignment,
	unregisterAssignment,
} from "@/lib/algorithms/assignmentCancellation";
import { getPresentMemberAssignments } from "@/lib/db/queries";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const vehicles = searchParams.getAll("vehicle");

	if (vehicles.length === 0) {
		return NextResponse.json({});
	}

	try {
		return NextResponse.json(await getPresentMemberAssignments(vehicles));
	} catch (error) {
		console.error(error);

		return NextResponse.json(
			{ error: "Einteilung konnte nicht abgerufen werden" },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	const alarm = await request.json();
	if (!alarm || !Array.isArray(alarm.vehicles) || alarm.vehicles.length === 0) {
		return NextResponse.json(
			{ error: "Kein ausgewählter Alarm mit Fahrzeugen" },
			{ status: 400 },
		);
	}

	const alarmId = Number(alarm.alarmcode_id);
	const signal = registerAssignment(alarmId);

	try {
		await startAssignment(alarm, signal);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error(error);

		return NextResponse.json(
			{ error: "Einteilung konnte nicht gestartet werden" },
			{ status: 500 },
		);
	} finally {
		unregisterAssignment(alarmId, signal);
	}
}

export async function DELETE(request: Request) {
	const { alarmcode_id: alarmId } = await request.json();
	return NextResponse.json({ stopped: stopAssignment(Number(alarmId)) });
}
