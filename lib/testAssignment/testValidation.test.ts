import test from "node:test";
import assert from "node:assert/strict";

import {
  hasAGTQualification,
  hasTrainingKeys,
} from "./testValidation";

test("AGT qualification accepts required trainings and operational record", () => {
  assert.equal(
    hasAGTQualification(["AGT", "AGT-UW", "AGT-Strecke", "G26.3", "AGT-Einsatz"]),
    true,
  );
});

test("AGT qualification rejects missing exercise or training", () => {
  assert.equal(
    hasAGTQualification(["AGT", "AGT-UW", "AGT-Strecke", "G26.3"]),
    false,
  );
});

test("DB-style comma separated trainings are normalized to keys", () => {
  assert.deepEqual(hasTrainingKeys("GF1, GF2, MA, TF"), ["GF1", "GF2", "MA", "TF"]);
});
