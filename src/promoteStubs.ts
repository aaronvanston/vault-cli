import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { loadConfig } from "./config.js";
import { listMarkdownFiles, parseWikiLinks, readNote } from "./vault.js";

export type StubCandidate = {
  stubFile: string;
  refs: number;
  suggestion: "people" | "concepts" | "tools" | "unknown";
};

function guessCategory(stubName: string): StubCandidate["suggestion"] {
  const lower = stubName.toLowerCase();
  if (lower.includes("@") || lower.includes("capital") || lower.includes("inc") || lower.includes("co")) return "people";
  if (lower.includes(".js") || lower.includes("ts") || lower.includes("css") || lower.includes("api")) return "tools";
  return "unknown";
}

export async function promoteStubs(opts: { root: string; write: boolean; minRefs: number }): Promise<number> {
  const config = loadConfig(path.resolve(opts.root));
  const files = await listMarkdownFiles(config.vaultRoot);
  const notes = files.map((f) => readNote(config.vaultRoot, f));

  const stubFolders = config.folders.stubs.map((p) => p.replace(/\\/g, "/"));
  const stubs = notes.filter((n) => stubFolders.some((sf) => n.relPath.startsWith(`${sf}/`)));
  const stubBasenames = new Set(stubs.map((s) => s.basename));

  const refs = new Map<string, number>();
  for (const note of notes) {
    const links = parseWikiLinks(note.body);
    for (const l of links) {
      const target = l.split("|")[0]?.trim() ?? l;
      if (target.includes("/")) continue;
      if (!stubBasenames.has(target)) continue;
      refs.set(target, (refs.get(target) ?? 0) + 1);
    }
  }

  const candidates: StubCandidate[] = [...refs.entries()]
    .map(([stubFile, count]) => ({ stubFile, refs: count, suggestion: guessCategory(stubFile) }))
    .filter((c) => c.refs >= opts.minRefs)
    .sort((a, b) => b.refs - a.refs);

  if (candidates.length === 0) {
    console.log(pc.dim("No stubs meet threshold."));
    return 0;
  }

  console.log(pc.bold(`Stub candidates (>=${opts.minRefs} refs): ${candidates.length}`));
  for (const c of candidates.slice(0, 50)) {
    console.log(`- ${c.refs}\t${c.stubFile}\t(${c.suggestion})`);
  }

  if (!opts.write) {
    console.log(pc.dim("Dry run only. Use --write to move stubs (not implemented yet)."));
    return 0;
  }

  console.log(pc.yellow("--write currently does not move files; it only reports. Keep it safe."));
  return 0;
}
