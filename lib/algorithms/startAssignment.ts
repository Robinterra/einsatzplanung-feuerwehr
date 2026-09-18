import { getAssignedVehicles } from "../db/queries";
import { Alarm } from "../divera/alarm";
import { assignMembersToVehicles } from "./validAssignment";


export async function startAssignment(alarm: Alarm,signal?: AbortSignal): Promise<void> 
{
    let vehiclesToBeAssigned = alarm.vehicles
    console.log("Einteilungszyklus gestartet");
    let i = 1;
    while (!signal?.aborted) 
    {
        
        const assignedVehicles = await getAssignedVehicles();
        const assignedVehicleIds = new Set(assignedVehicles.map(v => v.id));
        console.log("assaigned:", assignedVehicleIds)
        vehiclesToBeAssigned = vehiclesToBeAssigned.filter((vehicleId) => !assignedVehicleIds.has(vehicleId),);//schon eingeteilte Fahrzeuge werden direkt aus den einzuteilenden Fahrzeugen genommen
        console.log("Zyklus %d. Noch nicht assiged:", i, vehiclesToBeAssigned);
        i++;
        await assignMembersToVehicles(vehiclesToBeAssigned, signal);

        if (signal?.aborted) 
        {
            return;
        }

        if (vehiclesToBeAssigned.length === 0) 
        {
            return;
        }

        await new Promise<void>
        (
            (resolve) => 
            {
            const timeout = setTimeout(resolve, 10_000);
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
}