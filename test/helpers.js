import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export function makeTempVaultFromFixture(fixtureRel = "test/fixtures/basic-vault") {
  const fixtureAbs = path.resolve(fixtureRel);
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vault-cli-test-"));
  copyDir(fixtureAbs, tmpRoot);
  return tmpRoot;
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else if (ent.isFile()) fs.copyFileSync(s, d);
  }
}
