"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alarm } from "@/lib/divera/alarm";

type RestartAssignmentProps = {
  alarm: Alarm;
};

export default function RestartAssignment({ alarm }: RestartAssignmentProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  async function handleRestart() {
    setIsStarting(true);

    try {
      const response_stop_delete = await fetch("/api/alarmtafel/einteilungstafel", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alarmcode_id: alarm.alarmcode_id,
        }),
      });

      if (!response_stop_delete.ok) {
        throw new Error("Stoppen und Löschen der Einteilung fehlgeschlagen");
      }
      const response = await fetch("/api/alarmtafel/einteilungstafel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(alarm),
      });

      if (!response.ok) {
        throw new Error("Neustart der Einteilung fehlgeschlagen");
      }

      router.refresh();
    } catch (error) {
      console.error("Einteilung konnte nicht neu gestartet werden:", error);
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <button type="button" onClick={handleRestart} disabled={isStarting}>
      {isStarting ? "Einteilung wird neu gestartet..." : "Einteilung neu starten"}
    </button>
  );
}