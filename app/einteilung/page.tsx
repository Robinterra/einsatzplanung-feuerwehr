"use client";

import { useState } from "react";

type AlarmEntry = {
  alarmcode_id: number;
  kindOfAlarm: string | null;
  timePassed: number;
};

async function fetchAlarms() {
  const response = await fetch("/api/einteilung");

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
  return <button onClick={onClick}>{title}</button>;
}

function StartButton({ title }: { title: string }) {
  return <button>{title}</button>;
}

export default function MyApp() {
  const [alarms, setAlarms] = useState<AlarmEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

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
      <h1>Einteilungstafel</h1>
      <StartButton title="Einteilung starten" />
      <RefreshButton title="Einsätze abrufen" onClick={getAlarms} />

      {errorMessage && <p style={{ color: "crimson" }}>{errorMessage}</p>}

      {alarms.length > 0 ? (
        <ul style={{ marginTop: "1rem" }}>
          {alarms.map((alarm, index) => (
            <li key={`${alarm.alarmcode_id}-${index}`}>
              <strong>Alarmcode:</strong> {alarm.alarmcode_id} | <strong>Typ:</strong>{" "}
              {alarm.kindOfAlarm ?? "-"} | <strong>Vergangen:</strong>{" "}
              {formatElapsedTime(alarm.timePassed)}
            </li>
          ))}
        </ul>
      ) : (
        !errorMessage && <p style={{ marginTop: "1rem" }}>Keine Einsätze vorhanden.</p>
      )}
    </div>
  );
}