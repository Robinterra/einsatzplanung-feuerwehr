const runningAssignments = new Map<string, AbortController>();

export function registerAssignment(alarmId: number): AbortSignal {
	runningAssignments.get(String(alarmId))?.abort();
	const controller = new AbortController();
	runningAssignments.set(String(alarmId), controller);
	return controller.signal;
}

export function unregisterAssignment(alarmId: number, signal: AbortSignal) {
	if (runningAssignments.get(String(alarmId))?.signal === signal) {
		runningAssignments.delete(String(alarmId));
	}
}

export function stopAssignment(alarmId: number): boolean {
	const controller = runningAssignments.get(String(alarmId));
	if (!controller) {
		return false;
	}

	controller.abort();
	runningAssignments.delete(String(alarmId));
	return true;
}