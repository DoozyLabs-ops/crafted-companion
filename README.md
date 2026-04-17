# Crafted Intelligence

Doozy's AI prompt library and orchestration layer for Crafted ERP. Independent — no dependency on Oracle's AI Companion SuiteApp for prompt storage. Coexists with Oracle's native Companion when it's installed by surfacing Atlas prompts read-only in a secondary Library tab.

## What This Package Does

- **Independent prompt record** (`customrecord_dz_companion_prompt`, 29 fields) — owns prompt text, category, roles, orchestration metadata, and usage analytics
- **37 pre-built prompts** across 6 categories (Barrel Operations, Lot Profitability, Inventory & Supply Chain, Compliance & Audit, MRP Intelligence, Batch & Genealogy), seeded via Map/Reduce
- **Dual-view Library Suitelet** — primary Crafted Intelligence tab + optional Oracle AI Companion tab (conditional on Atlas SuiteApp being installed)
- **Admin deployment dashboard** — diff view, role-resolution preview, one-click Map/Reduce seed trigger, JSON backup export
- **4 companion tools** (v2.0.0): `getPromptMeta`, `seedPrompt`, `updatePrompt`, `logExecution` — single-table queries, usage analytics writeback
- **Two custom roles** (`customrole_dz_ci_admin`, `customrole_dz_ci_user`) with bidirectional record permissions
- **Role-based prompt visibility** — `visible_roles` multi-select populated via seed-time role-pattern matching against the account's native NetSuite roles

## Architecture

```
Crafted Intelligence Core (Doozy-owned, independent)
+--------------------------------------------------+
| customrecord_dz_companion_prompt (29 fields)     |
|   prompt_text, category, subcategory,            |
|   description, public, toolset, tool_chain,      |
|   entry_tool, steps, tool_deps, edition,         |
|   params, safety_rules, governance, artifact,    |
|   version, author, status, changelog,            |
|   exec_count, last_executed, avg_duration,       |
|   collection, related, complexity, visible_roles |
+--------------------------------------------------+
                        |
                        v
+--------------------------------------------------+
| customrecord_dz_exec_log  (8 fields)             |
|   prompt_ref, exec_date, tools_called,           |
|   success, error, duration, version, agent       |
+--------------------------------------------------+

Oracle AI Companion (optional coexistence surface, read-only)
+--------------------------------------------------+
| customrecord_atlas_aicomp_prompts                |
|   Surfaced in Library's secondary tab when       |
|   bundle is installed; probed via                |
|   get-atlas-availability. Never written to.      |
+--------------------------------------------------+
```

## Custom Records, Lists, Roles

| Object | Purpose |
|--------|---------|
| `customrecord_dz_companion_prompt` | Independent prompt record (29 fields) |
| `customrecord_dz_exec_log` | Execution log — prompt_ref, tools_called, success, duration, version, agent |
| `customlist_dz_cp_category` | 7 values — Barrel Ops, Lot Profitability, Inventory & Supply, Compliance & Audit, MRP Intelligence, Batch & Genealogy, General |
| `customlist_dz_cp_complexity` | User-facing: Quick / Standard / Deep Analysis |
| `customlist_dz_pm_edition` | Distillery / Winery / Brewery / Cross-Edition |
| `customlist_dz_pm_status` | Active / Draft / Testing / Deprecated |
| `customlist_dz_pm_complexity` | Governance tier: Minimal / Standard / Governed / Supervised |
| `customrole_dz_ci_admin` | Full on prompt, View on exec log, script admin |
| `customrole_dz_ci_user` | View prompts, Create exec logs |

## Companion Tools (v2.0.0)

| Tool | Purpose |
|------|---------|
| `getPromptMeta` | Single-table read of prompt + orchestration metadata. Pass `promptId` or `externalId` (e.g. `dz_cp_barrel_001`). Returns steps, params, safety_rules, governance, complexity, collection, related, usage analytics. |
| `seedPrompt` | Idempotent create of a prompt record. Admin use. |
| `updatePrompt` | Update fields with automatic patch-version bump. |
| `logExecution` | Create exec log row AND write usage analytics back to the prompt record (increments `exec_count`, sets `last_executed`, updates `avg_duration`). Best-effort on the analytics side. |

## Deployment

```bash
cd packages/crafted-companion
suitecloud project:deploy
```

Then open the admin deployment dashboard Suitelet and click **Deploy Prompts** to run the Map/Reduce seed. The dashboard shows:

- **Diff**: prompts to create / update / skip / orphan
- **Preview Role Resolution**: dry-run the role-pattern matching against the account's roles
- **Deploy Prompts**: triggers `customscript_dz_mr_promptseed` via `N/task`
- **Export**: JSON backup of current prompt records

Default target: `TSTDRV1912378` (Distillery Demo) via auth ID `doozy-distillery-demo`.

### Post-deploy

- **Reconnect MCP connector** — tool inventory is cached; disconnect/reconnect to pick up v2.0.0 schemas.

## AI Skill File

`skills/crafted-companion-instructions/SKILL.md` is the AI project instruction file customers install into Claude / ChatGPT / Cowork. It's a superset of standard NetSuite guidance plus Crafted-specific routing, tool selection order, edition awareness, and safety rules. It's linked directly from the Library Suitelet UI.

## Development Rules

See [`CLAUDE.md`](./CLAUDE.md) for full project governance. Key rules:

1. **SuiteScript 2.1 only** — ES5 syntax, `define([...], function(...){})`, no import/export
2. **Custom Tool Scripts return `Promise.resolve(JSON.stringify({...}))`** on every code path (success AND error)
3. **Governance budget is 1,000 units** — query ~10, record.load ~5, record.save ~20
4. **Parameterized SuiteQL** — always `?` placeholders with `params: []`
5. **Every custom field needs an `<aidescription>`** (max 280 chars)
6. **Custom record ↔ role permissions are bidirectional** — both sides use `[scriptid=...]` bracket notation; levels must match

## Project Status

**v3 Independence shipped** (2026-04-17). Full deployment verified in TSTDRV1912378.

- ✅ All SDF objects deployed
- ✅ Map/Reduce seed operational, 37 prompts active
- ✅ Dual-view Library with Oracle AI Companion parity (Category / Industry / Role filters)
- ✅ Popout, Open Record, Customize, Save as User Prompt
- ✅ MCP connector serving v2.0.0 tool schemas

See [`audit-trail/gate_checkpoint_log.md`](./audit-trail/gate_checkpoint_log.md) for the full checkpoint log.

### Next up

- Cross-edition smoke test on `TSTDRV1915090` (Winery demo)
- End-user KB article for the Library
