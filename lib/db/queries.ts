import { prisma } from "@/lib/db/prisma";

export async function getAvailableMembers() {
    const members = await prisma.members.findMany({
        select: {
            id: true,
            personnel_nr: true
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
            name: true
        },
        where: {
            id: { in: qualifications.map(q => q.training_id) },
            key : { in: ["AGT", "MA", "VF", "TF", "GF1", "GF2", "TH"] }
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