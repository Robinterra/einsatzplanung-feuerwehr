"use client";

import { Alarm } from "@/lib/divera/alarm";

type DeleteAssignmentProps = {
    alarm: Alarm;
};

export default function DeleteAssignment({ alarm }: DeleteAssignmentProps) {
    async function handleDelete() {
        await fetch("/api/alarmtafel/einteilungstafel", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            alarmcode_id: alarm.alarmcode_id,
        }),
        });
    }

    return (
        <button type="button" onClick={handleDelete}>
        Einteilung löschen
        </button>
    );
}