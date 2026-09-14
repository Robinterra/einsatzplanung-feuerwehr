import { pullDiveraAlarms } from "./API";
import {getVehicles} from "@/lib/db/queries";


const vehicles = await getVehicles();

export enum KindOfAlarm {
    B = "B",
    H = "H",
}

export class Alarm {
    constructor(
        public alarmcode_id = 0,
        public title = "",
        public kindOfAlarm: KindOfAlarm | null = null,
        public vehicles: string[] = [],
        public timePassed = 0
    ) {}
}

export async function showAlarms(): Promise<Alarm[] | null> {
    const Alarms: Alarm[] = await filterAlarms();
 return Alarms;
}

export async function filterAlarms(): Promise<Alarm[] | null> {
    const alarmItems = await pullDiveraAlarms();
    const newAlarms: Alarm[] = [];
    const now = 1789152297; //Math.floor(Date.now() / 1000);
    const oneDay = 24 * 60 * 60;

    for (const alarmItem of alarmItems) {
        if (alarmItem.vehicles.length > 0 &&  alarmItem.date > now - oneDay) {
            const newAlarm = new Alarm();
            newAlarm.kindOfAlarm = alarmItem.title.split(" ")[0] as KindOfAlarm;
            newAlarm.alarmcode_id = alarmItem.alarmcode_id;
            newAlarm.title = alarmItem.title;
            newAlarm.vehicles = (await Promise.all(
                alarmItem.vehicles.map((vehicle) => parseOpta(vehicle))
            )).filter((value) => value && value.trim().length > 0);
            newAlarm.timePassed = now - alarmItem.date;

            newAlarms.push(newAlarm);
        }
    }

    return newAlarms;
}

async function parseOpta(_vehicle: string): Promise<string> {
    for (const vehicle of vehicles) {
        if (_vehicle.includes(vehicle.opta)) {
            return vehicle.opta;
        }
    }

    return "";
}

//TO-DO: implement the logic to parse the vehicle string and return the appropriate OPTA code
//        check, which vehicles need to be retruned, and which not. they need to end on 56 or need to be 80-44-01