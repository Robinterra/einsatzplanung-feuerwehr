import { time } from "console";
import { getAssignedVehicles } from "../db/queries";
import { Alarm } from "../divera/alarm";
import { assignMembersToVehicles } from "./assignmentAlgo";
import { setPresence } from "@/lib/controlling/queries";
import { getDBIdsOfMembers } from "@/lib/db/queries";

export type AssignmentAlgorithm = (
    vehicles: string[],
    signal?: AbortSignal,
) => Promise<boolean>;

export async function startAssignment(
    alarm: Alarm,
    signal?: AbortSignal,
    algorithm: AssignmentAlgorithm = assignMembersToVehicles,
    memberIds?: string[],
): Promise<number[]>
{
    let vehiclesToBeAssigned = alarm.vehicles
    const startingTime = Date.now();
    console.log("Einteilungszyklus gestartet");
    let i = 1;
    const timestamps: number[] = [];
    while (!signal?.aborted) 
    {
        
        const assignedVehicles = await getAssignedVehicles();
        const assignedVehicleIds = new Set(assignedVehicles.map(v => v.id));
        console.log("assaigned:", assignedVehicleIds)
        vehiclesToBeAssigned = vehiclesToBeAssigned.filter((vehicleId) => !assignedVehicleIds.has(vehicleId),);//schon eingeteilte Fahrzeuge werden direkt aus den einzuteilenden Fahrzeugen genommen
        console.log("Zyklus %d. Noch nicht assiged:", i, vehiclesToBeAssigned);
        const currentMemberIds = memberIds?.[i - 1];
        if (currentMemberIds !== undefined) {
            const processedMemberIds = currentMemberIds
                .split(",")
                .map((memberId) => memberId.trim())
                .filter((memberId) => memberId.length > 0);
            if (processedMemberIds.length > 0) {
                const dbMemberIds = await getDBIdsOfMembers(processedMemberIds);
                await setPresence(dbMemberIds, true);
            }
        }
        i++;

        const assignmentFinished = await algorithm(vehiclesToBeAssigned, signal);

        const assignedVehiclesPastAlg = await getAssignedVehicles();
        const newlyAssignedVehicles = assignedVehiclesPastAlg.filter(
            (vehicle) =>
                alarm.vehicles.includes(vehicle.id) && !assignedVehicleIds.has(vehicle.id),
        );
        const elapsedTime = Date.now() - startingTime;
        newlyAssignedVehicles.forEach(() => timestamps.push(elapsedTime));

        if (signal?.aborted) {
            return timestamps;
        }

        if (assignmentFinished) {
            console.log("Fertig");
            return timestamps;
        }

        await new Promise<void>
        (
            (resolve) => 
            {
            const timeout = setTimeout(resolve, 5_000);
            signal?.addEventListener("abort", () => 
                {
                    clearTimeout(timeout); 
                    resolve();
                },
                { once: true }
            );
            }
        );
    }
    return timestamps;
}