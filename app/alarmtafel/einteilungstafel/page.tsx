import AssignmentStarter from "./AssignmentStarter";
import { getMemberInformation, getPresentMemberAssignments, getVehicles} from "@/lib/db/queries";
import { MemberTag, NameTag } from "./nameTag";
type PageProps = {
  searchParams: Promise<{ alarm?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { alarm: alarmParam } = await searchParams;
  const alarm = alarmParam ? JSON.parse(alarmParam) : null;
  const alarmedVehicleIds: string[] = alarm?.vehicles ?? [];
  const vehicles = await getVehicles();
  const result = await getPresentMemberAssignments(vehicles.map((vehicle) => vehicle.id));
  const memberIds = Array.from(
    new Set(
      Object.values(result)
        .flatMap((vehicleAssignments) => Object.values(vehicleAssignments))
        .filter((memberId): memberId is string => memberId !== null),
    ),
  );
  const memberTags = (
    await Promise.all(
      memberIds.map(async (memberId): Promise<MemberTag | null> => {
        const memberInfo = await getMemberInformation(memberId);
        return memberInfo ? { id: memberId, name: memberInfo.name, trainings: memberInfo.trainings } : null;
      }),
    )
  ).filter((member): member is MemberTag => member !== null);
  const memberTagsById = new Map(memberTags.map((member) => [member.id, member]));

  const rows = ["GF", "MA", "ME", "ATF", "ATM", "WTF", "WTM", "STF", "STM"];
  const vehicleColumns = vehicles;
  return (
    <div>
      <h1>Einteilungstafel</h1>
      {alarm?.title && <h2>{alarm.title}</h2>}
      {alarm && <AssignmentStarter alarm={alarm} />}

      <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #fff", padding: "0.5rem" }}>Position</th>
            {vehicleColumns.map((vehicle, index) => {
              const isAlarmed = alarmedVehicleIds.includes(vehicle.id);

              return (
              <th key={`${vehicle.id}-${index}`} style={{
                border: "1px solid #fff",
                padding: "0.5rem",
                background: "#faa255",
              }}>
                {vehicle.opta ?? vehicle.id}
                {isAlarmed && (
                  <div style={{ fontSize: "75%", color: "#d75200" }}>Alamiert</div>
                )}
              </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <td style={{ border: "1px solid #fff", padding: "0.5rem", fontWeight: 600, 
                            background: "#faa255"
              }}>
                {row}
              </td>
              {vehicleColumns.map((vehicle, index) => {
                const isAlarmed = alarmedVehicleIds.includes(vehicle.id);
                const opta = vehicle.opta;
                const assignedMember = isAlarmed && opta ? result?.[opta]?.[row] : undefined;
                const member = assignedMember ? memberTagsById.get(assignedMember) : undefined;
                const seatExistsForVehicle = opta
                  ? row in (result?.[opta] ?? {})
                  : false;

                return (
                  <td
                    key={`${row}-${vehicle.id}-${index}`}
                    style={{
                      border: "1px solid #fff",
                      padding: "0.5rem",
                      background: seatExistsForVehicle ? "#faa2553b" : "#fff",
                    }}
                  >
                    {member ? <NameTag member={member} /> : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}