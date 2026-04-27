import { NextResponse } from "next/server";
//import { verteileEinsatzkraefte } from "@/lib/algorithms/einteilung";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const autos = await prisma.vehicles.findMany();
  return NextResponse.json(autos);
}

export async function POST(req: Request) {
  const body = await req.json();

  return NextResponse.json({
    received: body
  });
}
