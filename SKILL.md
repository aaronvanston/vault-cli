---
name: vault-cli
description: Generic CLI utilities for maintaining an Obsidian vault (lint/linkify/promote stubs).
homepage: https://github.com/aaronvanston/vault-cli
metadata: {"clawdbot":{"emoji":"🗂️","requires":{"bins":["vault"]}}}
---

# vault-cli

Use `vault` to maintain an Obsidian vault.

Quick start
- `vault lint --root /path/to/vault`
- `vault linkify 00-inbox/note.md --root /path/to/vault` (dry-run)
- `vault linkify 00-inbox/note.md --root /path/to/vault --write`
- `vault linkify-all --root /path/to/vault --glob '00-inbox/**/*.md'` (dry-run)
- `vault linkify-all --root /path/to/vault --glob '00-inbox/**/*.md' --limit 20 --write`

Promote stubs (safe plan/apply)
- `vault promote-stubs --root /path/to/vault --min-refs 10 --out vault.promote-stubs.plan.json`
- Edit `vault.promote-stubs.plan.json`
- `vault promote-stubs-apply --root /path/to/vault --plan vault.promote-stubs.plan.json` (dry-run)
- `vault promote-stubs-apply --root /path/to/vault --plan vault.promote-stubs.plan.json --write`
