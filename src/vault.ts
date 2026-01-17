import fs from 'node:fs';
import path from 'node:path';

import fg from 'fast-glob';
import matter from 'gray-matter';

const MD_EXT_RE = /\.md$/i;
const BACKSLASH_RE = /\\/g;
const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;
const INLINE_CODE_RE = /`[^`]*`/g;
const CODE_FENCE_RE = /```[\s\S]*?```/g;

export type Note = {
  absPath: string;
  relPath: string;
  stem: string; // rel path without .md
  basename: string; // file name without .md
  frontmatter: Record<string, unknown>;
  body: string;
};

export async function listMarkdownFiles(vaultRoot: string): Promise<string[]> {
  return fg(['**/*.md'], {
    cwd: vaultRoot,
    absolute: true,
    dot: false,
    ignore: ['**/.obsidian/**', '**/.git/**', '**/node_modules/**'],
  });
}

export function readNote(vaultRoot: string, absPath: string): Note {
  const relPath = path.relative(vaultRoot, absPath).replace(BACKSLASH_RE, '/');
  const stem = relPath.replace(MD_EXT_RE, '');
  const basename = path.basename(absPath, '.md');
  const raw = fs.readFileSync(absPath, 'utf8');
  const parsed = matter(raw);
  const frontmatter = (parsed.data ?? {}) as Record<string, unknown>;
  return { absPath, relPath, stem, basename, frontmatter, body: parsed.content };
}

export function stripCode(text: string): string {
  const withoutFences = text.replace(CODE_FENCE_RE, '');
  return withoutFences.replace(INLINE_CODE_RE, '');
}

export function normalizeWikiTarget(target: string): string {
  const withoutAlias = target.split('|')[0]?.trim() ?? '';
  const withoutHeading = withoutAlias.split('#')[0]?.trim() ?? '';
  const withoutBlock = withoutHeading.split('^')[0]?.trim() ?? '';
  return withoutBlock.replace(MD_EXT_RE, '');
}

export function parseWikiLinks(text: string): string[] {
  const out: string[] = [];

  let match = WIKILINK_RE.exec(text);
  while (match) {
    const raw = match[1] ?? '';
    const normalized = normalizeWikiTarget(raw);

    if (normalized && !normalized.startsWith('#')) {
      out.push(normalized);
    }

    match = WIKILINK_RE.exec(text);
  }

  WIKILINK_RE.lastIndex = 0;
  return out;
}
