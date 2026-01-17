import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { makeTempVaultFromFixture } from './helpers.js';
import { renameNote } from '../src/rename.ts';

test('renameNote dry-run does not move or edit', async () => {
  const vaultRoot = makeTempVaultFromFixture();

  fs.writeFileSync(path.join(vaultRoot, 'old.md'), '# Old\n');
  fs.writeFileSync(path.join(vaultRoot, 'ref.md'), 'Link: [[old]]\n');

  const code = await renameNote({ root: vaultRoot, from: 'old', to: 'new.md', write: false });
  assert.equal(code, 0);

  assert.ok(fs.existsSync(path.join(vaultRoot, 'old.md')));
  assert.ok(!fs.existsSync(path.join(vaultRoot, 'new.md')));

  const ref = fs.readFileSync(path.join(vaultRoot, 'ref.md'), 'utf8');
  assert.equal(ref, 'Link: [[old]]\n');
});

test('renameNote --write renames file and updates wikilinks', async () => {
  const vaultRoot = makeTempVaultFromFixture();

  fs.writeFileSync(path.join(vaultRoot, 'old.md'), '# Old\n');
  fs.writeFileSync(
    path.join(vaultRoot, 'ref.md'),
    'A [[old]] B\nC [[old|Label]] D\nE [[old#Heading]] F\nG [[old^block]] H\n',
  );

  const code = await renameNote({ root: vaultRoot, from: 'old', to: 'new.md', write: true });
  assert.equal(code, 0);

  assert.ok(!fs.existsSync(path.join(vaultRoot, 'old.md')));
  assert.ok(fs.existsSync(path.join(vaultRoot, 'new.md')));

  const ref = fs.readFileSync(path.join(vaultRoot, 'ref.md'), 'utf8');
  assert.match(ref, /\[\[new\]\]/);
  assert.match(ref, /\[\[new\|Label\]\]/);
  assert.match(ref, /\[\[new#Heading\]\]/);
  assert.match(ref, /\[\[new\^block\]\]/);
});
