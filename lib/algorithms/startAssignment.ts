import { Alarm } from "../divera/alarm";
import { assignMembersToVehicles } from "./validAssignment";


export async function startAssignment(alarm: Alarm,signal?: AbortSignal): Promise<void> 
{

    while (!signal?.aborted) 
    {

        const allVehiclesAssigned = await assignMembersToVehicles(alarm, signal);

        if (signal?.aborted) 
        {
            return;
        }

        if (allVehiclesAssigned) 
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