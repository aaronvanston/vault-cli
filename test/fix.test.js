import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { makeTempVaultFromFixture } from './helpers.js';
import { fixVault } from '../src/fix.ts';

test('fixVault dry-run does not modify files', async () => {
  const vaultRoot = makeTempVaultFromFixture();

  const target = path.join(vaultRoot, '00-inbox', 'note.md');
  fs.writeFileSync(target, 'Link [[foo\\|Bar]] and [[nextjs/]]\n');

  const before = fs.readFileSync(target, 'utf8');
  const code = await fixVault({ root: vaultRoot, write: false, glob: '**/*.md' });
  assert.equal(code, 0);

  const after = fs.readFileSync(target, 'utf8');
  assert.equal(after, before);
});

test('fixVault --write applies safe fixes outside code fences', async () => {
  const vaultRoot = makeTempVaultFromFixture();

  const target = path.join(vaultRoot, '00-inbox', 'note.md');
  fs.writeFileSync(
    target,
    'A [[foo\\|Bar]] and [[nextjs/]]\n\n```\n[[foo\\|Bar]]\n```\n',
  );

  const code = await fixVault({ root: vaultRoot, write: true, glob: '**/*.md' });
  assert.equal(code, 0);

  const after = fs.readFileSync(target, 'utf8');
  assert.match(after, /\[\[foo\|Bar\]\]/);
  assert.match(after, /\[\[nextjs\]\]/);
  // inside code fence should remain escaped
  assert.match(after, /```[\s\S]*\[\[foo\\\|Bar\]\][\s\S]*```/);
});
