#!/usr/bin/env node

import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';
import { linkifyFile } from './linkify.js';
import { linkifyAll } from './linkifyAll.js';
import { lintVault } from './lint.js';
import { promoteStubs, promoteStubsApply } from './promoteStubs.js';

const program = new Command();

program
  .name('vault')
  .description('Generic CLI tools for maintaining an Obsidian vault')
  .option('--root <dir>', 'Vault root (defaults to cwd)', '.');

program
  .command('lint')
  .description('Scan for broken links and frontmatter issues')
  .option('--json', 'Machine readable output', false)
  .action(async (opts) => {
    const root = path.resolve(program.opts().root as string);
    const code = await lintVault({ root, json: Boolean(opts.json) });
    process.exitCode = code;
  });

program
  .command('linkify')
  .description('Conservatively add wikilinks for known entities')
  .argument('<file>', 'Markdown file path (relative to --root)')
  .option('--write', 'Write changes to file', false)
  .action(async (file, opts) => {
    const root = path.resolve(program.opts().root as string);
    const rel = path.relative(root, path.resolve(root, file));
    console.log(pc.dim(`Target: ${rel}`));
    const code = await linkifyFile({ root, file, write: Boolean(opts.write) });
    process.exitCode = code;
  });

program
  .command('linkify-all')
  .description('Linkify many markdown files matching a glob')
  .requiredOption('--glob <pattern>', "Glob (relative to --root), e.g. '00-inbox/**/*.md'")
  .option('--limit <n>', 'Limit number of files', '0')
  .option('--write', 'Write changes to files', false)
  .action(async (opts) => {
    const root = path.resolve(program.opts().root as string);
    const limit = Number(opts.limit);
    const code = await linkifyAll({
      root,
      glob: String(opts.glob),
      write: Boolean(opts.write),
      limit: Number.isFinite(limit) ? limit : 0,
    });
    process.exitCode = code;
  });

program
  .command('promote-stubs')
  .description('Generate a stub promotion plan (JSON)')
  .option('--min-refs <n>', 'Minimum references', '5')
  .option('--out <file>', 'Write plan to file', 'vault.promote-stubs.plan.json')
  .action(async (opts) => {
    const root = path.resolve(program.opts().root as string);
    const minRefs = Number(opts.minRefs);
    const code = await promoteStubs({
      root,
      outFile: String(opts.out),
      minRefs: Number.isFinite(minRefs) ? minRefs : 5,
    });
    process.exitCode = code;
  });

program
  .command('promote-stubs-apply')
  .description('Apply a stub promotion plan')
  .requiredOption('--plan <file>', 'Plan JSON file')
  .option('--write', 'Actually move files', false)
  .action(async (opts) => {
    const root = path.resolve(program.opts().root as string);
    const code = await promoteStubsApply({ root, planFile: String(opts.plan), write: Boolean(opts.write) });
    process.exitCode = code;
  });

program.parseAsync().catch((err) => {
  console.error(pc.red(err?.stack ?? String(err)));
  process.exitCode = 1;
});
