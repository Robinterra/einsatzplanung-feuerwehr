import { trainings_ref } from "@prisma/client";
import { MemberWithQualifications, seat } from "../db/queries";

export function verifymemberQualificationsForSeat(member: MemberWithQualifications, vehicleOpta : string, seat: seat): boolean
{
    if (seat.leadership === "TF" && !member.members.member_trainings_view.some(training => training.training.ref === "TF"))
    {
        return false;
    }
    if (seat.leadership === "GF" && !(member.members.member_trainings_view.some(training => training.training.ref === "GF")))
    {
        return false;
    }
    if (seat.leadership === "ZF" && !(member.members.member_trainings_view.some(training => training.training.ref === "ZF")))
    {
        return false;
    }
    if (seat.agt && !hasAGTQualification(member.members.member_trainings_view.map(t => t.training.ref)))
    {
        return false;
    }
    if (seat.seat === "MA" && !(member.members.vehicle_instructions_view.some(instruction => instruction.vehicles.opta === vehicleOpta) && member.members.member_trainings_view.some(training => training.training.ref === "MA")))
    {
        return false;
    }

    return true;
}

export function hasAGTQualification(trainings: trainings_ref[] ): boolean {
    const requiredRequirements:trainings_ref[] = ["AGT", "AGT_Unterweisung", "AGT_Strecke", "G26_3"];
    const exerciseOrOperation:trainings_ref[] = ["AGT_Uebung", "AGT_Einsatz"];

    return (
        requiredRequirements.every((requirement) => trainings.includes(requirement)) &&
        exerciseOrOperation.some((requirement) => trainings.includes(requirement))
    );
}

//allgemeine EInsatztauglichgeit fehlt