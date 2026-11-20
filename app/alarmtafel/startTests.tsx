"use client";

import { useState } from "react";


function formatTiming(milliseconds: number) {
  return `${milliseconds.toFixed(2)} ms (${(milliseconds / 1000).toFixed(3)} s)`;
}

export default function StartTest({ onSave }: { onSave: (text: string) => void }) {
  const [text, setText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [activeAlarmId, setActiveAlarmId] = useState<number | null>(null);
  const [isStopping, setIsStopping] = useState(false);


  async function handleStartTest() {
    const alarmId = Number(text.split(",")[0]?.trim());
    if (!Number.isInteger(alarmId)) {
      setErrorMessage("Bitte eine gültige Alarm-ID angeben.");
      return;
    }

    onSave(text);
    setErrorMessage("");
    setIsStarting(true);

    try {
      setActiveAlarmId(alarmId);
      const startResponse = await fetch("/api/alarmtafel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const responseBody: unknown = await startResponse.json();
      if (!startResponse.ok) {
        const message =
          typeof responseBody === "object" &&
          responseBody !== null &&
          "error" in responseBody &&
          typeof responseBody.error === "string"
            ? responseBody.error
            : "Algorithmus konnte nicht gestartet werden.";
        throw new Error(message);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Test konnte nicht gestartet werden.",
      );
    } finally {
      setActiveAlarmId(null);
      setIsStarting(false);
      setIsStopping(false);
    }
  }

  async function handleStopTest() {
    if (activeAlarmId === null) {
      return;
    }

    setIsStopping(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/alarmtafel", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alarmcode_id: activeAlarmId }),
      });

      if (!response.ok) {
        throw new Error("Test konnte nicht beendet werden.");
      }

      const result: unknown = await response.json();
      if (
        typeof result !== "object" ||
        result === null ||
        !("stopped" in result) ||
        result.stopped !== true
      ) {
        throw new Error("Es läuft kein Test, der beendet werden kann.");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Test konnte nicht beendet werden.",
      );
      setIsStopping(false);
    }
  }

  return (
    <div>
      <textarea
        title="Eingabe: AlarmId, Algorithmus, Memberdatei"
        aria-label="Text für den Test"
        value={text}
        rows={1}
        style={{ width: "25%", boxSizing: "border-box" }}
        onChange={(event) => setText(event.target.value)}
        disabled={isStarting || activeAlarmId !== null}
      />
      <button
        type="button"
        onClick={handleStartTest}
        disabled={isStarting || activeAlarmId !== null || isStopping}
      >
        {isStarting ? "Test wird gestartet..." : "Test starten"}
      </button>
      {activeAlarmId !== null && (
        <button type="button" onClick={handleStopTest} disabled={isStopping}>
          {isStopping ? "Test wird beendet..." : "Test beenden"}
        </button>
      )}
      {errorMessage && <p style={{ color: "crimson" }}>{errorMessage}</p>}
    </div>
  );
}