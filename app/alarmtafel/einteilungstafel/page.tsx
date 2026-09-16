"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page() {
  const searchParams = useSearchParams();
  const [alarmTitle, setAlarmTitle] = useState<string>("");
  const [alarm, setAlarm] = useState<any | null>(null);
  const [result, setResult] = useState<Record<string, Record<string, string | null>> | null>(null);

  useEffect(() => {
    async function loadResult() {
      const alarmParam = searchParams.get("alarm");
      const selectedAlarm = alarmParam ? JSON.parse(decodeURIComponent(alarmParam)) : null;

      setAlarm(selectedAlarm);

      if (selectedAlarm?.title) {
        setAlarmTitle(selectedAlarm.title);
      }

      const vehicles = selectedAlarm?.vehicles ?? [];
      const response = await fetch(
        `/api/alarmtafel/einteilungstafel?${vehicles
          .map((vehicle: string) => `vehicle=${encodeURIComponent(vehicle)}`)
          .join("&")}`,
      );

      if (!response.ok) {
        throw new Error("Einteilung konnte nicht abgerufen werden");
      }

      setResult(await response.json());
    }

    loadResult();
  }, [searchParams]);

  const rows = ["GF", "MA", "ME", "ATF", "ATM", "WTF", "WTM", "STF", "STM"];
  const vehicleColumns = alarm?.vehicles ?? [];
  return (
    <div>
      <h1>Einteilungstafel</h1>
      {alarmTitle && <h2>{alarmTitle}</h2>}

      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 900 }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>Position</th>
            {vehicleColumns.map((vehicle: string, index: number) => (
              <th key={`${vehicle}-${index}`} style={{ border: "1px solid #ccc", padding: "0.5rem" }}>
                {vehicle}
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
                const assignedMember = result?.[vehicle]?.[row];
                const seatExistsForVehicle = row in (result?.[vehicle] ?? {});

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