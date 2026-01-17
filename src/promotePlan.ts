import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { loadConfig } from "./config.js";
import { listMarkdownFiles, parseWikiLinks, readNote } from "./vault.js";

export type PromotePlanMove = {
  from: string; // stub basename
  toRelPath: string; // destination path relative to vault root, including .md
};

export type PromotePlan = {
  vaultRoot: string;
  generatedAt: string;
  moves: PromotePlanMove[];
};

export async function generatePromotePlan(opts: { root: string; minRefs: number }): Promise<PromotePlan> {
  const config = loadConfig(path.resolve(opts.root));
  const files = await listMarkdownFiles(config.vaultRoot);
  const notes = files.map((f) => readNote(config.vaultRoot, f));

  const stubFolders = config.folders.stubs.map((p) => p.replace(/\\/g, "/"));
  const stubs = notes.filter((n) => stubFolders.some((sf) => n.relPath.startsWith(`${sf}/`)));
  const stubByBasename = new Map(stubs.map((s) => [s.basename, s] as const));

  const refs = new Map<string, number>();
  for (const note of notes) {
    const links = parseWikiLinks(note.body);
    for (const l of links) {
      const target = l.split("|")[0]?.trim() ?? l;
      if (target.includes("/")) continue;
      if (!stubByBasename.has(target)) continue;
      refs.set(target, (refs.get(target) ?? 0) + 1);
    }
  }

  const candidates = [...refs.entries()]
    .filter(([, c]) => c >= opts.minRefs)
    .sort((a, b) => b[1] - a[1]);

  const moves: PromotePlanMove[] = [];
  for (const [stubName] of candidates) {
    const stub = stubByBasename.get(stubName);
    if (!stub) continue;

    // Default suggestion: promote into concepts, unless user provides a plan.
    // This is intentionally conservative. Users should edit the plan output.
    const toRelPath = `${config.folders.concepts[0]}/${stubName}.md`;
    moves.push({ from: stubName, toRelPath });
  }

  return {
    vaultRoot: config.vaultRoot,
    generatedAt: new Date().toISOString(),
    moves,
  };
}

export async function writePromotePlan(opts: { root: string; outFile: string; minRefs: number }): Promise<number> {
  const plan = await generatePromotePlan({ root: opts.root, minRefs: opts.minRefs });
  fs.writeFileSync(path.resolve(opts.outFile), JSON.stringify(plan, null, 2));
  console.log(pc.green(`Wrote plan: ${opts.outFile} (${plan.moves.length} moves)`));
  console.log(pc.dim("Edit the plan, then apply with: vault promote-stubs apply --plan <file> --root <vault>"));
  return 0;
}

export async function applyPromotePlan(opts: { root: string; planFile: string; write: boolean }): Promise<number> {
  const config = loadConfig(path.resolve(opts.root));
  const absPlan = path.resolve(opts.planFile);
  if (!fs.existsSync(absPlan)) {
    console.error(pc.red(`Plan not found: ${opts.planFile}`));
    return 1;
  }

  const plan = JSON.parse(fs.readFileSync(absPlan, "utf8")) as PromotePlan;
  if (!plan?.moves || !Array.isArray(plan.moves)) {
    console.error(pc.red("Invalid plan format."));
    return 1;
  }

  // Validate all moves before doing anything.
  const stubFolders = config.folders.stubs;
  const problems: string[] = [];

  for (const move of plan.moves) {
    if (!move.from || !move.toRelPath) {
      problems.push(`Invalid move: ${JSON.stringify(move)}`);
      continue;
    }

    const fromCandidates = stubFolders.map((sf) => path.join(config.vaultRoot, sf, `${move.from}.md`));
    const fromAbs = fromCandidates.find((p) => fs.existsSync(p));
    if (!fromAbs) problems.push(`Missing stub file for '${move.from}' (searched ${fromCandidates.join(", ")})`);

    const toAbs = path.join(config.vaultRoot, move.toRelPath);
    if (!move.toRelPath.endsWith(".md")) problems.push(`Destination must end with .md: ${move.toRelPath}`);
    if (fs.existsSync(toAbs)) problems.push(`Destination already exists: ${move.toRelPath}`);
  }

  if (problems.length) {
    console.error(pc.red(`Plan has ${problems.length} problem(s):`));
    for (const p of problems.slice(0, 30)) console.error(pc.red(`- ${p}`));
    if (problems.length > 30) console.error(pc.dim(`…and ${problems.length - 30} more`));
    return 1;
  }

  const preview = plan.moves.slice(0, 25);
  console.log(pc.bold(`Plan moves: ${plan.moves.length}`));
  for (const m of preview) console.log(`- ${m.from} -> ${m.toRelPath}`);
  if (plan.moves.length > preview.length) console.log(pc.dim(`…and ${plan.moves.length - preview.length} more`));

  if (!opts.write) {
    console.log(pc.yellow("Dry run: no files moved."));
    console.log(pc.dim("Re-run with --write to apply."));
    return 0;
  }

  for (const move of plan.moves) {
    const fromCandidates = stubFolders.map((sf) => path.join(config.vaultRoot, sf, `${move.from}.md`));
    const fromAbs = fromCandidates.find((p) => fs.existsSync(p));
    if (!fromAbs) throw new Error(`Invariant: missing stub '${move.from}'`);

    const toAbs = path.join(config.vaultRoot, move.toRelPath);
    fs.mkdirSync(path.dirname(toAbs), { recursive: true });
    fs.renameSync(fromAbs, toAbs);
  }

  console.log(pc.green(`Moved ${plan.moves.length} stub(s).`));
  return 0;
}
