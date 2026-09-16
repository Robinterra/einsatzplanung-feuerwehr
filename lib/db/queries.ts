import { prisma } from "@/lib/db/prisma";

export async function confirmVehicleInstruction(MemberId: string, vehicleId: string) {
    const instructions = await prisma.vehicle_instruction_logs.findFirst({
        select: {
            instructed: true,
        },
        where: {
            member_id: MemberId,
            vehicle_id: vehicleId,
        },
        orderBy: { created_at: "desc" },
    });

    return instructions ?? null;
}

export async function getVehiclesWithSeats(vehicleID: string[]) {
    const vehicles = await prisma.vehicles.findMany({
        where: {
            id: {
                in: vehicleID,
            },
        },
        select: {
            id: true,
            opta: true,
            vehicle_seats: {
                select: {
                    seat: true,
                    agt: true,
                    leadership: true,
                },
                orderBy: {
                    seat: "asc",
                },
            },
        },
        orderBy: {
            opta: "asc",
        },
    });

    return vehicles
        .filter((vehicle) => !!vehicle.opta)
        .map((vehicle) => ({
            id: vehicle.id,
            opta: vehicle.opta!,
            seats: vehicle.vehicle_seats.map((seat) => ({
                seat: seat.seat,
                agt: seat.agt,
                leadership: seat.leadership,
            })),
        }));
}

export async function getVehicles() {
    const vehicles = await prisma.vehicles.findMany({
        select: {
            opta: true,
        },
        where: { license_plate: { not: null } }
    });

    return vehicles;
}

export async function getIDsOfVehicles(vehicleOpta: string[]) {
    const vehicles = await prisma.vehicles.findMany({
        where: {
            opta: {
                in: vehicleOpta
            },
        },
        select: {
            id: true
        },
    });

    return vehicles.map(vehicle => vehicle.id);
}

export async function getOpta(vehicleIds: string[]) {
    const vehicles = await prisma.vehicles.findMany({
        select: {
            id : true,
            opta: true
        },
        where: {
            id: { in: vehicleIds }
        },
    });

    return vehicles
}

export async function getAvailableMembers() {
    const members = await prisma.members.findMany({
        select: {
            id: true,
            first_name: true,
            last_name: true,
        
        },
        where: { status: "active" }
    });
    return members;
}

export async function getMemberQualifications(memberId: string) {
    const qualifications = await prisma.member_training_logs.findMany({
        select: {
            training_id: true,
            expiration: true
        },
        where: { 
            member_id: memberId, 
            status: "passed"
        }
    });
    const qualificationDetails = await prisma.trainings.findMany({
        select: {
            id: true,
            key: true
        },
        where: {
            id: { in: qualifications.map(q => q.training_id) },
            key : { in: ["AGT", "MA", "ZF1", "ZF2", "TF", "GF1", "GF2", "TH"] }
        }
    });

    return qualificationDetails;
}

export async function getVehicleInstructions(memberId: string) {
    const instructions = await prisma.vehicle_instruction_logs.findMany({
        select: {
            vehicle_id: true
        },
        where: { member_id: memberId }
    });
    const instructionDetails = await prisma.vehicles.findMany({
        select: {
            id: true,
            name: true
        },
        where: {
            id: { in: instructions.map(i => i.vehicle_id) }
        }
    });
    return instructionDetails;
}


/* Alle Menschen die Anwesend sind, davon die Personalnummer, Qualifikation (AGT, Fahrzeuge, TH, Führungslehrgang) */