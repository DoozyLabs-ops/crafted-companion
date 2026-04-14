# Atlas AI Companion SuiteApp — Full Schema Trace

Account: TSTDRV1912378 (Distillery Demo)
Traced: 2026-04-14 (initial), 2026-04-14 (expanded with role mapping system), 2026-04-14 (complete 8-object model from Record Browser)
Source: SuiteQL inspection + inspectRecord + Record Browser + live sandbox inspection

---

## Overview

The **AI Connector Service Companion** is a bundled NetSuite SuiteApp (codename: **Atlas AI Companion**) that ships with the MCP Standard Tools SuiteApp. It provides a prompt library UI (Suitelet), role-based prompt filtering, usage analytics, and SDF-seeded prompt management. All objects use the prefix `atlas_aicomp`.

The SuiteApp's custom record types and custom lists don't appear in the `customrecordtype` or `customlist` SuiteQL metadata tables — they are **bundle-locked** (owned by Oracle's bundle), meaning their definitions are hidden from SuiteQL metadata queries even though the **data is fully queryable**.

### Complete Object Inventory (8 objects)

| # | Object ID | Type | Records | Purpose |
|---|-----------|------|---------|---------|
| 1 | `CUSTOMRECORD_ATLAS_AICOMP_PROMPTS` | Custom Record | 113 | Prompt store (100 Oracle + 13 Crafted) |
| 2 | `CUSTOMRECORD_ATLAS_AICOMP_PROMPT_ROLES` | Custom Record | 15 | Companion role taxonomy (EXTENSIBLE) |
| 3 | `CUSTOMRECORD_ATLAS_AICOMP_ROLE_MAPPING` | Custom Record | 33 | NS Role → Companion Role bridge table |
| 4 | `CUSTOMRECORD_ATLAS_AICOMP_COPYACTION` | Custom Record | 0 | Usage tracking log (copy/send events) |
| 5 | `CUSTOMRECORD_ATLAS_AICOMP_SETTINGS` | Custom Record | 0 | AI provider URL configuration |
| 6 | `CUSTOMLIST_ATLAS_AICOMP_PROMPT_CAT` | Custom List | 7 values | Prompt category taxonomy (LOCKED) |
| 7 | `CUSTOMLIST_ATLAS_AICOMP_PROMPT_IND` | Custom List | 39 values | Industry vertical taxonomy (LOCKED) |
| 8 | `CUSTOMLIST_ATLAS_AICOMP_MAPPING_METHOD` | Custom List | 4 values | How role mappings were determined (LOCKED) |

Plus **7 scripts** (1 Suitelet library, 1 Suitelet config, 1 User Event, 2 SDF Installation, 2 Scheduled).

---

## Complete Object Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AI COMPANION LIBRARY SUITELET                              │
│              (customscript_atlas_aicomp_prompt_library)                       │
│                                                                              │
│   Filters by: Role │ Category │ Industry │ Public/Private                   │
│   Actions: Copy to Clipboard │ Send to Claude │ Send to ChatGPT             │
└────────────────────────────────┬─────────────────────────────────────────────┘
                                 │ reads                reads
                                 ▼                      ▼
┌──────────────────────────────────────────────┐ ┌─────────────────────────────┐
│    [1] PROMPT STORE (20 fields)              │ │ [5] SETTINGS (12 fields)    │
│   customrecord_atlas_aicomp_prompts          │ │ customrecord_atlas_aicomp_  │
│        (113 records)                         │ │      settings (0 records)   │
│                                              │ │                             │
│ ├── name (title)                             │ │ ├── custrecord_..._         │
│ ├── prompt_text (body)                       │ │ │   claude_url (STRING)     │
│ ├── prompt_category ──→ [6] CAT LIST         │ │ ├── custrecord_..._         │
│ ├── prompt_subcat (free text)                │ │ │   chatgpt_url (STRING)    │
│ ├── prompt_roles ──→ [2] ROLES               │ │ └── (standard fields)       │
│ ├── prompt_inds ──→ [7] IND LIST             │ │                             │
│ ├── prompt_public (T/F)                      │ │ Purpose: AI provider base   │
│ ├── sdf_seeded (T/F)                         │ │ URLs for Send actions       │
│ ├── count_claude / count_chatgpt / count_copy│ └─────────────────────────────┘
│ └── (standard fields)                        │
└──────┬──────────────────────┬────────────────┘
       │ FK (prompt_ref)      │ multi-select (prompt_roles)
       ▼                      ▼
┌─────────────────────┐ ┌──────────────────────────────────────────────────────┐
│ [4] COPY ACTION     │ │ [2] ROLES (EXTENSIBLE) (11 fields)                   │
│  (14 fields)        │ │ customrecord_atlas_aicomp_prompt_roles (15 records)   │
│  (0 records)        │ │                                                       │
│                     │ │ ├── name (role title)                                │
│ ├── prompt_ref ──→  │ │ ├── promptrole_extid (SDF external ID)              │
│ │   [1] PROMPTS     │ │ └── (standard fields)                                │
│ ├── action_type     │ │                                                       │
│ │   (STRING)        │ │ 14 Oracle-seeded + 1 user-created                    │
│ ├── user ──→        │ │ EXTENSIBLE: "+" button in Prompt Studio              │
│ │   Employee        │ └───────────────────────┬──────────────────────────────┘
│ ├── datetime        │                         │ FK (prompt_role)
│ └── (std fields)    │                         ▼
│                     │ ┌──────────────────────────────────────────────────────┐
│ Purpose: Usage log  │ │ [3] ROLE MAPPING — THE BRIDGE (16 fields)            │
│ for copy/send       │ │ customrecord_atlas_aicomp_role_mapping (33 records)   │
│ events. Drives the  │ │                                                       │
│ count_* fields on   │ │ ├── ns_role_id (NS role internal ID)                 │
│ prompt records.     │ │ ├── ns_role_name (NS role display name)              │
└─────────────────────┘ │ ├── prompt_role ──→ [2] ROLES                        │
                        │ ├── map_confidence (0-95)                             │
                        │ ├── mapping_method ──→ [8] METHOD LIST               │
                        │ ├── employee_count (unused)                           │
                        │ └── (standard fields)                                 │
                        │                                                       │
                        │ 18 mapped / 15 UNMAPPED (confidence=0)               │
                        └───────────────────────┬──────────────────────────────┘
                                                │ FK (mapping_method)
       ┌────────────────────────────────────────┼───────────────────────┐
       ▼                                        ▼                       ▼
┌──────────────────┐ ┌───────────────────────────────┐ ┌────────────────────┐
│ [6] CATEGORY     │ │ [8] MAPPING METHOD            │ │ [7] INDUSTRY       │
│ (LOCKED, 7 vals) │ │ (LOCKED, 4 vals)              │ │ (LOCKED, 39 vals)  │
│ customlist_atlas │ │ customlist_atlas_aicomp_       │ │ customlist_atlas_  │
│ _aicomp_prompt   │ │  mapping_method               │ │ aicomp_prompt_ind  │
│ _cat             │ │                               │ │                    │
│                  │ │ 1: AI Mapped                  │ │ 1: All Industries  │
│ 1: Financial     │ │ 2: Keyword Matched            │ │ ...                │
│ 2: Visualizations│ │ 3: Manual Override            │ │ 17: Food & Bev     │
│ 3: Order to Cash │ │ 4: Exact Name Match           │ │ ...                │
│ 4: Item Mgmt     │ │                               │ │ 39: Wholesale Dist │
│ 5: Procure to Pay│ └───────────────────────────────┘ │                    │
│ 6: Manufacturing │                                   │ Not extensible.    │
│ 7: Sys Admin     │                                   └────────────────────┘
│                  │
│ Not extensible.  │
└──────────────────┘
```

### Join Map (all FK relationships)

| Source Record | Source Field | Target Record | Cardinality | Notes |
|---------------|-------------|---------------|-------------|-------|
| Prompts | `custrecord_atlas_aicomp_prompt_category` | Category List | N:1 | Locked list ref |
| Prompts | `custrecord_atlas_aicomp_prompt_roles` | Roles | N:M (multi-select) | Prompt visible to multiple roles |
| Prompts | `custrecord_atlas_aicomp_prompt_inds` | Industry List | N:M (multi-select) | Prompt tagged to multiple industries |
| Copy Action | `custrecord_atlas_aicomp_prompt_ref` | Prompts | N:1 | Which prompt was copied/sent |
| Copy Action | `custrecord_atlas_aicomp_user` | Employee | N:1 | Who performed the action |
| Role Mapping | `custrecord_atlas_aicomp_prompt_role` | Roles | N:1 | NS role → Companion role |
| Role Mapping | `custrecord_atlas_aicomp_mapping_method` | Mapping Method List | N:1 | How mapping was determined |
| Settings | `owner` | Employee | N:1 | Standard owner field |

---

## Record Type Details

### 1. `customrecord_atlas_aicomp_prompts` — Prompt Store

The core data record. Each row is one prompt template. 20 SuiteQL-accessible fields.

| Field ID | Type | Description | Sample Values |
|----------|------|-------------|---------------|
| `id` | Integer | Internal ID (auto-increment) | 1–100 (Oracle), 101-109/201-203/301 (Crafted) |
| `name` | Text | Prompt display name | "Current Period Financial Overview" |
| `custrecord_atlas_aicomp_prompt_text` | Long Text | Full prompt body with `[PLACEHOLDER]` parameters | "Use the ns_runReport tool to analyze..." |
| `custrecord_atlas_aicomp_prompt_category` | List ref (LOCKED) | Business process category | 1=Financial, 2=Visualizations, 3=O2C, 4=Item Mgmt, 5=P2P, 6=Manufacturing, 7=Sys Admin |
| `custrecord_atlas_aicomp_prompt_subcat` | Free Text | Subcategory — **editable, used by Crafted for domain tagging** | "Barrel Intelligence", null (Oracle prompts) |
| `custrecord_atlas_aicomp_prompt_roles` | Multi-select ref → `prompt_roles` | AI Companion roles this prompt is visible to | "5" (Administrator), "2, 3, 4" (CEO, CFO, Controller) |
| `custrecord_atlas_aicomp_prompt_inds` | Multi-select ref (LOCKED) | Industry vertical | "17" (Food & Bev), "1" (General) |
| `custrecord_atlas_aicomp_prompt_public` | Checkbox | Public visibility (bypasses role filter) | "T" (all current prompts are public) |
| `custrecord_atlas_aicomp_sdf_seeded` | Checkbox | Whether seeded by SuiteApp SDF install | "F" (all show F in sandbox — may reset) |
| `custrecord_atlas_aicomp_count_claude` | Integer | Times used via Claude | 0 |
| `custrecord_atlas_aicomp_count_chatgpt` | Integer | Times used via ChatGPT | 0 |
| `custrecord_atlas_aicomp_count_copy` | Integer | Times copied by users | 0 |
| `externalid` | Text | SDF external ID | "aiprompt_111"–"aiprompt_210" (Oracle), "aiprompt_crafted_barrel_001" (Crafted) |
| `scriptid` | Text | Auto-generated SDF script ID | "VAL_803974_T1912378_791" |
| `abbreviation` | Text | Unused | null |
| `owner` | Employee ref | Record creator | 4949 |
| `lastmodifiedby` | Employee ref | Last editor | 4949 |
| `created` | Date | Creation timestamp | "4/14/2026" |
| `lastmodified` | Date | Last edit timestamp | "4/14/2026" |
| `isinactive` | Checkbox | Soft delete / deactivation | "F" |

**Current data:** 113 prompts (100 Oracle + 12 barrel + 1 custom copy)

### 2. `customrecord_atlas_aicomp_prompt_roles` — Companion Roles (EXTENSIBLE)

Defines the AI Companion role taxonomy. **This is a custom record type, NOT a locked list.** New roles can be created via the Prompt Studio "+" button or `ns_createRecord`. 11 SuiteQL-accessible fields.

| Field ID | Type | Description | Sample Values |
|----------|------|-------------|---------------|
| `id` | Integer | Internal ID | 1-14 (Oracle-seeded), 101+ (user-created) |
| `name` | Text | Role display name | "Administrator", "Chief Financial Officer" |
| `custrecord_atlas_aicomp_promptrole_extid` | Text | External ID for SDF matching | "aipromptrole1111"–"aipromptrole1126" (Oracle), null (user-created) |
| `externalid` | Text | Mirrors promptrole_extid | Same as above |
| `scriptid` | Text | Auto-generated | "VAL_803960_T1912378_334" |
| `isinactive` | Checkbox | Soft delete | "F" |
| `abbreviation` | Text | Unused | null |
| `owner` | Employee ref | Creator | 4949 |
| `lastmodifiedby` | Employee ref | Last editor | 4949 |
| `created` | Date | Creation timestamp | "4/14/2026" |
| `lastmodified` | Date | Last edit timestamp | "4/14/2026" |

**Current data (15 records):**

| ID | Name | External ID | Source |
|----|------|------------|--------|
| 1 | Inventory Manager | aipromptrole1111 | Oracle SDF |
| 2 | Chief Executive Officer | aipromptrole1116 | Oracle SDF |
| 3 | Chief Financial Officer | aipromptrole1127 | Oracle SDF |
| 4 | Controller | aipromptrole1128 | Oracle SDF |
| 5 | Administrator | aipromptrole1117 | Oracle SDF |
| 6 | Accounting Analyst | aipromptrole1118 | Oracle SDF |
| 7 | A/R Analyst | aipromptrole1119 | Oracle SDF |
| 8 | A/P Analyst | aipromptrole1120 | Oracle SDF |
| 9 | Purchasing Manager | aipromptrole1121 | Oracle SDF |
| 10 | Warehouse Manager | aipromptrole1122 | Oracle SDF |
| 11 | Project Manager | aipromptrole1123 | Oracle SDF |
| 12 | Customer Service | aipromptrole1124 | Oracle SDF |
| 13 | Sales Representative | aipromptrole1125 | Oracle SDF |
| 14 | Sales Manager | aipromptrole1126 | Oracle SDF |
| 101 | Administrator (MCP) | null | User-created |

**Crafted can create new roles here** (e.g., "Distiller", "Cellar Master", "Production Manager", "Winemaker") and assign them to domain-specific prompts.

### 3. `customrecord_atlas_aicomp_role_mapping` — Role Bridge (NS Role → Companion Role)

The critical bridge table that maps every NetSuite role in the account to an AI Companion role. This is what determines which prompts a user sees when they open the Companion Library. 16 SuiteQL-accessible fields.

| Field ID | Type | Description | Sample Values |
|----------|------|-------------|---------------|
| `id` | Integer | Internal ID | 1-33 |
| `name` | Text | Sequential counter as string | "1", "2", "3" |
| `custrecord_atlas_aicomp_ns_role_id` | Integer | The actual NetSuite role internal ID | 3 (Administrator), 1006 (Crafted Production Supervisor) |
| `custrecord_atlas_aicomp_ns_role_name` | Text | Display name of the NS role | "Administrator", "CSS - Production Manager" |
| `custrecord_atlas_aicomp_prompt_role` | Integer ref → `prompt_roles` | The mapped AI Companion role ID (null = unmapped) | 5 (Administrator), null (unmapped) |
| `custrecord_atlas_aicomp_map_confidence` | Integer | Confidence score of the mapping (0-95) | 95 (exact match), 70 (keyword), 0 (unmapped) |
| `custrecord_atlas_aicomp_mapping_method` | List ref → `mapping_method` | How the mapping was determined | 2 (Keyword Matched) on all current records |
| `custrecord_atlas_aicomp_employee_count` | Integer | Number of employees with this role (unused?) | null on all records |
| `externalid` | Text | | null |
| `scriptid` | Text | Auto-generated | "VAL_804074_T1912378_363" |
| `isinactive` | Checkbox | | "F" |
| `abbreviation` | Text | | null |
| `owner` / `lastmodifiedby` | Employee ref | | 4949 |
| `created` / `lastmodified` | Date | | "4/14/2026" |

**Current data — full mapping table (33 records):**

| ID | NS Role ID | NS Role Name | Companion Role ID | Companion Role | Confidence | Method |
|----|-----------|-------------|-------------------|----------------|------------|--------|
| 1 | 3 | Administrator | 5 | Administrator | 95 | Keyword Matched |
| 2 | 55 | Developer | null | — | 0 | Keyword Matched |
| 3 | 1006 | Crafted Production Supervisor | null | — | 0 | Keyword Matched |
| 4 | 1010 | Crafted Sales Administrator | 5 | Administrator | 70 | Keyword Matched |
| 5 | 1017 | Crafted Packaging Supervisor | null | — | 0 | Keyword Matched |
| 6 | 1018 | Demo Crafted Production Supervisor | null | — | 0 | Keyword Matched |
| 7 | 1020 | Demo Crafted Still Supervisor | null | — | 0 | Keyword Matched |
| 8 | 1027 | Crafted ERP Distiller (Mobile) | null | — | 0 | Keyword Matched |
| 9 | 1028 | CSS - Warehouse Operator | 10 | Warehouse Manager | 70 | Keyword Matched |
| 10 | 1029 | CSS - Warehouse Manager | 10 | Warehouse Manager | 70 | Keyword Matched |
| 11 | 1030 | CSS - Supply Chain Manager | 10 | Warehouse Manager | 70 | Keyword Matched |
| 12 | 1031 | CSS - Senior Executive | null | — | 0 | Keyword Matched |
| 13 | 1032 | CSS - Sales Rep | 13 | Sales Representative | 70 | Keyword Matched |
| 14 | 1033 | CSS - Sales Manager | 14 | Sales Manager | 70 | Keyword Matched |
| 15 | 1034 | CSS - Purchasing Manager | 9 | Purchasing Manager | 70 | Keyword Matched |
| 16 | 1035 | CSS - Production Operator | null | — | 0 | Keyword Matched |
| 17 | 1036 | CSS - Production Manager | null | — | 0 | Keyword Matched |
| 18 | 1037 | CSS - Packaging Operator | null | — | 0 | Keyword Matched |
| 19 | 1038 | CSS - Packaging Manager | null | — | 0 | Keyword Matched |
| 20 | 1039 | CSS - Cost Accountant | 6 | Accounting Analyst | 70 | Keyword Matched |
| 21 | 1040 | CSS - Controller | 4 | Controller | 70 | Keyword Matched |
| 22 | 1041 | CSS - Contract Manufacturer | null | — | 0 | Keyword Matched |
| 23 | 1042 | CSS - CFO | 3 | Chief Financial Officer | 70 | Keyword Matched |
| 24 | 1043 | CSS - AR Analyst | null | — | 0 | Keyword Matched |
| 25 | 1044 | CSS - AP Analyst | null | — | 0 | Keyword Matched |
| 26 | 1045 | CSS - IT Manager | null | — | 0 | Keyword Matched |
| 27 | 1046 | CSS - Marketing | null | — | 0 | Keyword Matched |
| 28 | 1047 | CSS - Customer Service | 12 | Customer Service | 70 | Keyword Matched |
| 29 | 1055 | Demo CSS - Production Manager | null | — | 0 | Keyword Matched |
| 30 | 1056 | Demo CSS - Production Operator | null | — | 0 | Keyword Matched |
| 31 | 1459 | Administrator (MCP) | 5 | Administrator | 70 | Keyword Matched |
| 32 | 1460 | Crafted CEO (MCP) | 2 | Chief Executive Officer | 70 | Keyword Matched |
| 33 | 1462 | Crafted CFO (MCP) | 3 | Chief Financial Officer | 70 | Keyword Matched |

**Summary:** 18 mapped (companion role assigned), 15 unmapped (confidence=0, no companion role). All unmapped roles are Crafted-specific (Production, Packaging, Distiller, etc.).

### 4. `customrecord_atlas_aicomp_copyaction` — Copy Action (Usage Log)

Tracks every user interaction with prompts — copying to clipboard, sending to Claude, sending to ChatGPT. Drives the `count_*` rollup fields on prompt records. Currently **0 records** (no usage events in sandbox). 14 fields.

| Field ID | Type | Description | Joins To |
|----------|------|-------------|----------|
| `id` | Integer | Internal ID | — |
| `name` | String | Record name | — |
| `custrecord_atlas_aicomp_prompt_ref` | Integer (FK) | Which prompt was acted on | → `CUSTOMRECORD_ATLAS_AICOMP_PROMPTS` (N:1) |
| `custrecord_atlas_aicomp_action_type` | String | Action performed (e.g., "copy", "send_claude", "send_chatgpt") | — |
| `custrecord_atlas_aicomp_user` | Integer (FK) | Employee who performed the action | → `Employee` (N:1) |
| `custrecord_atlas_aicomp_datetime` | DateTime | When the action occurred | — |
| `owner` | Integer (FK) | Record owner | → `Employee` (N:1) |
| `lastmodifiedby` | Integer | Last modifier | → Entity (N:1) |
| `created` / `lastmodified` | DateTime | Timestamps | — |
| `externalid` / `scriptid` | String | SDF identifiers | — |
| `abbreviation` | String | Unused | — |
| `isinactive` | Boolean | Soft delete | — |

**Usage Rollup:** The scheduled script `customscript_atlas_aicomp_usage_rollup` reads Copy Action records and increments `count_claude`, `count_chatgpt`, `count_copy` on the corresponding prompt records. Currently **NOT SCHEDULED** in the sandbox.

### 5. `customrecord_atlas_aicomp_settings` — Settings (AI Provider Config)

Configuration record for AI provider integration URLs. Stores the base URLs used by "Send to Claude" and "Send to ChatGPT" actions. Currently **0 records** (not yet configured in sandbox). 12 fields.

| Field ID | Type | Description | Joins To |
|----------|------|-------------|----------|
| `id` | Integer | Internal ID | — |
| `name` | String | Record name | — |
| `custrecord_atlas_aicomp_claude_url` | String | Claude base URL for "Send to Claude" action | — |
| `custrecord_atlas_aicomp_chatgpt_url` | String | ChatGPT base URL for "Send to ChatGPT" action | — |
| `owner` | Integer (FK) | Record owner | → `Employee` (N:1) |
| `lastmodifiedby` | Integer | Last modifier | → Entity (N:1) |
| `created` / `lastmodified` | DateTime | Timestamps | — |
| `externalid` / `scriptid` | String | SDF identifiers | — |
| `abbreviation` | String | Unused | — |
| `isinactive` | Boolean | Soft delete | — |

### 6. `customlist_atlas_aicomp_mapping_method` — Mapping Method

How a role mapping was determined. 4 values. LOCKED custom list.

| ID | Name | Script ID | Description |
|----|------|-----------|-------------|
| 1 | AI Mapped | val_atlas_aicomp_mapped | Oracle's AI auto-mapping (not seen in current data) |
| 2 | Keyword Matched | val_atlas_aicomp_keyword_mapped | Keyword-based matching (all 33 current mappings) |
| 3 | Manual Override | val_atlas_aicomp_manual_mapped | Admin manually set the mapping |
| 4 | Exact Name Match | val_atlas_aicomp_exact_name_match | NS role name exactly matches companion role name |

---

## 7. `customlist_atlas_aicomp_prompt_cat` — Category List (LOCKED — 7 values)

Standard custom list fields: `id`, `name`, `isInactive`, `lastmodified`, `recordId`, `scriptId`.

**Join:** 1:N to `CUSTOMRECORD_ATLAS_AICOMP_PROMPTS` via `custrecord_atlas_aicomp_prompt_category`.

| ID | Category | Prompt Count | Description |
|----|----------|-------------|-------------|
| 1 | Financial | 40 | Income statements, balance sheet, cash flow, budgets, audits |
| 2 | Visualizations | 5 | Dashboards, scenario planning, interactive charts |
| 3 | Order to Cash | 14 | Customers, sales orders, invoices, payments |
| 4 | Item Management | 1 | Item creation and setup |
| 5 | Procure to Pay | 15 | Vendors, POs, bills, payments |
| 6 | Manufacturing | 12 | **All Crafted barrel prompts use this** |
| 7 | System Administration | 26 | User audits, role permissions, script health |
| — | **Total** | **113** | |

Cannot add new values. Crafted uses Manufacturing (6) + `prompt_subcat` free text for domain tagging.

## 8. `customlist_atlas_aicomp_prompt_ind` — Industry List (LOCKED — 39 values)

Standard custom list fields: `id`, `name`, `isInactive`, `lastmodified`, `recordId`, `scriptId`.

**Join:** N:M to `CUSTOMRECORD_ATLAS_AICOMP_PROMPTS` via multi-select field `custrecord_atlas_aicomp_prompt_inds`.

| ID | Industry | ID | Industry |
|----|----------|----|----------|
| 1 | All Industries | 21 | Health and Beauty |
| 2 | Accounting for Advertising & Marketing Agencies | 22 | Healthcare Accounting |
| 3 | Accounting for Consulting Firms | 23 | Healthcare ERP |
| 4 | Advertising & Marketing Agencies | 24 | Hospitality Accounting |
| 5 | Apparel | 25 | Hospitality ERP |
| 6 | Apparel Accounting | 26 | Industrial Machinery ERP |
| 7 | Building Materials | 27 | IT Services |
| 8 | Campus Stores | 28 | Life Sciences |
| 9 | Construction | 29 | Manufacturing |
| 10 | Construction Accounting | 30 | Media and Publishing |
| 11 | Consulting ERP | 31 | Nonprofit |
| 12 | Education | 32 | Nonprofit Accounting |
| 13 | Energy | 33 | Professional Services |
| 14 | Engineering | 34 | Restaurant Accounting |
| 15 | Engineering Accounting | 35 | Restaurant ERP |
| 16 | Financial Services | 36 | Retail |
| 17 | **Food and Beverage** | 37 | Retail Accounting |
| 18 | Government | 38 | Software and Technology Companies |
| 19 | Grocery Accounting | 39 | Wholesale Distribution |
| 20 | Grocery ERP | | |

Cannot add new values. All Crafted prompts use **Food and Beverage (17)**.

---

## Scripts (7 total)

### 1. Suitelet: AI Companion Library
| Property | Value |
|----------|-------|
| Script ID | `customscript_atlas_aicomp_prompt_library` |
| Deploy ID | `customdeploy_atlas_aicomp_prompt_library` |
| Type | Suitelet |
| Purpose | Main UI — prompt library with category tabs, role filtering, search, copy-to-clipboard. Renders prompt text as **plain text** (HTML comments visible). |

### 2. User Event: Record Locking
| Property | Value |
|----------|-------|
| Script ID | `customscript_atlas_aicomp_rec_lock_ue` |
| Deploy IDs | `customdeploy_atlas_aicomp_lock_roles`, `customdeploy_atlas_aicomp_lock_copy`, `customdeploy_atlas_aicomp_lock_prompts`, `customdeploy_atlas_aicomp_role_map` |
| Type | User Event (4 deployments) |
| Purpose | Prevents editing of SDF-seeded prompt records, roles, and role mappings. Users can copy but not modify Oracle's defaults. |

### 3. Suitelet: Role Mapper Configuration
| Property | Value |
|----------|-------|
| Script ID | `customscript_atlas_aicomp_role_map_cfg` |
| Deploy ID | `customdeploy_atlas_aicomp_role_map_cfg` |
| Type | Suitelet |
| Purpose | Admin UI for mapping NetSuite roles to AI Companion roles. This is where admins fix unmapped roles (the 15 Crafted roles with confidence=0). |

### 4. SDF Installation: Role Mapper
| Property | Value |
|----------|-------|
| Script ID | `customscript_atlas_aicomp_role_mapper` |
| Deploy ID | `customdeploy_atlas_aicomp_role_mapper` |
| Type | SDF Installation Script |
| Purpose | Runs on install/update — scans all NS roles, creates `role_mapping` records, attempts keyword matching to companion roles. |

### 5. Scheduled: Role Sync Weekly
| Property | Value |
|----------|-------|
| Script ID | `customscript_atlas_aicomp_role_sync` |
| Deploy ID | `customdeploy_atlas_aicomp_role_sync` |
| Type | Scheduled Script |
| Purpose | Weekly sync — catches new NS roles added since install, creates role_mapping records, attempts matching. |

### 6. SDF Installation: Prompt Loader
| Property | Value |
|----------|-------|
| Script ID | `customscript_atlas_aicomp_sdf_prmtldr` |
| Deploy ID | `customdeploy_atlas_aicomp_sdf_prmtldr` |
| Type | SDF Installation Script |
| Purpose | Seeds 100 default prompts on install. Uses externalid `aiprompt_NNN` and sets `sdf_seeded = T`. |

### 7. Scheduled: Usage Rollup
| Property | Value |
|----------|-------|
| Script ID | `customscript_atlas_aicomp_usage_rollup` |
| Deploy ID | `customdeploy_atlas_aicomp_usage_rollup` |
| Type | Scheduled Script |
| Status | **NOT SCHEDULED** — deployed but not running |
| Purpose | Increments `count_claude`, `count_chatgpt`, `count_copy` on prompt records based on usage events. |

---

## External ID Patterns

| Owner | Pattern | Range |
|-------|---------|-------|
| Oracle prompts | `aiprompt_NNN` | `aiprompt_111` – `aiprompt_210` |
| Oracle roles | `aipromptroleNNNN` | `aipromptrole1111` – `aipromptrole1126` |
| Crafted prompts | `aiprompt_crafted_[domain]_NNN` | `aiprompt_crafted_barrel_001` – `aiprompt_crafted_barrel_012` |
| Crafted roles | TBD | `aipromptrolecrafted_NNN` (recommended) |

---

## How It Works End-to-End

```
1. INSTALL
   └─ SuiteApp installs → SDF Installation scripts run:
      ├─ Prompt Loader (sdf_prmtldr) seeds 100 prompts
      └─ Role Mapper (role_mapper):
         ├─ Scans ALL NetSuite roles in the account
         ├─ Creates a role_mapping record for each (33 in this account)
         ├─ Attempts keyword matching to Companion roles
         ├─ Sets confidence (95=exact, 70=keyword, 0=no match)
         └─ 15 Crafted-specific roles left UNMAPPED (confidence=0)

2. CONFIGURE
   └─ Admin opens Role Mapper Config Suitelet (role_map_cfg)
      ├─ Sees all NS roles with their current companion role mapping
      ├─ Can manually override: set companion_role + method="Manual Override"
      └─ Weekly sync (role_sync) catches new roles automatically

3. PROMPT VISIBILITY
   └─ User opens AI Companion Library Suitelet (prompt_library)
      ├─ Suitelet reads user's NS role ID
      ├─ Looks up role_mapping → finds companion_role_id
      │   ├─ If mapped: shows prompts tagged with that companion role
      │   └─ If unmapped (null): shows ONLY public prompts (or nothing?)
      ├─ Applies category + industry filters
      └─ User browses/searches, then:
          ├─ Copy to Clipboard (local copy)
          ├─ Send to Claude (uses claude_url from Settings record)
          └─ Send to ChatGPT (uses chatgpt_url from Settings record)

4. TRACK
   └─ Each copy/send action creates a COPYACTION record:
      ├─ prompt_ref → which prompt
      ├─ action_type → "copy" / "send_claude" / "send_chatgpt"
      ├─ user → which employee
      └─ datetime → when
   └─ Usage Rollup scheduled script reads COPYACTION records
      and increments count_claude, count_chatgpt, count_copy
      on prompt records (currently NOT SCHEDULED — needs activation)

5. PROTECT
   └─ Record Locking UE prevents editing SDF-seeded records:
      ├─ Prompts: can't edit Oracle's 100 seeded prompts
      ├─ Roles: can't edit Oracle's 14 seeded roles
      ├─ Role mappings: can't edit Oracle's seeded mappings
      └─ Custom records (sdf_seeded=F) are freely editable
```

---

## Implications for Crafted Companion v2

### Role System — Major Finding

1. **Roles are extensible.** We can create Crafted-specific roles (Distiller, Cellar Master, Production Manager, Winemaker) in `customrecord_atlas_aicomp_prompt_roles`.

2. **15 Crafted NS roles are currently unmapped.** Users with these roles (Production Supervisor, Packaging Supervisor, Distiller, Production Operator, etc.) likely see no or limited prompts in the Companion Library because they have no companion role assignment.

3. **We can fix this two ways:**
   - **Create new Companion roles** (e.g., "Distiller") and map Crafted NS roles to them
   - **Update existing role_mapping records** to map Crafted NS roles to existing Companion roles (e.g., map "CSS - Production Manager" → Warehouse Manager)
   - **Best approach:** Create Crafted-specific Companion roles AND update role mappings, using mapping_method=3 (Manual Override) for our mappings

4. **The `seedPrompt` tool should also seed role mappings** — when deploying to a new customer account, we need to create Companion roles and map their NS roles appropriately.

### Category System — Confirmed Locked

Categories are a locked list with 7 values. All Crafted prompts use Manufacturing (6) with `prompt_subcat` for domain tagging. The SPA provides the domain filtering that the locked categories can't.

### Industry System — Confirmed Locked

Industries are a locked custom list (`CUSTOMLIST_ATLAS_AICOMP_PROMPT_IND`) with 39 values, queryable via SuiteQL. All Crafted prompts use Food and Beverage (17). The industry field is multi-select on the prompt record.

### Unknown: Prompt ID 301

Found one prompt not in our tracking: `id=301, name="Barrel Operations KPI Dashboard (Custom Copy)", category=Visualizations, roles="2, 3, 4"`. This appears to be a manual copy of barrel prompt 104. No subcategory set. Investigate whether this was intentionally created.

### Record Locking Impact

The Record Locking UE has 4 deployments, including one on role_mapping (`customdeploy_atlas_aicomp_role_map`). This means Oracle's seeded role_mapping records may be edit-protected. When we update mappings for Crafted NS roles (which are NOT Oracle-seeded), we should verify the UE doesn't block our updates. The records were created by the Role Mapper install script, so they may have `sdf_seeded=F` and be freely editable.
