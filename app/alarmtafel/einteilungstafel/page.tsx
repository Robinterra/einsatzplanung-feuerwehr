"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { verteileEinsatzkraefte } from "@/lib/algorithms/einteilung";

export default function Page() {
  const searchParams = useSearchParams();
  const [alarmTitle, setAlarmTitle] = useState<string>("");
  const [result, setResult] = useState<any[]>([]);

  useEffect(() => {
    async function loadResult() {
      const alarmParam = searchParams.get("alarm");
      const alarm = alarmParam ? JSON.parse(decodeURIComponent(alarmParam)) : null;

      if (alarm?.title) {
        setAlarmTitle(alarm.title);
      }

      const assigned = await verteileEinsatzkraefte(alarm ? [alarm] : []);
      setResult(assigned);
    }

    loadResult();
  }, [searchParams]);

  return (
    <div>
      <h1>Einteilungstafel</h1>
      {alarmTitle && <h2>{alarmTitle}</h2>}
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}