//soll später mit der api von divera zusammenarbeiten, das wir djetzt erstmal simuliert
//Ausgabe: ALarmstichwort(String), vehicle (string, mit komma getrennte OPTA Kennungen)
//ZB Stichwort: "B BMA - BMA-Auslösung", vehicle: "BS 01-11-01,,BS 01-26-01,BS 01-59-02,BS 01-83-02,BS 09-17-15,BS 09-46-15,BS 09-46-56,BS 80-44-01,BS 09-19-56,BS 09-64-56,BS 09-67-56,BS FFw AB-SCHLAUCH,BS FFw Watenbüttel,BS FFw F-WFZ-Süd"
import { readFile } from "node:fs/promises";

export interface AlarmItem {
	alarmcode_id: number;
	title: string;
	vehicles: string[];
}

export async function pullDiveraAlarms(): Promise<AlarmItem[]> {
	const filePath = "lib/db/divera/testAlarms.txt";
	const fileContent = await readFile(filePath, "utf-8");
	const parsedData: unknown = JSON.parse(fileContent);
	const alarmItems = Array.isArray(parsedData) ? parsedData : [parsedData];

	if (!alarmItems.every(isAlarmItem)) {
		throw new Error(`Invalid AlarmItem data in ${filePath}`);
	}

	return alarmItems.map((alarmItem) => ({
		alarmcode_id: alarmItem.alarmcode_id,
		title: alarmItem.title,
		vehicles: alarmItem.vehicles,
	}));
}

function isAlarmItem(value: unknown): value is AlarmItem {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	const alarmItem = value as Record<string, unknown>;
	return (
		typeof alarmItem.alarmcode_id === "number" &&
		typeof alarmItem.title === "string" &&
		Array.isArray(alarmItem.vehicles) &&
		alarmItem.vehicles.every((vehicle) => typeof vehicle === "string")
	);
}