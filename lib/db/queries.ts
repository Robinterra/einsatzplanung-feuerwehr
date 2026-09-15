import { prisma } from "@/lib/db/prisma";



export async function confirmVehicleInstruction(MemberId: string, vehicleOpta: string) {
    const vehicle = await prisma.vehicles.findFirst({
        select: {
            id: true,
        },
        where: {
            opta: vehicleOpta,
        },
    });

    const instructions = await prisma.vehicle_instruction_logs.findFirst({
        select: {
            instructed: true,
        },
        where: {
            member_id: MemberId,
            vehicle_id: vehicle.id,
        },
        orderBy: { created_at: "desc" },
    });

    return instructions ?? null;
}

export async function getVehiclesWithSeats(vehicleOpta: string[]) {
    const vehicles = await prisma.vehicles.findMany({
        where: {
            opta: {
                in: vehicleOpta,
            },
        },
        select: {
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

export async function getAvailableMemberWithQualifications() {
    const members = await prisma.member_presence_view.findMany({
        where: {
            present: 1,
        },
        select: {
            id: true,
            first_name: true,
            last_name: true,
            members: { select: {
                member_trainings_view: {
                    select: {
                        training_id: true,
                        training: {
                            select: {
                                key: true
                        }
                    },
                },
                where: {
                    status: "passed",
                    OR: [
                        {
                            expiration: null,
                        },
                        {
                            expiration: {
                                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                            },
                        },
                    ],
                },
            },
                vehicle_instructions_view: {
                    select: {
                        vehicle_id: true,
                        vehicles: {
                            select: {
                                opta: true
                            }
                        }

                    },
                    where: {
                        OR: [
                                {
                                suspended_until: null,
                                },
                                {
                                    suspended_until: {
                                        lt: new Date(new Date().setHours(0, 0, 0, 0)),
                                    },
                                },
                            ],
                }   
                },
            }},
        
    
}
    });
    return members;
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