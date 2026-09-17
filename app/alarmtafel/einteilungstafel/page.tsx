import AssignmentStarter from "./AssignmentStarter";
import { getPresentMemberAssignments, getVehicles } from "@/lib/db/queries";
type PageProps = {
  searchParams: Promise<{ alarm?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { alarm: alarmParam } = await searchParams;
  const alarm = alarmParam ? JSON.parse(alarmParam) : null;
  const vehicleIds: string[] = alarm?.vehicles ?? [];
  const vehicles = await getVehicles();
  const result = await getPresentMemberAssignments(vehicles.map((vehicle) => vehicle.id));

  const rows = ["GF", "MA", "ME", "ATF", "ATM", "WTF", "WTM", "STF", "STM"];
  const vehicleColumns = vehicles;
  return (
    <div>
      <h1>Einteilungstafel</h1>
      {alarm?.title && <h2>{alarm.title}</h2>}
      {alarm && <AssignmentStarter alarm={alarm} />}

      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 900 }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>Position</th>
            {vehicleColumns.map((vehicle, index) => {
              const isAlarmed = vehicleIds.includes(vehicle.id);
              const seatAssignments = vehicle.opta ? result?.[vehicle.opta] : undefined;
              const isAssigned = isAlarmed
                && seatAssignments
                && Object.keys(seatAssignments).length > 0
                && Object.values(seatAssignments).every(Boolean);

              return (
              <th key={`${vehicle.id}-${index}`} style={{
                border: "1px solid #ccc",
                padding: "0.5rem",
                background: isAlarmed ? "transparent" : "#d3d3d3",
              }}>
                {vehicle.opta ?? vehicle.id}
                {isAlarmed && (
                  <div>{isAssigned ? "Zugewiesen" : "Nicht zugewiesen"}</div>
                )}
              </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <td style={{ border: "1px solid #ccc", padding: "0.5rem", fontWeight: 600 }}>
                {row}
              </td>
              {vehicleColumns.map((vehicle, index) => {
                const isAlarmed = vehicleIds.includes(vehicle.id);
                const opta = vehicle.opta;
                const assignedMember = isAlarmed && opta ? result?.[opta]?.[row] : undefined;
                const seatExistsForVehicle = isAlarmed && opta
                  ? row in (result?.[opta] ?? {})
                  : false;

                return (
                  <td
                    key={`${row}-${vehicle.id}-${index}`}
                    style={{
                      border: "1px solid #ccc",
                      padding: "0.5rem",
                      background: !isAlarmed
                        ? "#d3d3d3"
                        : !seatExistsForVehicle
                        ? "repeating-linear-gradient(135deg, #f3f3f3 0, #f3f3f3 6px, #d9d9d9 6px, #d9d9d9 12px)"
                        : "transparent",
                    }}
                  >
                    {assignedMember ?? ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}