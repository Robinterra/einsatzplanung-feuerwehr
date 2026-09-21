import AssignmentStarter from "./AssignmentStarter";
import { getMemberInformation, getPresentMemberAssignments, getVehicles, getAlarmById} from "@/lib/db/queries";
import { MemberTag, NameTag } from "./nameTag";
import { testQualificationsForVehicle } from "@/lib/testAssignment/testValidation";
import { showAlarms } from "@/lib/divera/alarm";
type PageProps = {
  searchParams: Promise<{ alarm?: string }>;
};

function validateSeatMapping(
  assignments: Record<string, Record<string, string | null>> | undefined,
  validation: Record<string, Record<string, boolean>> | undefined,
) {
  if (!assignments || !validation) {
    return true;
  }

  for (const [vehicle, seats] of Object.entries(assignments)) {
    for (const [seat, memberId] of Object.entries(seats)) {
      const seatValidation = validation[vehicle]?.[seat];
      const isSeatPresent = memberId !== null;

      if (isSeatPresent && seatValidation === undefined) {
        console.warn(`Seat mapping mismatch: ${vehicle} / ${seat} has a member but no validation entry.`);
        return false;
      }
    }
  }

  return true;
}

export default async function Page({ searchParams }: PageProps) {
  const { alarm: alarmParam } = await searchParams;
  const tempAlarm = alarmParam ? JSON.parse(alarmParam) : null;
  const alarms = await showAlarms();

  const alarm = alarms?.find((a) => a.alarmcode_id === tempAlarm?.alarmcode_id) ?? null;
  const alarmJson = alarm ? JSON.stringify(alarm) : null;
  const alarmClean = JSON.parse(alarmJson ?? "{}") as typeof alarm;

  const alarmedVehicleIds: string[] = alarm?.vehicles ?? [];
  const vehicles = await getVehicles();
  const result = await getPresentMemberAssignments(vehicles.map((vehicle) => vehicle.id));
  const validation = await testQualificationsForVehicle(vehicles.map((vehicle) => vehicle.id)); //Teste Qualifikation für jeden eingeteilten Member
  const seatMappingIsValid = validateSeatMapping(result, validation);
  if (!seatMappingIsValid) {
    console.warn("Seat mapping validation failed: vehicle-to-seat assignment mismatch detected.");
  }
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
      {alarmClean && <AssignmentStarter alarm={alarmClean} />}

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
                const opta = vehicle.opta;
                const assignedMember = opta ? result?.[opta]?.[row] : undefined;
                const member = assignedMember ? memberTagsById.get(assignedMember) : undefined;
                const seatExistsForVehicle =
                opta ? row in (result?.[opta] ?? {})
                     : false
                const isSeatValid = opta ? validation?.[opta]?.[row] ?? true : true;

                return (
                  <td
                    key={`${row}-${vehicle.id}-${index}`}
                    style={{
                      border: "1px solid #fff",
                      padding: "0.5rem",
                      background: seatExistsForVehicle
                        ? (isSeatValid ? "#faa2553b" : "#e91d323b")
                        : "#fff",
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