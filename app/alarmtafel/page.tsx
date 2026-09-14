"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { verteileEinsatzkraefte } from "@/lib/algorithms/einteilung";
import { Alarm } from "@/lib/divera/alarm";

async function fetchAlarms() {
  const response = await fetch("/api/alarmtafel");

  if (!response.ok) {
    throw new Error("Fehler beim Abrufen der Einsätze");
  }

  return response.json();
}

function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
}

function RefreshButton({ title, onClick }: { title: string; onClick: () => void }) {
  return <button type="button" onClick={onClick}>{title}</button>;
}

function StartButton({ title, onClick }: { title: string; onClick: () => void }) {
  return <button type="button" onClick={onClick}>{title}</button>;
}

export default function MyApp() {
  const router = useRouter();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  function handleStartAssignment(alarm: Alarm) {
    const selectedAlarm: Alarm = alarm;
    verteileEinsatzkraefte(selectedAlarm);
    router.push(`/alarmtafel/einteilungstafel?alarm=${encodeURIComponent(JSON.stringify(alarm))}`);
  }

  async function getAlarms() {
    try {
      const data = await fetchAlarms();
      setErrorMessage("");
      setAlarms(Array.isArray(data) ? data : []);
    } catch (error) {
      setAlarms([]);
      setErrorMessage(
        error instanceof Error ? error.message : "Fehler beim Abrufen der Einsätze",
      );
    }
  }

  return (
    <div>
      <h1>Alarmtafel</h1>
      <RefreshButton title="Einsätze abrufen" onClick={getAlarms} />

      {errorMessage && <p style={{ color: "crimson" }}>{errorMessage}</p>}

      {alarms.length > 0 ? (
        <ul style={{ marginTop: "1rem", listStyle: "none", paddingLeft: 0 }}>
          {alarms.map((alarm, index) => (
            <li
              key={`${alarm.alarmcode_id}-${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                marginBottom: "0.75rem",
                padding: "0.5rem 0.75rem",
                border: "2px solid #ddd",
                borderRadius: "8px",
              }}
            >
              <span>
                <strong>{alarm.alarmcode_id}:</strong> {alarm.title} | <strong>Art:</strong>{" "}
                {alarm.kindOfAlarm ?? "-"} | <strong>Ausgelöst vor:</strong>{" "}
                {formatElapsedTime(alarm.timePassed)}
              </span>

              <StartButton
                title="Einteilung starten"
                onClick={() => handleStartAssignment(alarm)}
              />
            </li>
          ))}
        </ul>
      ) : (
        !errorMessage && <p style={{ marginTop: "1rem" }}>Keine Einsätze vorhanden.</p>
      )}
    </div>
  );
}