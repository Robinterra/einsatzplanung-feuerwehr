import { NextResponse } from "next/server";
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
