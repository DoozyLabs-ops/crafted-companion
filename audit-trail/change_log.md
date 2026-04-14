# Change Log — Crafted Companion

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
