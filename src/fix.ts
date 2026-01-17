import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';

import { loadConfig } from './config.js';
import { listMarkdownFiles, stripCode } from './vault.js';

export type FixChange = {
  file: string;
  changes: number;
};

const DOC_BASENAMES = new Set(['README', 'AGENTS', 'CLAUDE', 'SPEC']);

function applySafeFixesToText(text: string): { next: string; changes: number } {
  // Only apply fixes outside fenced code blocks by splitting.
  const parts = text.split(/(^```[\s\S]*?^```\s*$)/gm);

  let changes = 0;
  const out = parts.map((part) => {
    if (part.trimStart().startsWith('```')) {
      return part;
    }

    let next = part;

    // Fix escaped pipe in wikilinks: [[foo\|Bar]] -> [[foo|Bar]]
    next = next.replace(/\[\[([^\]]*?)\\\|/g, (m, inner) => {
      changes++;
      return `[[${inner}|`;
    });

    // Fix trailing slash targets: [[nextjs/]] -> [[nextjs]]
    next = next.replace(/\[\[([^\]|#^]+?)\/(\|[^\]]+)?\]\]/g, (m, target, label = '') => {
      changes++;
      return `[[${target}${label ?? ''}]]`;
    });

    return next;
  });

  return { next: out.join(''), changes };
}

export async function fixVault(opts: { root: string; write: boolean; glob: string }): Promise<number> {
  const config = loadConfig(path.resolve(opts.root));
  const files = await listMarkdownFiles(config.vaultRoot);

  const targets = files
    .map((abs) => path.relative(config.vaultRoot, abs).replace(/\\/g, '/'))
    .filter((rel) => {
      const base = path.basename(rel, '.md').toUpperCase();
      return !DOC_BASENAMES.has(base);
    });

  const changes: FixChange[] = [];

  for (const rel of targets) {
    const abs = path.join(config.vaultRoot, rel);
    const before = fs.readFileSync(abs, 'utf8');

    // If it's all code (rare) skip
    if (stripCode(before).trim().length === 0) {
      continue;
    }

    const { next, changes: count } = applySafeFixesToText(before);
    if (count === 0) {
      continue;
    }

    changes.push({ file: rel, changes: count });

    if (opts.write) {
      fs.writeFileSync(abs, next);
    }
  }

  if (changes.length === 0) {
    console.log(pc.dim('No safe fixes needed.'));
    return 0;
  }

  const total = changes.reduce((acc, c) => acc + c.changes, 0);
  console.log(pc.bold(`Safe fixes: ${total} change(s) across ${changes.length} file(s)`));
  for (const c of changes.slice(0, 30)) {
    console.log(`- ${c.changes}\t${c.file}`);
  }
  if (changes.length > 30) {
    console.log(pc.dim(`…and ${changes.length - 30} more`));
  }

  if (!opts.write) {
    console.log(pc.yellow('Dry run: no files changed. Re-run with --write to apply.'));
  }

  return 0;
}
