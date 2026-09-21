import { prisma } from "@/lib/db/prisma";
import { trainings_ref } from "@prisma/client";

// #neu Member kommen an
// INSERT INTO member_presence_logs (member_id, present)
// select id, 1 from member_presence_view
// where present = 0
// limit 25;

// #alle Member gehen
export async function setPresence(memberIds: string[] | null, presence: boolean) 
{
    if (!memberIds){
        memberIds = (await getPresentMemberIds()).map(a => a.id);
    }
    await prisma.member_presence_logs.createMany({
        data: memberIds.map((memberIds) => ({
            member_id: memberIds,
            present: presence,
        })),
    });   
}

export async function getMembersWithRequiredQualifications(limit: number, reqTrainings: trainings_ref[] | null)
{
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const members = await prisma.member_presence_view.findMany({
        take: limit,
        select: {
            id: true,
        },
        where: {
            present: 0,
            members: {
                AND: reqTrainings.map((trainingRef) => ({
                    member_trainings_view: {
                        some: {
                            training: {
                                ref: trainingRef,
                            },
                            status: "passed",
                            OR: [
                                { expiration: null },
                                { expiration: { gte: today } },
                            ],
                        },
                    },
                })),
            },
        },
    });

    return members.map((member) => member.id);

}
// INSERT INTO member_presence_logs (member_id, present)
// select id, 0 from members;

// #Einteilung löschen
// INSERT INTO feuerwehr.member_presence_logs (member_id, present, seat_id)
// select member_presence_view.id, 1,null from member_presence_view
// where present = 1;

// #qualis checken
// SELECT member_presence_view.first_name, member_presence_view.last_name, trainings.key
// FROM member_presence_view JOIN member_trainings_view ON member_presence_view.id = member_trainings_view.member_id
//     JOIN trainings ON member_trainings_view.training_id = trainings.id
// WHERE `key` = "AGT";

// #sitze finden
// SELECT vehicles.opta, vehicle_seats.seat
// FROM vehicles join vehicle_seats ON vehicles.id = vehicle_seats.vehicle_id
// WHERE vehicle_seats.agt = 1;

export async function getPresentMemberIds() {
    return await prisma.member_presence_view.findMany({
        select: {
             id: true,
        },
        where: {
            present: 1,
        },
    })
}

export async function getAssignedMemberIds(vehicleIds: string[]) {
    const vehiclesWithSeats = await getVehicleSeats(vehicleIds);
    const seatIds = vehiclesWithSeats.flatMap((vehicle) => vehicle.vehicle_seats.map((seat) => seat.id));


    const assignedMembers = await prisma.member_presence_view.findMany({
        where: {
            present: 1,
            seat_id: {
                in: seatIds,
            },
        },
        select: {
            id: true,
        },
    });
    return assignedMembers.map(m => m.id);
}

export async function getVehicleSeats(vehicleIds: string[]){
    return await prisma.vehicles.findMany({
        where: {
            id: {
                in: vehicleIds,
            },
        },
        select: {
            vehicle_seats: {
                select: {
                    id: true,
                },
            },
        },
    })
}