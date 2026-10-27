"use client";

import { useState } from "react";

type AssignmentResult = {
  success: true;
  alarmId: number;
  algorithm?: string;
  elapsedTime?: number;
  timing: number[];
  canceled: boolean;
};

function isAssignmentResult(value: unknown): value is AssignmentResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    value.success === true &&
    "alarmId" in value &&
    typeof value.alarmId === "number" &&
    "canceled" in value &&
    typeof value.canceled === "boolean" &&
    "timing" in value &&
    Array.isArray(value.timing) &&
    value.timing.every(
      (time) => typeof time === "number" && Number.isFinite(time) && time >= 0,
    ) &&
    (!("algorithm" in value) || typeof value.algorithm === "string") &&
    (!("elapsedTime" in value) ||
      (typeof value.elapsedTime === "number" &&
        Number.isFinite(value.elapsedTime) &&
        value.elapsedTime >= 0))
  );
}

function formatTiming(milliseconds: number) {
  return `${milliseconds.toFixed(2)} ms (${(milliseconds / 1000).toFixed(3)} s)`;
}

export default function StartTest({ onSave }: { onSave: (text: string) => void }) {
  const [text, setText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<AssignmentResult | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [activeAlarmId, setActiveAlarmId] = useState<number | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  const timingIntervals =
    result?.timing.slice(1).map((time, index) => time - result.timing[index]) ?? [];
  const averageTimingInterval =
    timingIntervals.length > 0
      ? timingIntervals.reduce((total, interval) => total + interval, 0) /
        timingIntervals.length
      : null;

  async function handleStartTest() {
    const alarmId = Number(text.split(",")[0]?.trim());
    if (!Number.isInteger(alarmId)) {
      setErrorMessage("Bitte eine gültige Alarm-ID angeben.");
      return;
    }

    onSave(text);
    setErrorMessage("");
    setResult(null);
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
      if (!isAssignmentResult(responseBody)) {
        throw new Error("Die Serverantwort enthält kein gültiges Ergebnis.");
      }
      setResult(responseBody);
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
      {result && (
        <section aria-live="polite">
          <h2>Ergebnis</h2>
          <p>Alarm-ID: {result.alarmId}</p>
          {result.algorithm && <p>Algorithmus: {result.algorithm}</p>}
          {result.elapsedTime !== undefined && (
            <p>
              Laufzeit: {result.elapsedTime} ms ({(result.elapsedTime / 1000).toFixed(2)} s)
            </p>
          )}
          <h3>Timing-Auswertung</h3>
          <p>Erfasste Zuweisungsschritte: {result.timing.length}</p>
          {result.timing.length > 0 ? (
            <>
              <p>Erster Schritt: {formatTiming(result.timing[0])}</p>
              <p>
                Letzter Schritt: {formatTiming(result.timing[result.timing.length - 1])}
              </p>
              {averageTimingInterval !== null && (
                <p>
                  Durchschnittlicher Abstand: {formatTiming(averageTimingInterval)}
                </p>
              )}
              <ol>
                {result.timing.map((time, index) => (
                  <li key={`${index}-${time}`}>
                    Schritt {index + 1}: {formatTiming(time)} seit Testbeginn
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p>Es wurden keine abgeschlossenen Zuweisungsschritte erfasst.</p>
          )}
          <p>Status: {result.canceled ? "Abgebrochen" : "Abgeschlossen"}</p>
        </section>
      )}
      {errorMessage && <p style={{ color: "crimson" }}>{errorMessage}</p>}
    </div>
  );
}