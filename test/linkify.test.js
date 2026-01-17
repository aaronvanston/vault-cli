import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { linkifyFile } from "../src/linkify.ts";
import { makeTempVaultFromFixture } from "./helpers.js";

test("linkifyFile dry-run does not write", async () => {
  const vaultRoot = makeTempVaultFromFixture();
  const file = "00-inbox/note.md";
  const abs = path.join(vaultRoot, file);
  const before = fs.readFileSync(abs, "utf8");

  const code = await linkifyFile({ root: vaultRoot, file, write: false });
  assert.equal(code, 0);

  const after = fs.readFileSync(abs, "utf8");
  assert.equal(after, before);
});

test("linkifyFile --write inserts links outside code", async () => {
  const vaultRoot = makeTempVaultFromFixture();
  const file = "00-inbox/note.md";
  const abs = path.join(vaultRoot, file);

  fs.writeFileSync(
    abs,
    "---\ncreated: 2026-01-01\ntype: capture\n---\n\nThis mentions Alice Example and Example Concept.\n\n```ts\nconst x = \"Alice Example\";\n```\n\n"
  );

  const code = await linkifyFile({ root: vaultRoot, file, write: true });
  assert.equal(code, 0);

  const after = fs.readFileSync(abs, "utf8");
  assert.match(after, /\[\[alice\|Alice Example\]\]/);
  assert.match(after, /\[\[example-concept\|Example Concept\]\]/);
  assert.match(after, /const x = \"Alice Example\"/);
});
