//hier können später verschiedene controlFunctions auf gerufen werden, um ein Szenario zu steuern

import { deleteAssignment, MembersArrive } from "./controlFunctions";

async function newSzenarioWith40Members() {
  await deleteAssignment();
  for (let i = 0; i < 4; i++) {
    await MembersArrive(10, null);
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
}
