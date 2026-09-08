import { pullDiveraAlarms } from "./API";

export enum KindOfAlarm {
    B = "B",
    H = "H",
}

export class Alarm {
    constructor(
        public alarmcode_id = 0,
        public kindOfAlarm: KindOfAlarm | null = null,
        public vehicles: string[] = [],
    ) {}
}

export async function createAlarm(): Promise<Alarm | null> {
    const alarmItems = await pullDiveraAlarms();
    const newAlarm = new Alarm();

    for (const alarmItem of alarmItems) {
        if (alarmItem.vehicles.length > 0) {
            newAlarm.kindOfAlarm = alarmItem.title.split(" ")[0] as KindOfAlarm;
            newAlarm.alarmcode_id = alarmItem.alarmcode_id;
            newAlarm.vehicles = parseOpta(alarmItem.vehicles);

            return newAlarm;
        }
    }

    return null;
}

function parseOpta(vehicles: string[]): string[] {
    return vehicles.map((vehicle) => opta(vehicle));
}

function opta(vehicle: string): string {
    return "";
}

//TO-DO: implement the logic to parse the vehicle string and return the appropriate OPTA code
//        check, which vehicles need to be retruned, and which not. they need to end on 56 or need to be 80-44-01