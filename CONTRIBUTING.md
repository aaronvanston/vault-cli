# Contributing

Thanks for helping improve `vault-cli`.

## Principles

- Keep it generic (no private vault conventions baked in)
- Safe-by-default (dry-run, explicit `--write`)
- Deterministic output (stable ordering)

## Development

```bash
bun install
bun run format
bun run lint
bun run typecheck
bun test
```

## Releasing (later)

This repo is currently marked `private` in `package.json` to prevent accidental publishing.
When ready, remove `"private": true`, bump version, update changelog, and publish.
