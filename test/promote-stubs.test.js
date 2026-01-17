import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { writePromotePlan, applyPromotePlan } from "../src/promotePlan.ts";
import { makeTempVaultFromFixture } from "./helpers.js";

test("promote plan writes JSON", async () => {
  const vaultRoot = makeTempVaultFromFixture();
  const planFile = path.resolve(vaultRoot, "plan.json");

  fs.mkdirSync(path.join(vaultRoot, "99-stubs"), { recursive: true });
  fs.writeFileSync(path.join(vaultRoot, "99-stubs", "stubby.md"), "---\ncreated: 2026-01-01\ntype: stub\n---\n\n# stubby\n");
  fs.appendFileSync(path.join(vaultRoot, "00-inbox", "note.md"), "\n\n[[stubby]]\n[[stubby]]\n[[stubby]]\n[[stubby]]\n[[stubby]]\n");

  await writePromotePlan({ root: vaultRoot, outFile: planFile, minRefs: 5 });
  const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  assert.ok(Array.isArray(plan.moves));
  assert.equal(plan.moves[0].from, "stubby");

  // Dry-run apply should not move
  const before = fs.existsSync(path.join(vaultRoot, "99-stubs", "stubby.md"));
  assert.equal(before, true);

  await applyPromotePlan({ root: vaultRoot, planFile, write: false });

  const after = fs.existsSync(path.join(vaultRoot, "99-stubs", "stubby.md"));
  assert.equal(after, true);
});
