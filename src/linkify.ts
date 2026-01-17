import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { loadEntities } from './entities.js';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wordBoundaryRegex(phrase: string): RegExp {
  // Match whole-word-ish, allowing spaces inside phrases.
  // Use negative lookbehind/lookahead to avoid matching in the middle of identifiers.
  const escaped = escapeRegExp(phrase);
  return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, 'g');
}

export async function linkifyFile(opts: { root: string; file: string; write: boolean }): Promise<number> {
  const abs = path.resolve(opts.root, opts.file);
  if (!fs.existsSync(abs)) {
    console.error(pc.red(`File not found: ${opts.file}`));
    return 1;
  }

  const raw = fs.readFileSync(abs, 'utf8');
  const entities = await loadEntities({ root: opts.root });

  // Build replacements: longest aliases first.
  const replacements: Array<{ from: RegExp; to: (match: string) => string }> = [];
  for (const e of entities) {
    for (const alias of e.aliases) {
      if (alias.length < 3) {
        continue;
      }
      // Avoid linking very generic words.
      if (['the', 'and', 'for', 'with', 'you', 'them', 'this'].includes(alias.toLowerCase())) {
        continue;
      }

      replacements.push({
        from: wordBoundaryRegex(alias),
        to: (match) => `[[${e.target}|${match}]]`,
      });
    }
  }

  // Skip replacements inside code fences and existing wikilinks by a simpler approach:
  // split into segments by fenced blocks.
  const parts = raw.split(/(^```[\s\S]*?^```\s*$)/gm);

  let changed = false;
  let count = 0;
  const outParts = parts.map((part) => {
    if (part.trimStart().startsWith('```')) {
      return part;
    }

    // Avoid changing inside existing wikilinks: protect them.
    const protectedLinks: string[] = [];
    const placeholder = (i: number) => `__VAULTLINK_${i}__`;

    let working = part.replace(/\[\[[^\]]+\]\]/g, (m) => {
      const idx = protectedLinks.length;
      protectedLinks.push(m);
      return placeholder(idx);
    });

    for (const r of replacements) {
      working = working.replace(r.from, (m) => {
        // Don't linkify already placeholder'd text
        if (m.includes('__VAULTLINK_')) {
          return m;
        }
        count++;
        return r.to(m);
      });
    }

    working = working.replace(/__VAULTLINK_(\d+)__/g, (_, n) => protectedLinks[Number(n)] ?? _);

    if (working !== part) {
      changed = true;
    }
    return working;
  });

  const next = outParts.join('');

  if (!changed) {
    console.log(pc.dim('No changes.'));
    return 0;
  }

  if (!opts.write) {
    console.log(pc.yellow(`Dry run: would apply ${count} link insertions.`));
    console.log(pc.dim('Re-run with --write to apply.'));
    return 0;
  }

  fs.writeFileSync(abs, next);
  console.log(pc.green(`Updated ${opts.file} (${count} link insertions).`));
  return 0;
}
