import fg from "fast-glob";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type Note = {
  absPath: string;
  relPath: string;
  stem: string; // rel path without .md
  basename: string; // file name without .md
  frontmatter: Record<string, unknown>;
  body: string;
};

export async function listMarkdownFiles(vaultRoot: string): Promise<string[]> {
  return fg(["**/*.md"], {
    cwd: vaultRoot,
    absolute: true,
    dot: false,
    ignore: ["**/.obsidian/**", "**/.git/**", "**/node_modules/**"],
  });
}

export function readNote(vaultRoot: string, absPath: string): Note {
  const relPath = path.relative(vaultRoot, absPath).replace(/\\/g, "/");
  const stem = relPath.replace(/\.md$/i, "");
  const basename = path.basename(absPath, ".md");
  const raw = fs.readFileSync(absPath, "utf8");
  const parsed = matter(raw);
  const frontmatter = (parsed.data ?? {}) as Record<string, unknown>;
  return { absPath, relPath, stem, basename, frontmatter, body: parsed.content };
}

export function stripCode(text: string): string {
  // Heuristic removal of fenced code blocks + inline code.
  const withoutFences = text.replace(/```[\s\S]*?```/g, "");
  return withoutFences.replace(/`[^`]*`/g, "");
}

export function normalizeWikiTarget(target: string): string {
  // Strip aliases, headings, and block refs.
  // Obsidian supports: [[note|label]], [[note#heading]], [[note^block]]
  const withoutAlias = target.split("|")[0]?.trim() ?? "";
  const withoutHeading = withoutAlias.split("#")[0]?.trim() ?? "";
  const withoutBlock = withoutHeading.split("^")[0]?.trim() ?? "";
  return withoutBlock.replace(/\.md$/i, "");
}

export function parseWikiLinks(text: string): string[] {
  const out: string[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const raw = m[1] ?? "";
    const normalized = normalizeWikiTarget(raw);
    if (!normalized || normalized.startsWith("#")) continue;
    out.push(normalized);
  }
  return out;
}
