# Crafted Companion v2 — Claude Code Initialization Prompt

Copy everything below the line into Claude Code to start your first development session.

---

## Prompt

I'm starting development on **Crafted Companion v2** — a ground-up redesign that retires the v1 Prompt Engine and rebuilds prompt delivery natively on Oracle's AI Companion framework for Crafted ERP.

### What's been done (Discovery + Scoping + Planning — all complete and approved):

1. **Full schema trace** of Oracle's AI Companion SuiteApp — 8 objects mapped: 5 custom records (Prompts, Roles, Role Mapping, Copy Action, Settings) + 3 custom lists (Category, Industry, Mapping Method). See `docs/discovery/atlas-ai-companion-schema-trace.md`.

2. **Architecture Decision Record (ADR-001)** approved — companion-native architecture replacing the v1 Prompt Engine. Extension record (`customrecord_dz_prompt_meta`) links to Atlas prompts. 4 new companion tools replace 12 retired ones. UIF SPA Suitelet for domain-filtered browsing. See `docs/specs/ADR-001-companion-native-architecture.md`.

3. **Scope document** approved — Phase 1 MVP (~352 hrs): SDF objects, 4 companion tools, UIF SPA, barrel extension records, v1 retirement. Phase 2 expansion: 5 more domain prompt sets. See `docs/specs/scope-document.md`.

4. **Chunked task plan** produced — 50 chunks across 5 phases, 17 sessions, 5 HITM gates. See `docs/task_plan.md`.

5. **12 barrel intelligence prompts** already seeded in TSTDRV1912378 (IDs 101-109, 201-203).

6. **All 4 design questions resolved:** UIF SPA in Phase 1 (OQ-001), hard tool validation (OQ-002), params advisory for AI (OQ-003), update-in-place versioning (OQ-004).

7. **Roles are extensible** — `customrecord_atlas_aicomp_prompt_roles` is a custom record (not a locked list). 15 of 33 NS roles are unmapped. We'll create Crafted-specific roles (Distiller, Cellar Master, etc.).

### What needs to happen now:

We're at the **PLANNING → DEVELOPMENT** gate. The task plan is approved. Next step is **Session 1: Write SDF Object XML** (chunks FOUND-001 through FOUND-006).

Please:
1. Read `CLAUDE.md` to orient yourself on the project
2. Read `docs/task_plan.md` to see the full chunk breakdown
3. Review the gate checkpoint log (`audit-trail/gate_checkpoint_log.md`) for current status
4. Start on **Session 1** — write all SDF XML files for Phase 0 Foundation:
   - FOUND-001: `customlist_dz_pm_edition.xml` (4 values: Distillery, Winery, Brewery, Cross-Edition)
   - FOUND-002: `customlist_dz_pm_complexity.xml` (4 values: Minimal, Standard, Governed, Supervised)
   - FOUND-003: `customlist_dz_pm_status.xml` (4 values: Active, Draft, Deprecated, Testing)
   - FOUND-004: `customrecord_dz_prompt_meta.xml` (~20 fields, FK to Atlas prompts)
   - FOUND-005: `customrecord_dz_exec_log.xml` (~8 fields)
   - FOUND-006: `custtoolset_crafted_companion.xml` (toolset with both expose flags)

All XML goes in `src/Objects/`. Every field and list value needs an `<aidescription>` element (max 280 chars). ES5 only. No `enum` in schemas.

### GitHub repo initialization:

Before writing any code, initialize this as a git repo if it isn't already:
```
git init
git add -A
git commit -m "Initial commit: Discovery + Scoping + Planning artifacts"
```

Then create a feature branch for Phase 0:
```
git checkout -b phase-0/foundation-sdf-objects
```

### Key references:
- `CLAUDE.md` — project governance, dev rules, extension record field table, Atlas constraints
- `docs/task_plan.md` — full chunk breakdown with dependencies and session plan
- `docs/specs/scope-document.md` — deliverables and effort estimates
- `docs/specs/ADR-001-companion-native-architecture.md` — architecture decisions
- `docs/discovery/atlas-ai-companion-schema-trace.md` — complete Atlas schema (8 objects, all fields, all joins)
- `prompts/barrel-intelligence/barrel-intelligence-prompts.md` — existing barrel prompts

### Critical dev rules (from CLAUDE.md):
1. **ES5 only** — No async/await, const/let, template literals, arrow functions
2. **No `enum` in schemas** — NetSuite silently drops tools with enum
3. **Both expose flags** on toolset XML
4. **`aidescription` on every field and list value** (max 280 chars)
5. **Governance budget is 1,000** units per tool invocation
6. **Design first, code second** — confirm approach before writing code
7. **One file per chunk** — don't create multiple files in one response
