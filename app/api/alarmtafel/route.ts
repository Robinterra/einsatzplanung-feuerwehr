import { NextResponse } from "next/server";
import { showAlarms } from "@/lib/divera/alarm";

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