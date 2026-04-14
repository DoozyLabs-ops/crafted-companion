# Crafted Companion v2

Companion-native intelligence for Crafted ERP — built on Oracle's AI Companion framework, replacing the v1 Prompt Engine.

## What This Package Does

Oracle's AI Companion provides a prompt library for NetSuite's AI Connector Service. Crafted Companion v2 makes Crafted ERP's domain intelligence native to this framework:

- **Companion-Native Prompts** — Crafted prompts appear alongside Oracle's built-in prompts in the standard AI Companion Library
- **Extension Record** (`customrecord_dz_prompt_meta`) — Queryable metadata linking companion prompts to Crafted tool chains, toolsets, edition compatibility, governance levels
- **Embedded Meta Block** — Structured YAML in prompt text that gives AI runtime context for tool orchestration, edition-aware output, and tiered governance
- **Domain Prompts** — Companion prompts seeded across all Crafted Intelligence domains (barrels, lots, inventory, compliance, MRP, batch/genealogy)
- **Companion Tools** — 4 new tools (`getPromptMeta`, `seedPrompt`, `updatePrompt`, `logExecution`) replacing v1's 12-tool Prompt Engine

## Architecture

```
Oracle AI Companion (bundle-locked)    Crafted Companion v2 (our extension)
+------------------------------+      +------------------------------+
| customrecord_atlas_aicomp_   |<---->| customrecord_dz_prompt_meta  |
|   prompts                    | FK   |   (tool chain, edition,      |
|   (name, text, category,    |      |    toolset, governance,      |
|    roles, industry, usage)   |      |    params, artifact type)    |
+------------------------------+      +------------------------------+
         |                                       |
         |  prompt text includes:                 |  queryable via:
         v                                       v
  <!-- crafted-intelligence          SELECT p.*, m.*
  toolchain: ...                     FROM ...prompts p
  edition: cross                     JOIN ...prompt_meta m
  governance: standard               ON m.prompt_ref = p.id
  steps: [...]
  -->
```

## v1 Prompt Engine Status

The v1 Prompt Engine is being **retired**. Only `detectAccountConfig` and `getAccountConfig` are retained. All playbook records, section records, and playbook tools are deprecated. See `docs/specs/ADR-001-companion-native-architecture.md` for the full decision record.

## Deployment

```bash
cd packages/crafted-companion
suitecloud project:deploy
```

Target: TSTDRV1912378 (Distillery Demo)
Auth ID: doozy-distillery-demo

## Project Status

Phase: Discovery (complete) / Awaiting ADR-001 approval to advance to Scoping
See `CLAUDE.md` for full project governance and current state.
