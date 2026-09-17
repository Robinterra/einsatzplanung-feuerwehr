import Link from "next/link";

function LoadAlarmButton({ title, href }: { title: string; href: string }) {
  return (
    <Link href={href}>
      <button type="button">{title}</button>
    </Link>
  );
}

export default function Page() {
  return (
    <div>
      <h1>Hello World</h1>
      <LoadAlarmButton title="Alarmtafel" href="/alarmtafel" />
    </div>
  );
}
