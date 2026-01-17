# vault-cli

Generic, scriptable maintenance commands for an Obsidian vault.

## Goals

- Generic: no personal data baked in
- Safe-by-default: dry runs, explicit writes
- Configurable: vault structure assumptions live in config

## Install

```bash
npm i -g vault-cli
```

(or run locally: `npm i && npm run build && node dist/cli.js --help`)

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

### `vault promote-stubs`

Helps keep a stub folder lightweight.

- Finds stubs referenced by many notes
- Suggests promotion targets (people/concepts/tools) based on heuristics
- Does not move files unless `--write`

```bash
vault promote-stubs
vault promote-stubs --write
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
