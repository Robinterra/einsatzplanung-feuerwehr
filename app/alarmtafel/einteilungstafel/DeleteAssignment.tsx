"use client";

export default function DeleteAssignment() {
    async function handleDelete() {
        await fetch("/api/alarmtafel/einteilungstafel", {
        method: "PATCH",
        });
    }

    return (
        <button type="button" onClick={handleDelete}>
        Delete Assignment
        </button>
    );
}