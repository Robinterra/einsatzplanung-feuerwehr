import { NextResponse } from "next/server";
import { getOpta } from "@/lib/db/queries";

export async function GET(request: Request) {
  const ids = new URL(request.url).searchParams.get("ids");

  if (ids) {
    const vehicles = await getOpta(ids.split(","));
    return NextResponse.json(vehicles);
  }
}