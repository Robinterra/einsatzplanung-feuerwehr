import { getPresentMemberAssignments, getTrainigs } from "../db/queries";

export function hasTrainingKeys(trainings: string | string[] | null | undefined): string[] {
    const rawTrainings = Array.isArray(trainings) ? trainings : (trainings ?? "").split(",");
    return rawTrainings
        .map((training) => training.trim())
        .filter((training) => training.length > 0);
}

export function hasAGTQualification(trainings: string | string[] | null | undefined): boolean {
    const availableTrainings = new Set(hasTrainingKeys(trainings));
    const requiredRequirements = ["AGT", "AGT-UW", "AGT-Strecke", "G26.3"];
    const exerciseOrOperation = ["AGT-Übung", "AGT-Einsatz"];

    return (
        requiredRequirements.every((requirement) => availableTrainings.has(requirement)) &&
        exerciseOrOperation.some((requirement) => availableTrainings.has(requirement))
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
    const trainings = hasTrainingKeys(await getTrainigs(memberId));
    return trainings.includes("ZF1") && trainings.includes("ZF2");
}

async function isGF(memberId: string): Promise<boolean> { //Gruppenführer?
    const trainings = hasTrainingKeys(await getTrainigs(memberId));
    return trainings.includes("GF1") && trainings.includes("GF2");
}

async function isMA(memberId: string, vehicle: string): Promise<boolean> { //Maschinist?
    const trainings = hasTrainingKeys(await getTrainigs(memberId));
    return trainings.includes("MA");
}

async function isTF(memberId: string): Promise<boolean> { //Truppfüherer?
    const trainings = hasTrainingKeys(await getTrainigs(memberId));
    return trainings.includes("TF");
}

async function isAGT(memberId: string): Promise<boolean> { //Atemschutzgeräteträger?
    const trainings = hasTrainingKeys(await getTrainigs(memberId));
    //return hasAGTQualification(trainings);
    return trainings.includes("AGT");
}

async function isTM(memberId: string): Promise<boolean> { //Truppmann bzw Einsatzqualifikation? später, wenn das überhaupt geprüft wird
    return true;
}