# vault-cli

Generic, scriptable maintenance commands for an Obsidian vault.

## What this is

`vault-cli` is a small command-line toolkit for keeping an Obsidian vault:

- easy to navigate
- densely linked
- low-noise (fewer broken links / weird formatting)

It’s designed to be generic and safe-by-default.

## Key concepts

### Wikilinks

Obsidian uses wikilinks like:

- `[[note]]`
- `[[note|label]]`
- `[[note#heading]]`
- `[[note^block]]`

This CLI understands these formats when linting.

### Stubs

A **stub** is a real markdown file that exists mainly to keep a link from being “broken”.

Example: you type `[[vertical-saas]]` while capturing a tweet. If there’s no `vertical-saas.md` note yet, Obsidian shows it as an unresolved link.

Stubs are useful because they:

- let you stay in flow while capturing (link now, structure later)
- keep the graph cleaner (links resolve)
- make it obvious what to “promote” later (turn a stub into a real person/concept/tool note)

`vault-cli` supports a **plan/apply** workflow to promote stubs safely.

### Why linkification matters

When people/concepts are consistently linked:

- backlinks work (great for 1:1 prep and research)
- the graph becomes useful instead of a hairball
- you can jump from meeting → person → related concepts in 1–2 clicks

## Goals

- Generic: works across many vault structures
- Safe-by-default: dry runs, explicit writes
- Configurable: vault structure assumptions live in config

## Install

### Local dev

```bash
bun install
bun run build
```

### Install (local clone)

This project is intended to be used via a local clone (no npm publishing).

```bash
git clone https://github.com/aaronvanston/vault-cli.git
cd vault-cli
bun install
bun run build

# Option A: run directly
node dist/cli.js --help

# Option B: install the `vault` command on PATH
npm link
vault --help
```

## Config

By default the CLI treats the current working directory as the vault root.

You can add `vault.config.json` at the vault root:

```json
{
  "vaultRoot": ".",
  "folders": {
    "people": ["03-people"],
    "concepts": ["02-concepts"],
    "meetings": ["06-meetings"],
    "stubs": ["99-stubs"]
  },
  "frontmatter": {
    "peopleType": "person",
    "conceptType": "concept",
    "meetingType": "meeting-notes"
  }
}
```

## Commands

### `vault lint`

Purpose: quickly answer “is my vault healthy?”.

Checks:
- Broken wikilinks (`[[...]]`) that don’t resolve to any note (ignores code blocks/inline code)
- Frontmatter presence (skips common vault docs by default: `README.md`, `AGENTS.md`, `CLAUDE.md`, `SPEC.md`)

Examples:

```bash
vault lint --root /path/to/vault
vault lint --root /path/to/vault --json
```

### `vault linkify <file>`

Purpose: turn plain text mentions into links using existing entity notes.

How it works:
- builds a dictionary from existing notes with `type: person` or `type: concept`
- uses `aliases` from YAML frontmatter for matching
- skips existing wikilinks and fenced code blocks

Safety:
- Dry-run by default
- `--write` to apply

Examples:

```bash
vault linkify --root /path/to/vault 00-inbox/captures/2026-01-02-something.md
vault linkify --root /path/to/vault 00-inbox/captures/2026-01-02-something.md --write
```

### `vault linkify-all`

Purpose: linkify at scale.

Safety:
- Dry-run by default
- Use `--limit` while testing
- Skips `AGENTS.md`/`CLAUDE.md`/`README.md`/`SPEC.md`

Examples:

```bash
vault linkify-all --root /path/to/vault --glob '00-inbox/**/*.md'
vault linkify-all --root /path/to/vault --glob '00-inbox/**/*.md' --limit 50 --write
```

### `vault promote-stubs`

Purpose: find stubs that are referenced a lot and generate a plan you can review.

This produces a JSON file you should edit (choose where each stub should live).

```bash
vault promote-stubs --root /path/to/vault --min-refs 10 --out vault.promote-stubs.plan.json
```

### `vault promote-stubs-apply`

Purpose: apply the plan.

Safety:
- Default is dry-run (prints what it would move)
- `--write` actually moves files

```bash
vault promote-stubs-apply --root /path/to/vault --plan vault.promote-stubs.plan.json
vault promote-stubs-apply --root /path/to/vault --plan vault.promote-stubs.plan.json --write
```

### `vault rename`

Purpose: rename a note and update all wikilinks across the vault.

Safety:
- Dry-run by default
- `--write` renames the file and updates links

Examples:

```bash
vault rename --root /path/to/vault --from old-note --to new-note.md
vault rename --root /path/to/vault --from 03-people/alice.md --to 03-people/alice-example.md --write
```

## Design assumptions

- Notes are `.md`
- Wikilinks use Obsidian format `[[target|label]]`
- `aliases` in YAML frontmatter is supported for entity matching

## Obsidian plugins

No plugins are required.

This tool complements:
- Obsidian backlinks + graph view (core)
- Dataview (optional) for dashboards

## Non-goals

- No network calls
- No external analytics

## License

MIT
