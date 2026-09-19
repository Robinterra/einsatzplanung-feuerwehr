export function verifymemberQualificationsForSeat(member: any, vehicle: any, seat: any): boolean
{
    if (seat.leadership === "TF" && !member.members.member_trainings_view.some(training => training.training.key === "TF"))
    {
        return false;
    }
    if (seat.leadership === "GF" && !(member.members.member_trainings_view.some(training => training.training.key === "GF1") && member.members.member_trainings_view.some(training => training.training.key === "GF2")))
    {
        return false;
    }
    if (seat.leadership === "ZF" && !(member.members.member_trainings_view.some(training => training.training.key === "ZF1") && member.members.member_trainings_view.some(training => training.training.key === "ZF2")))
    {
        return false;
    }
    if (seat.agt === 1 && !checkAGTQualification(member))
    {
        return false;
    }
    if (seat.seat === "MA" && !member.members.vehicle_instructions_view.some(instruction => instruction.vehicles.opta === vehicle.opta))
    {
        return false;
    }

    return true;
}

async function checkAGTQualification(member: any): Promise<boolean> {
    const requiredRequirements = ["AGT", "AGT-UW", "AGT-Strecke", "G26.3"];
    const exerciseOrOperation = ["AGT-Übung", "AGT-Einsatz"];
    return requiredRequirements.every(requirement => member.members.member_trainings_view.some(training => training.training.key === requirement))
        && exerciseOrOperation.some(requirement => member.members.member_trainings_view.some(training => training.training.key === requirement));
}

//allgemeine EInsatztauglichgeit fehlt