import test from "node:test";
import assert from "node:assert/strict";
import { lintVault } from "../src/lint.ts";
import { makeTempVaultFromFixture } from "./helpers.js";

test("lintVault detects broken links", async () => {
  const root = makeTempVaultFromFixture();
  const code = await lintVault({ root, json: true });
  assert.equal(code, 1);
});
