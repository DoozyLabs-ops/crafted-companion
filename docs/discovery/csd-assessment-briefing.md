# Briefing Document: Cognitive Systems Design Assessment for Crafted Companion v2

**Date:** 2026-04-16
**Prepared by:** Luke Hood / Claude (Opus 4.6)
**Purpose:** Full-context briefing capturing the analysis of Tim Dietrich's Cognitive Systems Design (CSD) framework against the Crafted Companion v2 project, including three advisory perspectives, independent research, and a CPO-level product decision. Written to be self-contained — any reader or AI model receiving this document should have complete context to engage with the decision.

---

## Table of Contents

1. [Project Context: What Crafted Companion v2 Is](#1-project-context)
2. [Source Material: Tim Dietrich's Cognitive Systems Design](#2-source-material)
3. [Advisory Perspective 1: Product Developer Assessment](#3-product-developer)
4. [Advisory Perspective 2: Senior AI & Prompt Engineer Assessment](#4-prompt-engineer)
5. [Independent Research Findings](#5-research)
6. [CPO Decision](#6-decision)
7. [Source Files Referenced](#7-sources)

---

## 1. Project Context: What Crafted Companion v2 Is {#1-project-context}

### Company & Product

**Doozy Solutions** builds **Crafted ERP**, a vertical ERP extension for NetSuite serving distilleries, wineries, and breweries. **Crafted Intelligence** is the AI analytics layer — a suite of 53 Custom Tool Scripts across 7 packages that expose Crafted ERP data through NetSuite's AI Connector (MCP), enabling AI assistants (Claude, ChatGPT) to query, analyze, and report on operations data.

### The v2 Redesign

Crafted Companion v2 is a **ground-up redesign** of how AI prompts are delivered to users. It retires the v1 "Prompt Engine" (a parallel shadow system invisible to Oracle's native UI) and rebuilds everything natively on Oracle's AI Companion framework.

**v1 Problem:** The Prompt Engine ran as a proprietary system with its own custom records, its own tools (12 of them), its own discovery mechanism, and a full 13-section governed playbook framework. Users had to know the Prompt Engine existed and how to invoke it. It was invisible to Oracle's Companion Library — the standard UI where NetSuite users discover AI prompts.

**v2 Solution:** Crafted prompts appear natively in Oracle's Companion Library alongside Oracle's own prompts. A custom extension record (`customrecord_dz_prompt_meta`) links to each Oracle prompt and carries all orchestration metadata. A UIF SPA Suitelet provides domain/edition filtering that Oracle's generic UI lacks. 4 focused tools replace 12.

### Architecture (from ADR-001)

```
USER INTERFACE LAYER
  Oracle Companion Library (bundle-locked)  |  Crafted Companion Library (UIF SPA)
                    |                                         |
PROMPT STORAGE LAYER
  customrecord_atlas_aicomp_prompts (Oracle's — prompt text, category, roles)
                    |  FK
  customrecord_dz_prompt_meta (Ours — domain, toolset, tool_chain, steps,
    edition, params, safety_rules, governance, artifact, version, status)
                    |
ORCHESTRATION LAYER
  getPromptMeta — AI's first call for any Crafted prompt
                    |
COMPANION TOOLS
  getPromptMeta | seedPrompt | updatePrompt | logExecution | detectAccountConfig
                    |
DATA TOOL LAYER (53 tools, retained unchanged)
  Barrel Intelligence (8) | Lot Profitability (7) | Inventory & Supply (9)
  Compliance & Audit (8)  | MRP Intelligence (6)  | Batch & Genealogy (3)
                    |
ORACLE PLATFORM
  MCP Connector | AI Companion SuiteApp | NetSuite REST API
```

**Source:** `docs/specs/ADR-001-companion-native-architecture.md`

### How the AI Executes a Crafted Prompt

1. User selects a prompt from the Companion Library (or pastes it into an AI chat)
2. Prompt text includes a header: `[Crafted Prompt #103 — call getPromptMeta(103) first]`
3. AI calls `getPromptMeta(promptId: 103)` — gets full orchestration context
4. AI reads `governance` level to determine behavior tier
5. AI reads `params` to request any required user input
6. AI calls `detectAccountConfig` if edition-aware logic is needed
7. AI executes `steps` in order, respecting conditions and dependencies
8. AI generates artifact if `artifact: true`
9. AI calls `logExecution` to record the run

**Source:** `CLAUDE.md` lines 297-308, `skills/crafted-companion-instructions/SKILL.md` lines 40-57

### Extension Record — The Orchestration Metadata

Each Crafted prompt has an extension record carrying:

| Field | Purpose |
|-------|---------|
| `domain` | Crafted domain (Barrel Ops, Lot Profitability, etc.) |
| `toolset` | Primary toolset script ID |
| `tool_chain` | Ordered tool sequence (human-readable) |
| `entry_tool` | First tool to call |
| `steps` | JSON — ordered steps with call, purpose, condition, depends_on |
| `tool_deps` | JSON — required toolsets that must be deployed |
| `edition` | Distillery, Winery, Brewery, or Cross-Edition |
| `edition_notes` | Edition-specific behavior guidance |
| `params` | JSON — parameter schemas with types, hints, tool mappings |
| `safety_rules` | JSON array — non-hallucination and data quality rules |
| `governance` | Tier: Minimal, Standard, Governed, Supervised |
| `artifact` / `artifact_type` | Whether/what kind of visual artifact to generate |
| `version` | Semantic version of the extension record |
| `status` | Active, Draft, Deprecated, Testing |

**Source:** `CLAUDE.md` lines 240-264

### Governance Model

| Level | Description | AI Behavior |
|-------|-------------|-------------|
| Minimal | Single tool, read-only, low risk | Execute directly, format result |
| Standard | 2-3 tool chain, moderate analysis | Follow tool chain, apply edition logic, generate artifact if flagged |
| Governed | Complex multi-tool with safety checks | Full orchestration: validate params, detect edition, execute steps, apply safety rules, flag anomalies |
| Supervised | High-impact (creates/updates records) | Require user confirmation before each write, log execution |

**Source:** `CLAUDE.md` lines 288-296, `docs/specs/ADR-001-companion-native-architecture.md` lines 222-229

### Current Safety Rules — What They Look Like

Example from the Barrel Cost Trace prompt (prompt #103):

```json
"safety_rules": [
  "Never fabricate barrel costs — all values from getBarrelCostTrace",
  "Flag barrels with zero cost as data quality issues",
  "If barrel not found, suggest searchItems first"
]
```

These are non-hallucination guardrails — they tell the AI what NOT to do. They do not encode analytical reasoning patterns or domain expertise about HOW to interpret results.

**Source:** `CLAUDE.md` lines 280-286, `docs/specs/ADR-001-companion-native-architecture.md` lines 183-196

### The SKILL.md — Global AI Instructions

The `skills/crafted-companion-instructions/SKILL.md` serves as the system-level instruction for any AI working with Crafted ERP. It contains:

- A decision tree routing queries to Crafted vs. standard NetSuite paths
- Tool selection priority (Crafted tools first, then standard NetSuite)
- Per-domain tool tables with orchestration notes
- Edition awareness rules (proof gallons for distillery, gallons for winery, etc.)
- Governance level behavior definitions
- Global safety rules ("Never fabricate data", "Never assume IDs", "Flag data quality issues")
- Number formatting, hyperlink patterns, artifact thresholds, design tokens
- SuiteQL safety guardrails

**Source:** `skills/crafted-companion-instructions/SKILL.md` (full file, 359 lines)

### Project Scale & Status

- **37 prompts seeded** (12 barrel intelligence deployed, rest planned)
- **60-84 total prompts** planned across 6 domains
- **53 existing data tools** retained unchanged
- **Phase 1 (MVP):** ~352 hours — SDF objects, 4 companion tools, UIF SPA, barrel extension records, v1 retirement
- **Phase 2 (Expansion):** ~84.5 hours — 5 remaining domain prompt sets
- **50 task chunks** across 5 phases, 17 sessions, 5 HITM gates
- **Current status:** Planning complete, Development gate pending

**Source:** `docs/specs/scope-document.md`, `docs/task_plan.md`

### What the Prompt Content Looks Like

Example — Barrel Cost Trace prompt (one of 12 barrel prompts):

```
Trace the complete cost history for barrel [BARREL NUMBER].

Show me:
1. The empty barrel acquisition cost
2. Fill costs (liquid + barrel components)
3. Every posting transaction in chronological order with running cost balance
4. Current total value and cost per proof gallon (distillery) or cost per gallon (winery)

If the barrel has been harvested, include the angel's share analysis: original PG vs.
harvest PG, loss percentage, and final cost per PG at harvest.
```

Tool chain: `getBarrelProfile -> getBarrelCostTrace`
Edition note: "Angel's share and cost-per-PG are distillery only. Winery shows cost-per-gallon."

The prompt tells the AI WHAT to fetch. It does not tell the AI HOW to reason about the results — what patterns to look for, what might indicate a data quality issue vs. a real cost event, or when the numbers might be misleading.

**Source:** `prompts/barrel-intelligence/barrel-intelligence-prompts.md` lines 99-120

### v1 to v2 Simplification — Important Context

The v1 Prompt Engine used 13-section governed playbooks with:
- Identity & Role section
- Data Requirements section
- Retrieval Protocol section
- Data Interpretation section
- Verification Tests section
- HITM Controls section
- Non-Hallucination section
- And 6 more sections per playbook

v2 deliberately simplified this because the overhead of the full 13-section framework on every prompt "added complexity without proven value." ADR-001 explicitly notes: "Drops v1's confidence scoring and verification pass rate (those were governance overhead that added complexity without proven value)."

This is relevant context because CSD would push back toward v1-level complexity.

**Source:** `docs/specs/ADR-001-companion-native-architecture.md` lines 35-36, concept migration map

---

## 2. Source Material: Tim Dietrich's Cognitive Systems Design {#2-source-material}

### Articles Reviewed

1. **"Designing How AI Thinks: An Introduction to Cognitive Systems Design"**
   - URL: https://timdietrich.me/blog/designing-how-ai-thinks/
   - Published: April 12, 2026
   - Type: Introductory blog post with case study

2. **"Cognitive Systems Design" (Full Resource Document)**
   - URL: https://timdietrich.me/resources/cognitive-systems-design/
   - Published: April 2026
   - Type: Comprehensive reference document with framework definition

### Core Thesis

Most AI prompts describe **what** to produce but not **how** to think. The fundamental gap is the absence of encoded reasoning — the expert judgment, skepticism patterns, and decision-making heuristics that distinguish genuine analysis from plausible-looking output. No matter how much models improve, they will not fix this on their own.

### The Opening Case Study

Dietrich reviewed a financial analysis system for evaluating acquisition targets. The output looked professional but on examination:
- Risk assessments flagged generic risks applicable to any company in any industry
- Financial projections extrapolated trends without questioning sustainability
- Strategic fit analysis used "strong synergies" without naming a single one
- The system never said "I don't have enough information"

The team tried switching models (GPT-4 to GPT-5 to Claude) with only marginal improvements. The real problem: prompts told the AI what to produce, not how a senior analyst actually reasons through an acquisition.

### CSD Formal Definition

> "Cognitive Systems Design is the practice of architecting how AI thinks — designing the reasoning structures, priority hierarchies, judgment frameworks, and behavioral constraints that enable an AI to advise, decide, and act the way a seasoned human expert would."

### Five Areas of Practice

| Area | Description |
|------|-------------|
| Judgment externalization | Making tacit expertise explicit and executable |
| Epistemological engineering | Defining how claims are validated and confidence is calibrated |
| Failure mode architecture | Cataloguing how outputs go wrong and building structural guardrails |
| Cognitive move encoding | Embedding reasoning patterns that distinguish expert from competent output |
| Quality system design | Defining what "good" looks like and enforcing it structurally |

### Six Components of a Cognitive System

CSD argues every well-designed cognitive system must contain all six:

**1. Role Definition with Behavioral Constraints**
A precise cognitive stance — values, priorities, non-negotiable behaviors. "The system's character, not its job title."

**2. Structured Methodology with Domain-Specific Cognitive Moves**
Step-by-step expert reasoning, including the 3-5 cognitive moves that distinguish expert performance. These are the reasoning patterns that, when skipped, produce the most consequential errors.

**3. Epistemological Framework**
How the system handles uncertainty. Confidence levels, assumption labeling, explicit acknowledgment of what is known vs. inferred. "This is what makes the output trustworthy rather than just plausible."

**4. Anti-Pattern Library**
Explicit catalogue of how outputs go wrong — failure modes, shortcuts, hallucination patterns — with structural rules preventing them. Key insight: the most effective anti-patterns are derived from the domain's cognitive moves — each describes what output looks like when a critical reasoning step is skipped.

**5. Edge Case Handling**
Pre-built responses to predictable exceptions — what to do when data is unavailable, input is ambiguous, or the normal methodology doesn't apply.

**6. Self-Verification Protocol**
Built-in quality checklist applied to own output before delivery. For each cognitive move in the methodology, a corresponding verification item.

### Worked Example: Senior Data Scientist Expert System

| Component | Example |
|-----------|---------|
| Role | "Critical thinking partner who challenges flawed methodology — not a validation machine" |
| Methodology | Before recommending, trace the causal chain: what system generated this data, what variables are hidden, what second-order effects exist |
| Epistemology | HIGH: proceed with recommendation. MEDIUM: proceed but name verification steps. LOW: do not recommend — name who resolves the uncertainty |
| Anti-Pattern | "The Confident Shrug: giving a precise recommendation when performance difference is within noise" |
| Edge Cases | User presents flawed analysis: challenge directly. User corrects you: acknowledge and flag cascade effects |
| Verification | "Causal model articulated. Single points of failure identified. Assumptions examined at surface, implicit, and foundational layers" |

### CSD's Defensibility Argument

- **Scarcity:** Very few can design cognitive architecture. Gap between "good prompt" and "cognitive system" equals gap between coder and architect.
- **Depth:** A prompt can be copied in minutes. A cognitive system requires deep expertise. "Someone can copy the prompt. They cannot copy the judgment."
- **Leverage:** Once built, produces expert-quality output indefinitely.
- **Durability:** More capable models benefit MORE from well-designed cognitive architecture.

### Intellectual Lineage

CSD synthesizes five established disciplines:

| Source | Inherited | CSD Added |
|--------|-----------|-----------|
| Cognitive Science | Mental models, naturalistic decision-making | Turns descriptions into engineering specs |
| Knowledge Engineering | 1980s expert systems — capturing domain expertise | Achieves comparable depth in days via AI |
| Systems Design | Component thinking, failure mode analysis | Applies to probabilistic cognitive systems |
| Human Factors | Human-system interaction, error patterns | Designs systems that reason LIKE humans |
| Prompt Engineering | Instruction structure shapes AI behavior | Moves from individual interactions to complete systems |

### Stated Limitations

- Requires deep design judgment and domain understanding
- Expert systems don't replace human judgment on novel situations outside their architecture
- The methodology improves only through active practice

---

## 3. Advisory Perspective 1: Product Developer Assessment {#3-product-developer}

### Overlap: What Crafted Companion Already Does

| CSD Component | Crafted Companion Equivalent | Coverage |
|---|---|---|
| Structured Methodology | `steps` JSON, `tool_chain`, `entry_tool` | Strong |
| Role Definition | SKILL.md decision tree, governance tiers | Moderate |
| Anti-Patterns (partial) | `safety_rules` field | Thin |
| Edge Case Handling | `getPromptMeta` error handling | Technical only |

### Gaps Identified

**1. No Domain-Specific Cognitive Moves.** Prompts tell the AI what tools to call but not how to think about results. Example: when cost-per-PG spikes, a senior distillery finance person would check volume change first (angel's share concentrating cost), but the AI might present the spike at face value.

**2. No Epistemological Framework.** When `getBarrelValuation` returns numbers, the AI presents them without distinguishing posting transaction actuals from derived estimates like angel's share calculations.

**3. Safety Rules Are Binary, Not Analytical.** "Don't fabricate" prevents the worst failures but doesn't prevent analytically misleading outputs like averaging age across a diverse portfolio.

**4. No Self-Verification.** `logExecution` tracks success/failure but doesn't verify output quality.

### Product Developer Recommendations

1. Enrich `safety_rules` for governed/supervised prompts with analytical anti-patterns
2. Add a `data_confidence` or `interpretation_notes` field to the extension record
3. Apply cognitive moves via `edition_notes` and prompt text (no new schema)
4. Self-verification as governance tier enhancement
5. Phase 2 is the right timing, not Phase 1

---

## 4. Advisory Perspective 2: Senior AI & Prompt Engineer Assessment {#4-prompt-engineer}

### Core Argument: The Architecture Changes Everything

CSD was designed for systems where the AI generates analysis from scratch. Crafted Companion is a **tool-calling orchestration system** where the AI fetches real data from NetSuite. The worst CSD failure mode (fabricated analysis) is already architecturally prevented.

### Component-by-Component Technical Assessment

**Role Definition — Already handled correctly.** The SKILL.md defines a global role. Per-prompt role variations would conflict with the system prompt. Governance tiers already modulate behavior. CSD adds nothing.

**Structured Methodology / Cognitive Moves — Partially relevant.**
- LLMs already carry substantial analytical reasoning. Common patterns (trend analysis, variance decomposition) don't need encoding.
- Explicit cognitive moves help for COUNTERINTUITIVE or NICHE domain knowledge the model wouldn't have.
- Overly prescriptive reasoning instructions can REDUCE quality by constraining the model to the prescribed path.
- Right approach: encode 2-3 genuinely niche insights per domain, not comprehensive reasoning frameworks.

**Epistemological Framework — Overengineered for tool-calling.**
- LLMs are notoriously bad at self-calibrating confidence unless given explicit, concrete criteria.
- In tool-calling systems, confidence is about DATA PROVENANCE, not AI reasoning.
- Practical version: 1-2 data provenance sentences per tool ("posting transaction actuals" vs. "derived estimates"), not a confidence framework.

**Anti-Pattern Library — Concept is sound, per-prompt implementation is wrong.**
- Universal AI anti-patterns ("don't hallucinate") have diminishing returns. Long "don't" lists can paradoxically increase unwanted behavior.
- Domain-specific anti-patterns are valuable when they encode knowledge the model lacks.
- Token budget matters: 84 prompts x 5-8 anti-patterns x 30-50 words = enormous authoring and maintenance burden.
- Right approach: centralized reference document consulted during authoring, 2-3 specific rules selected per governed prompt.

**Edge Case Handling — Already adequate.** Technical edge cases in code, data edge cases in safety_rules, interaction edge cases handled by model capabilities. Most prompts are fire-and-forget (not back-and-forth advisory conversations).

**Self-Verification — Marginal value at significant cost.** Adds latency in MCP round-trip architecture. Best reserved for 3-5 most complex prompts as terminal step in `steps` array.

### Critical Angles CSD Misses

**Token Economics:** Every extension record field is consumed at runtime. Rich cognitive frameworks per prompt could 2-3x context consumption without proportionate quality gains.

**Centralized vs. Distributed Instructions:** SKILL.md (global) + lean per-prompt (extension record) is the right split for 84 prompts. CSD implies heavy per-prompt architecture, which causes duplication, contradiction, and maintenance burden.

**Model Capability Trajectory:** As models improve, they're better at analytical reasoning WITHOUT explicit instructions, making cognitive moves less necessary. The value shifts from "teach the model how to think" toward "tell the model what to prioritize."

**The v1 to v2 Trajectory:** v1 had 13-section governed playbooks (closer to CSD's full framework). v2 deliberately simplified because the overhead wasn't justified. CSD would push back toward v1 complexity.

### Prompt Engineer Recommendations

**Do:**
1. Write a centralized Domain Reasoning Guide (~15-20 patterns across all domains)
2. Enrich safety_rules for governed/supervised prompts only (2-3 analytical rules)
3. Add data provenance notes to edition_notes (1-2 sentences)
4. Enhance SKILL.md domain sections with 2-3 highest-impact reasoning patterns per domain
5. For 3-5 most complex prompts, add terminal verification step in `steps` array

**Don't:**
1. Add new schema fields
2. Add epistemological frameworks
3. Add per-prompt role definitions
4. Apply CSD to minimal/standard prompts
5. Duplicate SKILL.md content in extension records

---

## 5. Independent Research Findings {#5-research}

### 5.1 Reasoning Frameworks in Prompts — Empirical Evidence

**Chain-of-Thought (CoT) research is the closest studied analog to CSD's "cognitive moves."**

**Wei et al. (2022)** — "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models" demonstrated CoT improved PaLM 540B to state-of-the-art on GSM8K math benchmark.
- Source: https://arxiv.org/abs/2201.11903

**ACL 2023 Study** — "Towards Understanding Chain-of-Thought Prompting: An Empirical Study of What Matters" found that prompting with *invalid* reasoning steps achieves 80-90% of CoT performance. **The structure and relevance of reasoning scaffolding matters more than its logical correctness.**
- Source: https://aclanthology.org/2023.acl-long.153/

**Wharton Prompting Science Report 2 (June 2025)** — "The Decreasing Value of Chain of Thought in Prompting" tested across 8 models:
- Non-reasoning models: CoT improved Gemini Flash 2.0 by +13.5%, Sonnet 3.5 by +11.7%
- Reasoning models (o3-mini, o4-mini): gains were 2.9-3.1% — marginal
- Gemini Flash 2.5 actually DECLINED by -3.3% with CoT
- CoT requests took 35-600% longer
- **Recommendation: abandon "universal CoT" and let models leverage built-in reasoning**
- Source: https://gail.wharton.upenn.edu/research-and-insights/tech-report-chain-of-thought/

**Springer survey of 90 studies (2025)** on agentic AI found typed routing to specialized memory layers significantly improved contradiction resolution versus flat memory stores.
- Source: https://link.springer.com/article/10.1007/s10462-025-11422-4

**Bottom line:** Structured reasoning frameworks help but with diminishing returns as models internalize reasoning. Structure/relevance matters more than logical correctness.

### 5.2 Multi-Prompt AI Systems at Scale

**Uber's Prompt Engineering Toolkit (2024-2025)** — Production toolkit with centralized prompt template management, version control, evaluation frameworks. Two-stage lifecycle: development (LLM exploration, prompt iteration, evaluation) and productionization (deployment, tracking, monitoring).
- Source: https://www.uber.com/en-GB/blog/introducing-the-prompt-engineering-toolkit/

**Industry consensus on prompt management:**
- Version control with semantic versioning and immutable versions
- Lifecycle states: draft -> active -> deprecated -> archived
- CI gates: merge blocked unless schemas pass, smoke tests pass, no metric regressions
- Observability minimum: timestamp, prompt_id, version, model, tokens, latency, cost
- Source: https://www.paulserban.eu/blog/post/prompt-library-design-patterns-and-anti-patterns-every-ai-engineer-should-know/

**Key metric:** Prompt quality variations can create accuracy differences of up to 76 points. Prompt engineering accounts for 30-40% of AI application development time.
- Source: https://dasroot.net/posts/2026/02/prompt-versioning-devops-ai-driven-operations/

### 5.3 Anti-Pattern Libraries — Empirical Evidence

**Endor Labs study** — The "anti-pattern avoidance" technique (instructing LLMs to avoid specific Common Weakness Enumerations) **reduced weakness density in generated code by 64% (GPT-3) and 59% (GPT-4)** compared to baseline prompts. Zero-shot, straightforward: list the specific anti-patterns to avoid. **This is the strongest quantitative evidence for the anti-pattern concept.**
- Source: https://www.endorlabs.com/learn/anti-pattern-avoidance-a-simple-prompt-pattern-for-safer-ai-generated-code

**Negative prompting research** — Empirical studies show negative prompting enhances safety and output fidelity. "Contrastive CoT" juxtaposes correct and incorrect rationales, enabling models to infer both desired and undesired reasoning patterns.
- Source: https://www.emergentmind.com/topics/negative-prompting

**Critical caveat — prompt underspecification paper** warns that "adding as many requirements as possible to the prompt" (including exhaustive anti-pattern lists) is itself an anti-pattern that leads to over-complicated prompts and does not scale.
- Source: https://arxiv.org/html/2505.13360v1

### 5.4 Tim Dietrich's CSD — External Validation Status

**CSD is new, niche, and self-published — not an established methodology.**

- Published April 2026 on personal website (timdietrich.me)
- No citations, academic references, or peer-reviewed sources in the documentation
- No independent reviews, community discussions, or adoption evidence found
- No published book — documented methodology on website only
- Dietrich has 25+ years in business software, 8 on NetSuite, runs SuiteStep
- Built SuiteQL Query Tool and SuiteAPI (open tools used by NetSuite community)
- Claims to have built AI systems for hundreds of PE-backed finance teams
- **Assessment:** Components are individually sensible, map to established disciplines (knowledge engineering, cognitive science). The synthesis is reasonable but unvalidated. Should be evaluated on intrinsic merit, not external authority.
- Sources: https://timdietrich.me/, https://timdietrich.me/resources/cognitive-systems-design/

### 5.5 MCP/Tool-Calling vs. Pure Text Generation

**Anthropic's official guidance differs significantly for tool-calling agents.**

**"Writing Effective Tools for Agents" (Anthropic Engineering):**
- Tool names, descriptions, arguments, and error messages ARE prompts for the calling agent
- Every character in a tool description competes for the model's attention
- Semantic clarity in parameters substantially improves retrieval precision
- Error messages must be prompt-engineered for actionability
- Source: https://www.anthropic.com/engineering/writing-tools-for-agents

**"Effective Context Engineering for AI Agents" (Anthropic Engineering):**
- "Find the smallest set of high-signal tokens that maximize the likelihood of some desired outcome"
- Just-in-time context retrieval rather than pre-loading all data
- Progressive disclosure — agents incrementally discover relevant context
- Multi-agent architectures with specialized sub-agents returning 1,000-2,000 token summaries
- Source: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

**Anthropic's Multi-Agent Research System:**
- Studied how skilled humans approach research tasks and encoded those strategies
- Each subagent needs: objective, output format, guidance on tools/sources, clear task boundaries
- Bad tool descriptions send agents down completely wrong paths
- Manual testing found hallucinations that automated evals missed
- Source: https://www.anthropic.com/engineering/multi-agent-research-system

**Anthropic's Claude 4 Best Practices:**
- Use XML tags to structure prompts unambiguously
- 3-5 diverse examples for best results (few-shot)
- Place long documents at TOP, query/instructions at BOTTOM (up to 30% quality improvement)
- Positive examples work better than negative examples
- Provide context/motivation behind instructions — Claude generalizes from explanations
- Curate a minimal viable set of tools; "bloated tool sets" cause ambiguous decisions
- Source: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices

### 5.6 Key Research Takeaways

1. **Reasoning frameworks help but with diminishing returns** as models internalize reasoning. For modern models, explicit CoT adds 2-3% at 20-80% time cost.
2. **Anti-pattern avoidance is empirically validated** — 59-64% improvement when specific patterns are named (Endor Labs). But exhaustive lists degrade performance (underspecification paper).
3. **CSD is unvalidated externally** — no citations, no peer review, no adoption evidence. Sound concepts, no empirical basis.
4. **Agent prompting is genuinely different** from text generation — tool descriptions ARE prompts, context budgeting matters, minimal tool sets outperform bloated ones.
5. **Anthropic recommends** structured prompts with positive examples, minimal context, and progressive disclosure — not heavy cognitive frameworks.

---

## 6. CPO Decision {#6-decision}

### Executive Summary

**We are not adopting CSD as a methodology.** We are taking one validated insight — that domain-specific analytical reasoning patterns improve AI output quality — and implementing it within our existing architecture through three specific, bounded actions.

### The Reasoning

**CSD identifies a real gap:** Our prompts tell the AI what data to fetch but not how to reason about it. The distance between "here's your data, formatted" and "here's your data and here's what it means" is real and worth closing.

**But CSD's implementation model is wrong for our system:**
- Our tool-calling architecture already prevents the worst failure mode CSD targets (fabricated analysis)
- Full six-component frameworks per prompt would reverse our v1-to-v2 simplification (which we made for good reasons)
- The research shows diminishing returns from explicit reasoning frameworks as models improve
- Token economics and maintenance burden across 84 prompts don't justify it
- CSD itself is unvalidated — sound concepts, no empirical basis

**The right approach is surgical, centralized, and tiered.**

### Three Approved Actions

#### Action 1: Domain Reasoning Guide

**What:** A single reference document at `docs/prompt-authoring/domain-reasoning-guide.md` cataloguing domain-specific analytical patterns across all 6 Crafted domains.

**Structure per domain:**
- 3-5 "What an expert notices" patterns (niche interpretive moves the model wouldn't do unprompted)
- 3-5 "Where outputs go wrong" patterns (specific analytical traps, concrete scenarios)
- 1-2 data provenance notes (which tool outputs are actuals vs. estimates)

**Purpose:** Prompt authors consult this during Phase 2 authoring. It is a reference document, not embedded in prompts wholesale.

**Effort:** ~8 hours. Compounds over time.

**Timing:** Before Phase 2 prompt authoring begins.

#### Action 2: Enrich SKILL.md Domain Sections

**What:** Expand the SKILL.md's per-domain sections with 2-3 highest-impact reasoning patterns from the Domain Reasoning Guide.

**Why:** The SKILL.md is the system-level instruction always in context. It's the right home for global analytical guidance — applied once, maintained once, consistent, no duplication across 84 prompts. Adds ~200 tokens total.

**Timing:** When we author Phase 2 domain prompts.

#### Action 3: Richer Safety Rules for Governed/Supervised Prompts Only

**What:** Governed/supervised prompts get 4-6 safety_rules including 2-3 analytical anti-patterns from the Domain Reasoning Guide. Minimal/standard prompts stay at 1-2 simple guardrails.

**The math:** ~15-20 governed/supervised prompts get richer rules. ~60+ minimal/standard prompts stay lean. This is the right 80/20.

**Timing:** Applied as a standard during Phase 2 prompt authoring.

### What We Are NOT Doing

1. **Not adding new schema fields** — No `confidence_notes`, `anti_patterns`, or `verification_checklist`. Existing fields carry everything worth carrying.
2. **Not adding self-verification steps** — Marginal value at significant latency cost. If a specific governed prompt needs it, use a terminal step in the `steps` array.
3. **Not adopting CSD as a methodology** — Not referencing it in docs, not structuring work around its components.
4. **Not changing Phase 1 architecture or timeline** — Infrastructure is sound.
5. **Not applying cognitive architecture to minimal/standard prompts** — 70%+ of prompts don't need it.

### Success Criteria (6 months post-Phase 2)

1. Governed/supervised prompts produce analytical interpretation, not just data presentation
2. Domain Reasoning Guide updated at least twice from real execution learnings
3. No more than 15% increase in per-prompt authoring time
4. No measurable increase in prompt execution latency
5. Zero contradictions between SKILL.md and per-prompt safety_rules

---

## 7. Source Files Referenced {#7-sources}

### Crafted Companion Project Files

All paths relative to: `/Users/lukehood/Documents/Claude/Projects/Doozy Labs Custom Tools Scripts/packages/crafted-companion/`

| File | Description | Key Content |
|------|-------------|-------------|
| `CLAUDE.md` | Project governance, dev rules, extension record field table, Atlas constraints | Full project spec — role, architecture, field tables, governance, anti-stall rules |
| `README.md` | Project overview | Architecture diagram, v1 retirement status, deployment instructions |
| `INIT_PROMPT.md` | Claude Code initialization prompt | Session startup instructions, what's done, what's next |
| `docs/specs/ADR-001-companion-native-architecture.md` | Architecture Decision Record | v1-to-v2 concept migration map, layer diagram, governance tiers, companion toolset, SPA design |
| `docs/specs/scope-document.md` | Scope document (APPROVED) | Phase 1/2 deliverables, effort estimates (~352h Phase 1, ~84.5h Phase 2), timeline, risks |
| `docs/task_plan.md` | Chunked task plan | 50 chunks, 5 phases, 17 sessions, dependency map, critical path, progress tracker |
| `docs/discovery/discovery-document.md` | Discovery document (APPROVED, v2.0) | Business context, current-state process maps, requirements, gap analysis, risk register |
| `docs/discovery/atlas-ai-companion-schema-trace.md` | Oracle AI Companion schema trace | 8 objects mapped: 5 custom records, 3 custom lists, all fields, joins, constraints |
| `docs/discovery/companion-prompt-extension-design.md` | Extension record design | Original design for extension record fields and embedded meta block |
| `prompts/barrel-intelligence/barrel-intelligence-prompts.md` | Barrel domain prompt definitions | 14 prompts with tool chains, parameters, edition notes, artifact triggers |
| `skills/crafted-companion-instructions/SKILL.md` | AI system-level instructions | Decision tree, tool selection, domain tables, governance behaviors, safety rules, formatting |
| `src/FileCabinet/SuiteScripts/DoozyTools/companion-tools/dz_ct_companion_schema.json` | Companion tool schemas | JSON schemas for getPromptMeta, seedPrompt, updatePrompt, logExecution |
| `imports/seed-data.json` | Seed data for companion prompts | Pre-built prompt data for seeding into NetSuite |
| `audit-trail/gate_checkpoint_log.md` | Stage gate approvals | Gate checkpoint history |
| `audit-trail/change_log.md` | Change history | Change log entries |

### Parent Project File

| File | Description |
|------|-------------|
| `/Users/lukehood/Documents/Claude/Projects/Doozy Labs Custom Tools Scripts/CLAUDE.md` | Crafted Intelligence master CLAUDE.md — repository structure, SDF packages, critical dev rules, AI orchestration pattern |

### External Sources — CSD Articles

| Source | URL | Type |
|--------|-----|------|
| Tim Dietrich — "Designing How AI Thinks" | https://timdietrich.me/blog/designing-how-ai-thinks/ | Blog post (April 12, 2026) |
| Tim Dietrich — "Cognitive Systems Design" | https://timdietrich.me/resources/cognitive-systems-design/ | Reference document (April 2026) |

### External Sources — Research

| Source | URL | Key Finding |
|--------|-----|-------------|
| Wei et al. — Chain-of-Thought Prompting (2022) | https://arxiv.org/abs/2201.11903 | CoT improves reasoning in LLMs |
| ACL 2023 — Understanding CoT | https://aclanthology.org/2023.acl-long.153/ | Structure matters more than logical correctness |
| Wharton — Decreasing Value of CoT (2025) | https://gail.wharton.upenn.edu/research-and-insights/tech-report-chain-of-thought/ | Modern models gain only 2-3% from explicit CoT at 20-80% time cost |
| Springer — Agentic AI Survey (2025) | https://link.springer.com/article/10.1007/s10462-025-11422-4 | Typed routing to specialized memory improves agent performance |
| Nature — Fast/Slow/Metacognitive AI (2025) | https://www.nature.com/articles/s44387-025-00027-5 | Combined decision modalities yield higher quality with less resources |
| Endor Labs — Anti-Pattern Avoidance | https://www.endorlabs.com/learn/anti-pattern-avoidance-a-simple-prompt-pattern-for-safer-ai-generated-code | 59-64% reduction in code weaknesses from naming specific anti-patterns |
| Negative Prompting Research | https://www.emergentmind.com/topics/negative-prompting | Negative prompting enhances safety and fidelity |
| arXiv — Prompt Underspecification | https://arxiv.org/html/2505.13360v1 | Exhaustive requirements in prompts degrade performance |
| Uber — Prompt Engineering Toolkit | https://www.uber.com/en-GB/blog/introducing-the-prompt-engineering-toolkit/ | Enterprise prompt management with version control and evaluation |
| Paul Serban — Prompt Library Patterns | https://www.paulserban.eu/blog/post/prompt-library-design-patterns-and-anti-patterns-every-ai-engineer-should-know/ | Architecture for mature prompt libraries at scale |
| DasRoot — Prompt Versioning | https://dasroot.net/posts/2026/02/prompt-versioning-devops-ai-driven-operations/ | Prompt quality variations create up to 76-point accuracy differences |
| Paxrel — AI Agent Prompt Patterns | https://paxrel.com/blog-ai-agent-prompts | 8 documented anti-patterns for AI agents |
| Anthropic — Writing Effective Tools | https://www.anthropic.com/engineering/writing-tools-for-agents | Tool descriptions ARE prompts; semantic clarity improves precision |
| Anthropic — Context Engineering | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents | Smallest set of high-signal tokens; progressive disclosure |
| Anthropic — Multi-Agent Research | https://www.anthropic.com/engineering/multi-agent-research-system | Subagent architecture; manual testing catches what automated evals miss |
| Anthropic — Claude 4 Best Practices | https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices | XML structure, few-shot examples, positive over negative examples |
| Maxim AI — Prompt Management Platforms | https://www.getmaxim.ai/articles/top-5-prompt-management-platforms-in-2025-a-comprehensive-guide-for-ai-teams/ | 75% of enterprises projected to integrate GenAI by 2026 |
| Arize — Prompt Management Tools | https://arize.com/blog/top-5-ai-prompt-management-tools-of-2025/ | Enterprise prompt management ecosystem |
| SparkCo — Tool Calling Best Practices | https://sparkco.ai/blog/mastering-tool-calling-best-practices-for-2025 | Agent vs. text generation prompting differences |
| PromptHub — Agent Prompt Engineering | https://www.prompthub.us/blog/prompt-engineering-for-ai-agents | Agent-specific prompt patterns and memory management |

---

*End of briefing document.*
