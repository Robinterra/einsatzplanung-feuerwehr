import { getOpta, getPresentMemberAssignments } from "@/lib/db/queries";

type PageProps = {
  searchParams: Promise<{ alarm?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { alarm: alarmParam } = await searchParams;
  const alarm = alarmParam ? JSON.parse(alarmParam) : null;
  const vehicleIds: string[] = alarm?.vehicles ?? [];
  const vehicles = await getOpta(vehicleIds);
  const vehicleOptas = Object.fromEntries(
    vehicles
      .filter((vehicle) => vehicle.opta)
      .map((vehicle) => [vehicle.id, vehicle.opta!]),
  );
  const result = await getPresentMemberAssignments(vehicleIds);

  const rows = ["GF", "MA", "ME", "ATF", "ATM", "WTF", "WTM", "STF", "STM"];
  const vehicleColumns = vehicleIds;
  return (
    <div>
      <h1>Einteilungstafel</h1>
      {alarm?.title && <h2>{alarm.title}</h2>}

      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 900 }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>Position</th>
            {vehicleColumns.map((vehicle: string, index: number) => (
              <th key={`${vehicle}-${index}`} style={{ border: "1px solid #ccc", padding: "0.5rem" }}>
                {vehicleOptas[vehicle] ?? vehicle}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              <td style={{ border: "1px solid #ccc", padding: "0.5rem", fontWeight: 600 }}>
                {row}
              </td>
              {vehicleColumns.map((vehicle: string, index: number) => {
                const opta = vehicleOptas[vehicle];
                const assignedMember = opta ? result?.[opta]?.[row] : undefined;
                const seatExistsForVehicle = opta ? row in (result?.[opta] ?? {}) : false;

                return (
                  <td
                    key={`${row}-${index}`}
                    style={{
                      border: "1px solid #ccc",
                      padding: "0.5rem",
                      background: !seatExistsForVehicle
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