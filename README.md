# vault-cli

Generic, scriptable maintenance commands for an Obsidian vault.

## Goals

- Generic: no personal data baked in
- Safe-by-default: dry runs, explicit writes
- Configurable: vault structure assumptions live in config

## Install

### Local dev

```bash
bun install
bun run build
npm link
vault --help
```

### Publishing (when ready)

Publishing is intentionally blocked right now (`"private": true` in `package.json`).

When you’re ready to go public:

- Remove `"private": true`
- Tag a release (SemVer)
- `bun run build`
- `npm publish`

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

Checks:
- Broken wikilinks (`[[...]]`) that don’t resolve to any note (ignores code blocks/inline code)
- Frontmatter basics (presence + required fields by type)
- Ignores common vault docs by default (`README.md`, `AGENTS.md`, `CLAUDE.md`, `SPEC.md`)

Examples:

```bash
vault lint
vault lint --json
vault lint --root /path/to/vault
```

### `vault linkify <file>`

Conservatively adds wikilinks for known entities based on existing person/concept notes.

- Only replaces exact alias/name matches
- Skips fenced code blocks + existing wikilinks
- Dry-run by default

```bash
vault linkify 00-inbox/captures/2026-01-02-something.md
vault linkify 00-inbox/captures/2026-01-02-something.md --write
```

### `vault linkify-all`

Linkify many markdown files matching a glob.

```bash
vault linkify-all --root /path/to/vault --glob '00-inbox/**/*.md'
vault linkify-all --root /path/to/vault --glob '00-inbox/**/*.md' --limit 50 --write
```

### `vault promote-stubs`

Generate a stub promotion plan (JSON) you can review/edit.

```bash
vault promote-stubs --root /path/to/vault --min-refs 10 --out vault.promote-stubs.plan.json
```

### `vault promote-stubs-apply`

Apply a promotion plan.

```bash
vault promote-stubs-apply --root /path/to/vault --plan vault.promote-stubs.plan.json
vault promote-stubs-apply --root /path/to/vault --plan vault.promote-stubs.plan.json --write
```

## Design assumptions

- Notes are `.md`
- Wikilinks use Obsidian format `[[target|label]]`
- `aliases` in YAML frontmatter is supported for entity matching

## Non-goals

- No network calls
- No external analytics

## License

MIT
