# Change Log — Crafted Companion

## 2026-04-17 — v3 Independence Rewrite (shipped)

Replaced the v2 Atlas-extension architecture with a single independent record. No more FK dependency on Oracle's bundle-locked AI Companion for prompt storage.

### Schema changes
- **Added**: `customrecord_dz_companion_prompt` (29 fields) — independent prompt record, `<accesstype>USEPERMISSIONLIST</accesstype>`
- **Added**: `customlist_dz_cp_category` (7 values, replaces `customlist_dz_pm_domain`)
- **Added**: `customlist_dz_cp_complexity` (Quick / Standard / Deep Analysis — user-facing)
- **Added**: `customrole_dz_ci_admin`, `customrole_dz_ci_user` — bidirectional `[scriptid=...]` record permissions
- **Added**: `customscript_dz_mr_promptseed` Map/Reduce script deployment
- **Removed**: `customrecord_dz_prompt_meta.xml`, `customlist_dz_pm_domain.xml`
- **Updated**: `customrecord_dz_exec_log` — FK description now references the new independent record
- **Updated**: `customscript_dz_sl_compseed` — `<allroles>T</allroles>` for admin audience

### Runtime changes
- **Companion tools v2.0.0** — single-table queries (no Atlas JOIN); `logExecution` wraps every code path in `Promise.resolve(JSON.stringify(...))` and writes usage analytics (`exec_count`, `last_executed`, `avg_duration`) back to the prompt record
- **`getPromptMeta` output** adds `description`, `collection`, `related`, `complexity`, `exec_count`, `last_executed`, `avg_duration`, `changelog`, `public`; drops `meta_id`
- **New Map/Reduce seed** (`dz_mr_prompt_seed.js`) — idempotent version-aware create/update, role-pattern fuzzy matching against native NS roles, reads `seed-data.json` v3.0.0

### Library SPA
- **Dual-view layout** — primary Crafted Intelligence tab + conditional Oracle AI Companion tab (Atlas read-only, hidden when SuiteApp absent; probed via `get-atlas-availability`)
- **Atlas tab filter bar** mirrors Oracle native Library: Category (7 from `customlist_atlas_aicomp_prompt_cat`) + Industry (39 from `customlist_atlas_aicomp_prompt_ind`) + Role (74 from `customrecord_atlas_aicomp_prompt_roles`)
- **Feature parity with Oracle UI**: popout icon, Open Record link (uses `N/url.resolveRecord`), Customize mode with editable textarea, Save as User Prompt (creates new `customrecord_dz_companion_prompt` with `collection="My Prompts"`, `author=currentUser`, `visible_roles=[currentRole]`)
- **Role-based filtering** uses whitespace-tolerant lookup (SuiteQL multi-select returns `"1, 2, 3"` with spaces)
- **Removed** the auto-setup loop — replaced by the admin deployment dashboard

### Admin Suitelet
- **Deployment dashboard** (`dz_sl_companion_seed.js`) — diff view (create / update / skip / orphan), role-resolution preview, deploy trigger via `N/task`, status polling, JSON backup export

### Seed data v3.0.0
- 37 prompts across 6 categories with new fields (`description`, `complexity`, `collection`, `related`, `role_patterns`)
- External IDs changed from `dz_pm_*` → `dz_cp_*`
- Removed `atlas_external_id`

### Docs
- Parent `CLAUDE.md` — v3 Independence banner at top
- `SKILL.md` — title, batch-genealogy tool table, corrected `barrelSearch` param, generic example IDs
- `README.md` — rewritten for v3
- `audit-trail/gate_checkpoint_log.md` — v3 sign-off section (6 checkpoints)
- `docs/crafted-companion-pitch.html` — end-to-end updated
- `docs/discovery/csd-assessment-briefing.md` — CSD framework assessment added
- `src/Objects/customrecord_dz_prompt_meta.xml` + `src/Objects/customlist_dz_pm_domain.xml` — removed

### SDF lesson captured
Custom record ↔ role permissions are bidirectional and require `[scriptid=...]` bracket notation on **both** sides:
- Record's `<permissions>` uses `<permittedrole>[scriptid=customrole_dz_ci_admin]</permittedrole>`
- Role's `<permissions>` uses `<permkey>[scriptid=customrecord_dz_companion_prompt]</permkey>`
- Levels must match on both sides

### Deployed to TSTDRV1912378
- 37 prompts seeded via Map/Reduce with working role resolution (e.g. `dz_cp_barrel_001` matched 27 roles)
- 37 old `customrecord_dz_prompt_meta` records inactivated, then record type deleted (cascaded instances)
- 37 orphan Atlas prompts (`aiprompt_crafted_*`) inactivated — bundle-locked, can't delete
- MCP connector reconnected; v2.0.0 schemas verified via functional call
- GitHub: branch `v3-independence` merged to `main` via PR #1

---

## 2026-04-14 — Full Build Session (Phase 0 + Phase 1 + Phase 3)

### Phase 0: Foundation
- Git repo initialized: `DoozyLabs-ops/crafted-companion`
- 4 custom lists (edition, complexity, status, domain) deployed
- 2 custom records (prompt_meta 18 fields, exec_log 8 fields) deployed
- Toolset `custtoolset_dz_companion` deployed with stub tools
- SDF deploy lessons: aidescription not on lists, selectrecordtype uses `[scriptid=]`, toolset scriptid max 27 chars

### Phase 1: Companion Toolset
- All 4 tools implemented: getPromptMeta, logExecution, seedPrompt, updatePrompt
- getPromptMeta verified via MCP — returns full orchestration metadata
- logExecution verified — creates exec log records (MCP response parsing issue is cosmetic)

### Seed System
- Seed data JSON v2.0: 37 prompts across 6 domains
- Auto-setup in Library Suitelet: creates Atlas prompts + extension records + mirrors roles
- Batched for governance limits (client retries up to 5 times)
- SDF custimport approach attempted but custom records not supported — Suitelet approach used

### UIF SPA Attempt (abandoned)
- Converted to SuiteApp for custspa — hit ownership conflicts with Account Customization objects
- custspa requires TypeScript build pipeline — hand-written AMD/ES modules fail
- Reverted to Account Customization with Suitelet INLINEHTML approach

### Phase 3: Companion Library Suitelet
- Suitelet serves HTML from companion-library.html template file
- Crafted Intelligence branding (teal/amber, Bebas Neue, Lato)
- Modeled after Oracle AI Connector Service Companion (from actual source HTML)
- Features: search, domain/edition/governance filters, card grid, detail modal, Copy/Claude/ChatGPT actions, admin banner, toast notifications
- Hard tool validation: 34 of 37 prompts shown (3 winery batch prompts hidden in distillery account)
- `type="button"` required on all buttons inside serverWidget INLINEHTML forms

### Skill File
- Created `skills/crafted-companion-instructions/SKILL.md`
- Layers on Oracle's netsuite-ai-connector-instructions
- Covers all 6 domains, tool chains, edition awareness, governance levels, safety rules
- Linked from Library Suitelet, available on GitHub

### Role Mirroring
- Auto-setup queries active NS roles, creates matching Companion prompt roles
- Creates role mappings with correct field names (discovered via SuiteQL inspection)
- Field names: custrecord_atlas_aicomp_ns_role_id, custrecord_atlas_aicomp_prompt_role, custrecord_atlas_aicomp_map_confidence, custrecord_atlas_aicomp_mapping_method

## 2026-04-14 — Session 1: SDF Object XML (Phase 0 Foundation)

- **Git repo initialized:** `DoozyLabs-ops/crafted-companion` on GitHub (separate from crafted-intelligence)
- Initial commit with all Discovery + Scoping + Planning artifacts pushed to `main`
- Feature branch created: `phase-0/foundation-sdf-objects`
- **FOUND-001:** Created `customlist_dz_pm_edition.xml` — 4 values (Distillery, Winery, Brewery, Cross-Edition)
- **FOUND-002:** Created `customlist_dz_pm_complexity.xml` — 4 values (Minimal, Standard, Governed, Supervised)
- **FOUND-003:** Created `customlist_dz_pm_status.xml` — 4 values (Active, Draft, Deprecated, Testing)
- **NEW:** Created `customlist_dz_pm_domain.xml` — 6 values (Barrel Operations, Lot Profitability, Inventory & Supply Chain, Compliance & Audit, MRP Intelligence, Batch & Genealogy). Replaces cross-package reference to `customlist_dz_ap_domain` — crafted-companion is a standalone package.
- **FOUND-004:** Created `customrecord_dz_prompt_meta.xml` — 18 fields (prompt_ref FK, domain, subdomain, toolset, tool_chain, entry_tool, steps JSON, tool_deps JSON, edition, edition_notes, params JSON, safety_rules JSON, governance, artifact, artifact_type, version, author, status). All fields have `<aidescription>`.
- **FOUND-005:** Created `customrecord_dz_exec_log.xml` — 8 fields (prompt_ref, exec_date, tools_called, success, error, duration, version, agent). All fields have `<aidescription>`.
- **FOUND-006:** Created `custtoolset_crafted_companion.xml` — placeholder toolset with both expose flags. Script/schema paths point to `companion-tools/` directory (files created in Phase 1).
- All SDF XML in `src/Objects/`. Total: 4 custom lists, 2 custom records, 1 toolset.

## 2026-04-14 — Task Plan Produced (Scoping → Planning)

- Created chunked task plan (`docs/task_plan.md`)
- **50 chunks** across 5 phases, mapped to **17 sessions**
- Phase 0: Foundation (8 chunks) — SDF objects
- Phase 1: Companion Toolset (12 chunks) — 4 tools with design-first approach
- Phase 2: Extension Records + Roles + v1 Retirement (7 chunks)
- Phase 3: UIF SPA Suitelet (16 chunks) — backend → core → components → polish
- Phase 4: Testing & Documentation (7 chunks)
- 5 milestones with HITM approval gates
- Critical path: FOUND-004 → FOUND-008 → TOOL-001 → TOOL-002 → TOOL-008 → DATA-003 → SPA-001 → SPA-002 → SPA-003 → SPA-012 → SPA-016 → TEST-004
- Session plan groups chunks into focused work sessions (3-5 chunks each)
- Dependency map identifies parallel work opportunities and blocking chains

## 2026-04-14 — Project Kickoff

- Created project scaffold with governed CLAUDE.md
- Traced full Atlas AI Companion SuiteApp schema (bundle-locked)
- Reviewed Oracle agent-skills repo (3 skills: AI Connector Instructions, SDF Permissions, UIF SPA Reference)
- Designed extension record schema (`customrecord_dz_prompt_meta`, 18 fields)
- Designed embedded meta block format (YAML in HTML comment)
- Seeded 12 barrel intelligence companion prompts in TSTDRV1912378
- Updated all barrel prompts with category=Manufacturing, subcategory="Barrel Intelligence", role=Administrator, industry=Food & Beverage
- Identified 4 open design questions for Discovery phase resolution
- Completed 5-track discovery document (requirements, environment assessment, gap analysis, risk register)

## 2026-04-14 — v2 Architecture Pivot

- **Decision:** Retire v1 Prompt Engine entirely; rebuild on Oracle's Companion framework
- Wrote ADR-001: Companion-Native Architecture for Crafted Intelligence v2
  - Complete v1 → v2 concept migration map
  - 7 custom records retired, 10 tools retired, 4 new tools designed
  - Tiered governance model (minimal/standard/governed/supervised)
  - Expanded embedded meta block v2 format with steps, conditions, safety, params
- Rewrote CLAUDE.md for ground-up v2 framing (removed "extension layer" language)
- Revised discovery document: updated requirements (FR-007, FR-009, IR-003), gaps (G-005), toolset plan, next steps
- Updated gate checkpoint log with v2 architecture checkpoint
- All documents pending HITM review of ADR-001 before advancing to Scoping

## 2026-04-14 — Live Tests & Meta Block Decision

- **Live Test: Prompt Studio (OQ-003)** — Confirmed Prompt Studio is a plain text area. No structured parameter input for `[BRACKET]` placeholders. `params` schema is advisory for AI only.
- **Live Test: Meta Block Visibility (A-002)** — Confirmed Companion Library renders prompt text as plain text. HTML comments displayed verbatim — NOT hidden.
- **Decision: Abandon embedded meta block.** All orchestration metadata moved to extension record (`customrecord_dz_prompt_meta`). Prompt text stays clean. AI retrieves context via `getPromptMeta`.
- Extension record schema expanded: added `steps` (JSON), `safety_rules` (JSON), `params` (JSON) fields that were originally planned for the meta block
- Updated ADR-001, CLAUDE.md, discovery document, and gate checkpoint log
- OQ-003 resolved. A-002 disproven. 2 of 4 open design questions now closed.

## 2026-04-14 — UIF SPA Suitelet Decision (OQ-001)

- **OQ-001 resolved:** Build Crafted Companion Library as a UIF SPA Suitelet in Phase 1, using Oracle's `@uif-js/core` + `@uif-js/component`
- Downloaded all 3 Oracle agent-skills reference files to `docs/oracle-agent-skills/` (UIF types, AI Connector Instructions, SDF Permissions)
- Confirmed Oracle only has 2 NetSuite repos on GitHub; all relevant skills already captured
- FR-008 promoted from SHOULD HAVE to MUST HAVE (Phase 1)
- ADR-001 updated with full SPA architecture section (components, state management, data flow)
- CLAUDE.md updated with SPA folder structure, module list, and resolved OQ-001
- Discovery document updated: FR-008, G-008, OQ-001
- 3 of 4 open design questions now closed (OQ-001, OQ-003, A-002). Only OQ-002 and OQ-004 remain.

## 2026-04-14 — OQ-002 Resolved: Hard Tool Validation

- **OQ-002 resolved:** Tool validation is HARD. Prompts are hidden (not shown with warnings) if required toolset is not deployed/connected
- FR-006 promoted from SHOULD HAVE to **MUST HAVE** — hard gate, not soft warning
- SPA uses `detectAccountConfig` + `tool_deps` field to filter prompts by toolset availability
- Admin banner pattern: shows which toolsets need deployment to unlock additional domains
- Updated ADR-001 (SPA section), CLAUDE.md (OQ-002 + stage gates), discovery document (FR-006, G-006, OQ-002), gate checkpoint log
- 4 of 4 design questions now resolved (OQ-001, OQ-002, OQ-003/A-002). Only OQ-004 (versioning) remains.

## 2026-04-14 — OQ-004 Resolved + HITM Approval → Scoping

- **OQ-004 resolved:** Update in place. Version tracked on extension record. No duplicate prompt records.
- **HITM approval:** Luke approved ADR-001 and discovery document. All open design questions resolved.
- **Discovery → Scoping gate PASSED.** All checklist items complete.
- Updated CLAUDE.md, ADR-001, discovery document, gate checkpoint log

## 2026-04-14 — Scope Document Produced

- Created formal scope document (`docs/specs/scope-document.md`)
- Defined Phase 1 (MVP): SDF objects, 4 companion tools, UIF SPA Suitelet, barrel extension records, v1 retirement, docs
- Defined Phase 2 (Expansion): 5 remaining domain prompt sets, KB articles, usage analytics
- Phase 1 estimate: ~352 hours (with 20% risk buffer)
- Phase 2 estimate: ~84.5 hours base (pre-multiplier)
- Total project estimate: ~516 hours (with all multipliers + 20% risk buffer)
- 8-week Phase 1 timeline, 4-week Phase 2 timeline
- 5 new scope-specific risks identified (R-009 through R-013)
- Explicit exclusions documented (13 items out of scope)
- Awaiting HITM approval to advance to Planning

## 2026-04-14 — Complete 8-Object Schema Trace

- Expanded schema trace from 4 objects to **all 8 Atlas AI Companion objects** using Record Browser + SuiteQL
- Added `CUSTOMRECORD_ATLAS_AICOMP_COPYACTION` (Copy Action) — usage log for copy/send events, FK to Prompts + Employee
- Added `CUSTOMRECORD_ATLAS_AICOMP_SETTINGS` (Settings) — AI provider config with `claude_url` and `chatgpt_url`
- Added `CUSTOMLIST_ATLAS_AICOMP_PROMPT_CAT` (Category) — full 7-value list, confirmed LOCKED, queryable via SuiteQL
- Added `CUSTOMLIST_ATLAS_AICOMP_PROMPT_IND` (Industry) — full 39-value list, confirmed LOCKED, queryable via SuiteQL
- Documented complete Join Map (all FK relationships between 8 objects)
- Updated object model diagram, "How It Works" flow, and implications sections
- Both Copy Action and Settings have 0 records in sandbox (not yet configured/used)

## 2026-04-14 — Live Discovery: Roles are Extensible

- **Finding:** `customrecord_atlas_aicomp_prompt_roles` is a custom record type with a "+" button to create new records in Prompt Studio. Roles are NOT a fixed bundle-locked list of 14 values.
- **Impact:** We can create Crafted-specific roles (Distiller, Cellar Master, Production Manager) instead of mapping to generic roles. R-008 (role mapping gap) potentially resolved. G-007 resolution updated.
- **Confirmed:** Categories and Industries are custom lists (locked, not extensible). Only Roles are extensible.
- **Also discovered:** `customlist_atlas_aicomp_mapping_method` — at least "AI Mapped" value. Used by Role Mapper Config.
- R-008 (role mapping gap) resolved. G-007 resolution updated. Crafted-specific roles added as deliverable P-001a.
- Updated CLAUDE.md, ADR-001, discovery document, scope document, gate checkpoint log.
