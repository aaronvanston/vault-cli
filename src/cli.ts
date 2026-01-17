#!/usr/bin/env node

import { Command } from "commander";
import path from "node:path";
import pc from "picocolors";
import { lintVault } from "./lint.js";
import { linkifyFile } from "./linkify.js";
import { promoteStubs } from "./promoteStubs.js";

const program = new Command();

program
  .name("vault")
  .description("Generic CLI tools for maintaining an Obsidian vault")
  .option("--root <dir>", "Vault root (defaults to cwd)", process.cwd());

program
  .command("lint")
  .description("Scan for broken links and frontmatter issues")
  .option("--json", "Machine readable output", false)
  .action(async (opts) => {
    const root = program.opts().root as string;
    const code = await lintVault({ root, json: Boolean(opts.json) });
    process.exitCode = code;
  });

program
  .command("linkify")
  .description("Conservatively add wikilinks for known entities")
  .argument("<file>", "Markdown file path (relative to --root)")
  .option("--write", "Write changes to file", false)
  .action(async (file, opts) => {
    const root = program.opts().root as string;
    const rel = path.relative(root, path.resolve(root, file));
    console.log(pc.dim(`Target: ${rel}`));
    const code = await linkifyFile({ root, file, write: Boolean(opts.write) });
    process.exitCode = code;
  });

program
  .command("promote-stubs")
  .description("Report frequently referenced stubs")
  .option("--min-refs <n>", "Minimum references", "5")
  .option("--write", "(Reserved) move files", false)
  .action(async (opts) => {
    const root = program.opts().root as string;
    const minRefs = Number(opts.minRefs);
    const code = await promoteStubs({ root, write: Boolean(opts.write), minRefs: Number.isFinite(minRefs) ? minRefs : 5 });
    process.exitCode = code;
  });

program.parseAsync().catch((err) => {
  console.error(pc.red(err?.stack ?? String(err)));
  process.exitCode = 1;
});
