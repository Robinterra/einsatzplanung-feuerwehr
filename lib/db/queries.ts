"use server"
import { prisma } from "@/lib/db/prisma";

export type MemberWithQualifications = Awaited<ReturnType<typeof getAvailableMemberWithQualifications>>[number];
export type vehicleWithSeats = Awaited<ReturnType<typeof getVehiclesWithSeats>>[number];
export type seat = vehicleWithSeats['seats'][number];

export async function getAvailableMemberWithQualifications() {
    const members = await prisma.member_presence_view.findMany({
        where: {
            present: 1,
            seat_id: null,
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
                                ref: true
                            },
                        },
                },
                where: {
                    training:{ref: {
                        not: null,
                    }},
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

export async function assignMembersToSeats(SeatAssignments: Record<string, string | null>, Vehicles: string[] | null) {
    const entries = Object.entries(SeatAssignments).filter(([, memberId]) => !!memberId);

    if (entries.length === 0 || Vehicles.length === 0) {
        return [];
    }

    const updates = await Promise.all(
        entries.map(async ([seatId, memberId]) => {
            if (!memberId) return null;

            const latestPresence = await prisma.member_presence_logs.findFirst({
                where: {
                    member_id: memberId,
                },
                orderBy: {
                    timestamp: "desc",
                },
            });

            if (!latestPresence) return null;

            const vehicleReady = await prisma.vehicle_seats.findFirst({
                where: {
                    id: seatId,
                    vehicle_id: { in: Vehicles},
                }
            });

            if(!vehicleReady) return null;
            
            return prisma.member_presence_logs.update({
                where: {
                    id: latestPresence.id,
                    
                },
                data: {
                    seat_id: seatId ?? null,
                },
            });
        })
    );

    return updates.filter((result): result is NonNullable<typeof result> => result !== null);
}

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
                    id: true,
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
            seats: vehicle.vehicle_seats
        }));
}

export async function getPresentMemberAssignments(vehicleID: string[]) {
    const vehicles = await prisma.vehicles.findMany({
        where: {
            id: {
                in: vehicleID,
            },
        },
        select: {
            opta: true,
            vehicle_seats: {
                select: {
                    id: true,
                    seat: true,
                },
            },
        },
    });

    const seatIds = vehicles.flatMap((vehicle) =>
        vehicle.vehicle_seats
            .map((seat) => seat.id)
            .filter((seatId): seatId is string => seatId !== null),
    );

    const presentMembers = await prisma.member_presence_view.findMany({
        where: {
            present: 1,
            seat_id: {
                in: seatIds,
            },
        },
        select: {
            seat_id: true,
            id: true,
        },
        orderBy: {
            presence_timestamp: "desc"
        },
    });

    const memberBySeat = new Map<string, string>();
    for (const member of presentMembers) {
        if (member.seat_id && !memberBySeat.has(member.seat_id)) {
            memberBySeat.set(member.seat_id, `${member.id}`);
        }
    }

    return vehicles.reduce<Record<string, Record<string, string | null>>>((assignments, vehicle) => {
        if (!vehicle.opta) {
            return assignments;
        }

        assignments[vehicle.opta] = Object.fromEntries(
            vehicle.vehicle_seats.map((seat) => [
                seat.seat,
                seat.id ? memberBySeat.get(seat.id) ?? null : null,
            ]),
        );
        
        return assignments;
    }, {});
}

export async function getVehicles() {
    const vehicles = await prisma.vehicles.findMany({
        select: {
            id: true,
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

export async function getMemberInformation(memberId:string) {
    const member = await prisma.members.findUnique({
        select: {
            first_name: true,
            last_name: true,
            member_trainings_view: {
                    select: {
                        training: {
                            select: {
                                ref: true
                        }
                    },
                },
                where: {
                    training:{ref: { not: null}},
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
        },
        where: {
            id: memberId,
            
        },
    })
    if (!member) {
        return null;
    }

    return {
        name: `${member.last_name}, ${member.first_name}`,
        trainings: member.member_trainings_view
            .map((memberTraining) => memberTraining.training.ref)
            .join(", "),
    };
}

export async function getAssignedVehicles() {
    const presentMemberSeats = await prisma.member_presence_view.findMany({
        where: {
            present: 1,
            seat_id: { not: null },
        },
        select: {
            seat_id: true,
        },
        orderBy: {
            presence_timestamp: "desc"
        },
    });

    const vehicles = await prisma.vehicles.findMany({
            where: 
            {
                license_plate: 
                {
                    not: null,
                },
                vehicle_seats:
                {
                    none: 
                    {
                        id:
                        {
                            notIn: presentMemberSeats.map(s => s.seat_id),
                        },
                    },
                },
            },
            select: 
            {
                id: true,
            },
    });
    
    return vehicles
    //alle vehicle, für die alle sitze mit anwesenden membern beetzt sind
}

export async function getTrainigs(memberId: string){
    const trainings = await prisma.member_trainings_view.findMany({
        where: { 
            training:{ref: {not : null}},
            member_id: memberId,
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
        select: {
            training: {
                select: {
                    ref: true,
                },
        }}
    })
  return trainings.map((memberTraining) => memberTraining.training.ref)
}

/* Alle Menschen die Anwesend sind, davon die Personalnummer, Qualifikation (AGT, Fahrzeuge, TH, Führungslehrgang) */