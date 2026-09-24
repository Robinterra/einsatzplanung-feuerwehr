import { trainings_ref } from "@prisma/client";
import { Alarm } from "../divera/alarm";
import {getAssignedMemberIds, getMembersWithRequiredQualifications, getPresentMemberIds, setPresence} from "./queries";
import {getPresentMemberAssignments} from "../db/queries"

export async function deleteAssignment() {
    console.log("deleteAssignment called");
    await setPresence(null, true);
}

export async function deleteAssignmentForVehicles(vehicleIds: string[])
{
    const memberIds = await getAssignedMemberIds(vehicleIds);
    setPresence(memberIds, true);
}

export async function everybodyLeaves() 
{
    setPresence(null, false);
}

export async function MembersArrive(count: number, requiredQualifications: trainings_ref[] | null){
   const memberIds = await getMembersWithRequiredQualifications(count , requiredQualifications);
   setPresence(memberIds, true);
}

/*export async function restartAssignmentforVehicle(vehicleId: string){
    deleteAssignmentForVehicles([vehicleId]);
    //readd vehicel
    //start Assignment
    }
export async function restartAssignment(){
    deleteAssignment();
//Assignment Starter oder so aufrufen
}*/