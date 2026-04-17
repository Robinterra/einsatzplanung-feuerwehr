import { NextResponse } from "next/server";
//import { verteileEinsatzkraefte } from "@/lib/algorithms/einteilung";

export async function GET() {
  return NextResponse.json({
    message: "Einsatz API läuft"
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  return NextResponse.json({
    received: body
  });
}
