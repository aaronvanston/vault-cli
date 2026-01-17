import pc from "picocolors";
import path from "node:path";
import { loadConfig } from "./config.js";
import { listMarkdownFiles, parseWikiLinks, readNote, stripCode } from "./vault.js";

export type LintIssue =
  | { kind: "broken_link"; file: string; link: string }
  | { kind: "missing_frontmatter"; file: string }
  | { kind: "missing_field"; file: string; field: string; noteType: string };

export async function lintVault(opts: { root: string; json: boolean }): Promise<number> {
  const config = loadConfig(path.resolve(opts.root));
  const files = await listMarkdownFiles(config.vaultRoot);
  const notes = files.map((f) => readNote(config.vaultRoot, f));

  const stems = new Set(notes.map((n) => n.stem));
  const basenames = new Set(notes.map((n) => n.basename));

  const issues: LintIssue[] = [];

  const docBasenames = new Set(["README", "AGENTS", "CLAUDE", "SPEC"]);

  for (const note of notes) {
    const hasFm = Object.keys(note.frontmatter).length > 0;
    const isDoc = docBasenames.has(note.basename);
    if (!hasFm && !isDoc) issues.push({ kind: "missing_frontmatter", file: note.relPath });

    const noteType = typeof note.frontmatter.type === "string" ? (note.frontmatter.type as string) : "";

    if (noteType === config.frontmatter.peopleType) {
      for (const field of ["created", "type"]) {
        if (note.frontmatter[field] == null) issues.push({ kind: "missing_field", file: note.relPath, field, noteType });
      }
    }

    if (noteType === config.frontmatter.conceptType) {
      for (const field of ["created", "type"]) {
        if (note.frontmatter[field] == null) issues.push({ kind: "missing_field", file: note.relPath, field, noteType });
      }
    }

    const linkSource = stripCode(`${note.body}\n`);
    for (const link of parseWikiLinks(linkSource)) {
      const normalized = link.replace(/\\/g, "/");
      if (normalized.includes("/")) {
        if (!stems.has(normalized)) issues.push({ kind: "broken_link", file: note.relPath, link });
      } else {
        if (!basenames.has(normalized)) issues.push({ kind: "broken_link", file: note.relPath, link });
      }
    }
  }

  if (opts.json) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ issues }, null, 2));
  } else {
    const broken = issues.filter((i) => i.kind === "broken_link").length;
    const fm = issues.filter((i) => i.kind === "missing_frontmatter").length;
    const missingFields = issues.filter((i) => i.kind === "missing_field").length;

    // eslint-disable-next-line no-console
    console.log(pc.bold(`Scanned ${notes.length} notes`));
    // eslint-disable-next-line no-console
    console.log(`- Broken links: ${broken}`);
    // eslint-disable-next-line no-console
    console.log(`- Missing frontmatter: ${fm}`);
    // eslint-disable-next-line no-console
    console.log(`- Missing required fields: ${missingFields}`);

    const top = issues.slice(0, 30);
    for (const i of top) {
      if (i.kind === "broken_link") console.log(pc.red(`broken_link  ${i.file} -> [[${i.link}]]`));
      if (i.kind === "missing_frontmatter") console.log(pc.yellow(`missing_frontmatter  ${i.file}`));
      if (i.kind === "missing_field") console.log(pc.yellow(`missing_field  ${i.file} missing ${i.field} (${i.noteType})`));
    }
    if (issues.length > top.length) console.log(pc.dim(`…and ${issues.length - top.length} more`));
  }

  return issues.length === 0 ? 0 : 1;
}
