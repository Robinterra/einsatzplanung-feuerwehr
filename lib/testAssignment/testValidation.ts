import { trainings_ref } from "@prisma/client";
import { getPresentMemberAssignments, getTrainigs } from "../db/queries";



export function hasAGTQualification(trainings: trainings_ref[] ): boolean {
    const requiredRequirements:trainings_ref[] = ["AGT", "AGT_Unterweisung", "AGT_Strecke", "G26_3"];
    const exerciseOrOperation:trainings_ref[] = ["AGT_Uebung", "AGT_Einsatz"];

    return (
        requiredRequirements.every((requirement) => trainings.includes(requirement)) &&
        exerciseOrOperation.some((requirement) => trainings.includes(requirement))
    );
}

//allgemine einsatztauglichkeit fehlt
export async function testQualificationsForVehicle(vehicleIds: string[]): Promise<Record<string, Record<string, boolean>>> {
    const membersWithSeat = await getPresentMemberAssignments(vehicleIds);
    const result: Record<string, Record<string, boolean>> = {};

    for (const [vehicle, seats] of Object.entries(membersWithSeat)) {
        result[vehicle] = {};

        for (const [seat, memberId] of Object.entries(seats)) {
            result[vehicle][seat] = memberId !== null ? await isValid(vehicle, seat, memberId) : true;
        }
    }

    return result;
}

async function isValid(vehicle: string, seat: string, memberId: string): Promise<boolean> {
    switch (vehicle) {
        case "09-19-56":
            switch (seat) {
                case "GF":
                    return await isZF(memberId);
                case "MA":
                    return await isTM(memberId);
                case "ATF":
                case "ATM":
                case "WTF":
                case "WTM":
                case "STF":
                case "STM":
                    return await isTM(memberId);
                default:
                    return false;
            }

        case "09-46-56":
        case "80-44-01":
            switch (seat) {
                case "GF":
                    return await isGF(memberId);
                case "MA":
                    return await isMA(memberId, vehicle);
                case "ATF":
                case "WTF":
                    return (await isTF(memberId)) && (await isAGT(memberId));
                case "ATM":
                case "WTM":
                    return await isAGT(memberId);
                case "ME":
                case "STF":
                case "STM":
                    return await isTM(memberId);
                default:
                    return false;
            }

        case "09-65-56":
            switch (seat) {
                case "GF":
                    return await isTF(memberId);
                case "MA":
                    return await isMA(memberId, vehicle);
                case "ME":
                    return await isTM(memberId);
                default:
                    return false;
            }

        case "09-67-56":
            switch (seat) {
                case "GF":
                    return await isTF(memberId);
                case "MA":
                    return await isMA(memberId, vehicle);
                default:
                    return false;
            }

        case "09-64-56":
            switch (seat) {
                case "GF":
                    return await isGF(memberId);
                case "MA":
                    return await isMA(memberId, vehicle);
                case "ATF":
                case "ATM":
                case "WTF":
                case "WTM":
                    return await isTM(memberId);
                default:
                    return false;
            }

        default:
            return false;
    }
}

async function isZF(memberId: string): Promise<boolean> { //Gruppenführer?
    const trainings = await getTrainigs(memberId);
    return trainings.includes("ZF");
}

async function isGF(memberId: string): Promise<boolean> { //Gruppenführer?
    const trainings = await getTrainigs(memberId);
    return trainings.includes("GF");
}

async function isMA(memberId: string, vehicle: string): Promise<boolean> { //Maschinist?
    const trainings =await getTrainigs(memberId);
    return trainings.includes("MA");
}

async function isTF(memberId: string): Promise<boolean> { //Truppfüherer?
    const trainings =await getTrainigs(memberId);
    return trainings.includes("TF");
}

async function isAGT(memberId: string): Promise<boolean> { //Atemschutzgeräteträger?
    const trainings = await getTrainigs(memberId);
    //return hasAGTQualification(trainings);
    return trainings.includes("AGT");
}

async function isTM(memberId: string): Promise<boolean> { //Truppmann bzw Einsatzqualifikation? später, wenn das überhaupt geprüft wird
    return true;
}