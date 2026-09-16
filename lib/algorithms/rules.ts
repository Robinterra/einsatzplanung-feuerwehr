export async function verifymemberQualificationsForSeat(member: any, vehicle: any, seat: any): Promise<boolean>
{
    if (seat.leadership === "TF" && !member.members.member_trainings_view.some(training => training.training.key === "TF"))
    {
        return false;
    }
    if (seat.leadership === "GF" && !member.members.member_trainings_view.some(training => training.training.key === "GF1") && !member.members.member_trainings_view.some(training => training.training.key === "GF2"))
    {
        return false;
    }
    if (seat.leadership === "ZF" && !member.members.member_trainings_view.some(training => training.training.key === "ZF1") && !member.members.member_trainings_view.some(training => training.training.key === "ZF2"))
    {
        return false;
    }
    if (seat.agt && !member.members.member_trainings_view.some(training => training.training.key === "AGT"))
    {//To-Do: gesamte tauglichkeit testen
        return false;
    }
    if (seat.seat === "MA" && !member.members.vehicle_instructions_view.some(instruction => instruction.vehicles.opta === vehicle.opta))
    {
        return false;
    }

    return true;
}