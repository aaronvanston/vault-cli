import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';

import { loadConfig } from './config.js';
import { listMarkdownFiles, normalizeWikiTarget, readNote } from './vault.js';

type RenameResult = {
  movedFrom: string;
  movedTo: string;
  filesChanged: number;
  linksUpdated: number;
};

function findNoteByBasename(notes: ReturnType<typeof readNote>[], basename: string) {
  const matches = notes.filter((n) => n.basename === basename);
  if (matches.length === 0) {
    return null;
  }
  if (matches.length === 1) {
    return matches[0];
  }
  throw new Error(`Multiple notes share basename '${basename}'. Use --from with a path instead.`);
}

function replaceWikiLinkTargets(text: string, fromTarget: string, toTarget: string): { text: string; count: number } {
  // Replace only the target portion of wikilinks, preserving label/heading/block.
  // Examples:
  // - [[Old]] -> [[New]]
  // - [[Old|Label]] -> [[New|Label]]
  // - [[Old#H]] -> [[New#H]]
  // - [[Old^b]] -> [[New^b]]

  const fromNorm = normalizeWikiTarget(fromTarget);
  let count = 0;

  const next = text.replace(/\[\[([^\]]+)\]\]/g, (full, inner: string) => {
    const normalized = normalizeWikiTarget(inner);
    if (normalized !== fromNorm) {
      return full;
    }

    // Keep everything after the base target (alias/heading/block parts).
    const remainder = inner.slice(normalized.length);
    count++;
    return `[[${toTarget}${remainder}]]`;
  });

  return { text: next, count };
}

export async function renameNote(opts: {
  root: string;
  from: string;
  to: string;
  write: boolean;
}): Promise<number> {
  const config = loadConfig(path.resolve(opts.root));
  const vaultRoot = config.vaultRoot;

  const absFromArg = path.resolve(vaultRoot, opts.from);

  const files = await listMarkdownFiles(vaultRoot);
  const notes = files.map((f) => readNote(vaultRoot, f));

  let fromNote = notes.find((n) => n.absPath === absFromArg) ?? null;
  if (!fromNote) {
    // Fall back to basename lookup.
    fromNote = findNoteByBasename(notes, opts.from);
  }

  if (!fromNote) {
    console.error(pc.red(`Could not find note to rename: ${opts.from}`));
    return 1;
  }

  if (!opts.to.toLowerCase().endsWith('.md')) {
    console.error(pc.red(`--to must end with .md (got: ${opts.to})`));
    return 1;
  }

  const toAbs = path.resolve(vaultRoot, opts.to);
  const toRel = path.relative(vaultRoot, toAbs).replace(/\\/g, '/');

  if (fs.existsSync(toAbs)) {
    console.error(pc.red(`Destination already exists: ${toRel}`));
    return 1;
  }

  const fromBasename = fromNote.basename;
  const toBasename = path.basename(toAbs, '.md');

  // Preview.
  console.log(pc.bold('Rename plan'));
  console.log(`- Move: ${fromNote.relPath} -> ${toRel}`);
  console.log(`- Update links: [[${fromBasename}]] -> [[${toBasename}]]`);

  let filesChanged = 0;
  let linksUpdated = 0;

  // Apply link changes in-memory first to ensure no mid-way surprises.
  const updates = new Map<string, { next: string; count: number }>();
  for (const note of notes) {
    const before = fs.readFileSync(note.absPath, 'utf8');
    const { text: next, count } = replaceWikiLinkTargets(before, fromBasename, toBasename);
    if (count > 0) {
      updates.set(note.absPath, { next, count });
      linksUpdated += count;
    }
  }

  console.log(`- Links to update: ${linksUpdated}`);

  if (!opts.write) {
    console.log(pc.yellow('Dry run: no files changed. Re-run with --write to apply.'));
    return 0;
  }

  // Move file first.
  fs.mkdirSync(path.dirname(toAbs), { recursive: true });
  fs.renameSync(fromNote.absPath, toAbs);

  // Write link updates.
  for (const [abs, u] of updates) {
    // If this was the moved file, adjust path.
    const actualPath = abs === fromNote.absPath ? toAbs : abs;
    fs.writeFileSync(actualPath, u.next);
    filesChanged++;
  }

  // Ensure at least counts the moved file even if no links changed.
  if (filesChanged === 0) {
    filesChanged = 1;
  }

  const result: RenameResult = {
    movedFrom: fromNote.relPath,
    movedTo: toRel,
    filesChanged,
    linksUpdated,
  };

  console.log(pc.green('Renamed note and updated links.'));
  console.log(pc.dim(JSON.stringify(result, null, 2)));
  return 0;
}
