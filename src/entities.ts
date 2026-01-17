import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";
import { listMarkdownFiles, readNote } from "./vault.js";

export type Entity = {
  kind: "person" | "concept";
  target: string; // wikilink target (basename)
  aliases: string[];
};

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string") as string[];
  if (typeof v === "string") return [v];
  return [];
}

export async function loadEntities(opts: { root: string }): Promise<Entity[]> {
  const config = loadConfig(path.resolve(opts.root));

  const files = await listMarkdownFiles(config.vaultRoot);
  const notes = files.map((f) => readNote(config.vaultRoot, f));

  const entities: Entity[] = [];

  for (const note of notes) {
    const noteType = typeof note.frontmatter.type === "string" ? (note.frontmatter.type as string) : "";
    const aliases = toStringArray(note.frontmatter.aliases);

    if (noteType === config.frontmatter.peopleType) {
      entities.push({ kind: "person", target: note.basename, aliases: aliases.length ? aliases : [note.basename] });
    }
    if (noteType === config.frontmatter.conceptType) {
      entities.push({ kind: "concept", target: note.basename, aliases: aliases.length ? aliases : [note.basename] });
    }
  }

  // Keep deterministic order: longer aliases first to reduce partial matches.
  entities.sort((a, b) => {
    const aMax = Math.max(...a.aliases.map((x) => x.length));
    const bMax = Math.max(...b.aliases.map((x) => x.length));
    return bMax - aMax;
  });

  // De-dupe aliases per target
  for (const e of entities) {
    e.aliases = [...new Set(e.aliases.map((x) => x.trim()).filter(Boolean))];
  }

  return entities;
}

export function buildAliasMap(entities: Entity[]): Map<string, Entity> {
  const map = new Map<string, Entity>();
  for (const e of entities) {
    for (const a of e.aliases) {
      const key = a.toLowerCase();
      if (map.has(key)) continue; // first wins
      map.set(key, e);
    }
  }
  return map;
}

export function isLikelyCodeFenceLine(line: string): boolean {
  return line.trim().startsWith("```");
}

export function isInsideCodeFence(text: string, index: number): boolean {
  // Very simple: count fences before index.
  const before = text.slice(0, index);
  const fences = before.match(/```/g)?.length ?? 0;
  return fences % 2 === 1;
}

export function replaceOutsideWikiLinks(opts: {
  text: string;
  replacements: Array<{ from: RegExp; to: (match: string) => string }>;
}): { text: string; count: number } {
  let out = opts.text;
  let count = 0;

  for (const { from, to } of opts.replacements) {
    out = out.replace(from, (match, ...args) => {
      const offset = args[args.length - 2] as number;
      if (isInsideCodeFence(out, offset)) return match;
      // Skip if inside an existing wikilink
      const pre = out.slice(Math.max(0, offset - 2), offset);
      const post = out.slice(offset + match.length, offset + match.length + 2);
      if (pre === "[[" || post === "]]" || pre.includes("[[") || post.includes("]]")) return match;
      count++;
      return to(match);
    });
  }

  return { text: out, count };
}
