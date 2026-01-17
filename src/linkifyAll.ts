import fg from "fast-glob";
import path from "node:path";
import pc from "picocolors";
import { linkifyFile } from "./linkify.js";

export async function linkifyAll(opts: { root: string; glob: string; write: boolean; limit: number }): Promise<number> {
  const cwd = path.resolve(opts.root);
  const matches = await fg([opts.glob], {
    cwd,
    onlyFiles: true,
    dot: false,
    ignore: ["**/.obsidian/**", "**/.git/**", "**/node_modules/**"],
  });

  const files = matches
    .filter((f) => f.toLowerCase().endsWith(".md"))
    .filter((f) => {
      const base = path.basename(f, ".md").toUpperCase();
      return !["AGENTS", "CLAUDE", "README", "SPEC"].includes(base);
    });
  const sliced = opts.limit > 0 ? files.slice(0, opts.limit) : files;

  console.log(pc.bold(`Matched ${files.length} markdown file(s)`));
  if (opts.limit > 0 && files.length > sliced.length) {
    console.log(pc.dim(`Limiting to first ${sliced.length}.`));
  }

  let failures = 0;
  for (const file of sliced) {
    const rel = file.replace(/\\/g, "/");
    console.log(pc.dim(`→ ${rel}`));
    const code = await linkifyFile({ root: cwd, file: rel, write: opts.write });
    if (code !== 0) failures++;
  }

  if (!opts.write) {
    console.log(pc.yellow("Dry run complete. Re-run with --write to apply."));
  }

  return failures === 0 ? 0 : 1;
}
