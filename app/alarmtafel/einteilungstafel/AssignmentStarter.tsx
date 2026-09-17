"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alarm } from "@/lib/divera/alarm";

type AssignmentStarterProps = {
  alarm: Alarm;
};

export default function AssignmentStarter({
  alarm,
}: AssignmentStarterProps) {
  const router = useRouter();

  const [isStopping, setIsStopping] = useState(false);
  const [isStopped, setIsStopped] = useState(false);

  // Verhindert, dass beim Unmount unnötig gestoppt wird,
  // wenn bereits manuell gestoppt wurde.
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;

    // Einteilung starten
    void fetch("/api/alarmtafel/einteilungstafel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(alarm),
    }).catch((error) => {
      console.error(
        "Einteilung konnte nicht gestartet werden:",
        error
      );
    });

    // Tabelle regelmäßig aktualisieren
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => {
      clearInterval(interval);

      // Wenn bereits manuell gestoppt wurde,
      // keinen zweiten DELETE senden.
      if (stoppedRef.current) {
        return;
      }

      // Einteilung beim Verlassen der Seite stoppen
      void fetch("/api/alarmtafel/einteilungstafel", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alarmcode_id: alarm.alarmcode_id,
        }),
        keepalive: true,
      }).catch((error) => {
        console.error(
          "Einteilung konnte beim Verlassen der Seite nicht gestoppt werden:",
          error
        );
      });
    };
  }, [alarm.alarmcode_id, router]);

  async function handleStop() {
    setIsStopping(true);

    try {
      const response = await fetch(
        "/api/alarmtafel/einteilungstafel",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            alarmcode_id: alarm.alarmcode_id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Stoppen der Einteilung fehlgeschlagen"
        );
      }

      stoppedRef.current = true;
      setIsStopped(true);
    } catch (error) {
      console.error(
        "Einteilung konnte nicht gestoppt werden:",
        error
      );
    } finally {
      setIsStopping(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleStop}
      disabled={isStopping || isStopped}
    >
      {isStopped
        ? "Einteilung gestoppt"
        : isStopping
          ? "Wird gestoppt..."
          : "Einteilung stoppen"}
    </button>
  );
}

