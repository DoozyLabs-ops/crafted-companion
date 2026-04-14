# NetSuite SDF Roles and Permissions Reference

## Overview

This skill provides a complete reference for NetSuite permission IDs, role configuration, and SDF deployment permission management. Use this when setting up custom roles, validating SDF projects, or debugging permission errors.

## Permission Key Structure

All NetSuite permissions follow this format:

```
<permkey>[CATEGORY]_[NAME]</permkey>
<permlevel>[LEVEL]</permlevel>
```

**Categories:**
- `ADMI` — Administration (203 unique permission IDs)
- `LIST` — Lists/Records (224 unique permission IDs)
- `REGT` — GL Accounts/Registers (21 unique permission IDs)
- `REPO` — Reports (66 unique permission IDs)
- `TRAN` — Transactions (159 unique permission IDs)

**Permission Levels:**
- `VIEW` — Read-only access
- `CREATE` — Create new records
- `EDIT` — Modify existing records
- `FULL` — Create, Edit, Delete, and full control

## Identifying Standard vs Custom Record Permissions

**Standard Records:**
- Use predefined permission keys (e.g., `ADMI_SUITEAPPBUILDER`, `LIST_CUSTOMER`)
- Check `permissions.json` for exact key and valid levels

**Custom Records:**
- Permission key format: `LIST_[CUSTOMRECORD_NAME]`
- Example: `LIST_CUSTOMRECORD_MYRECORD` for custom record with ID `customrecord_myrecord`
- Valid levels: VIEW, CREATE, EDIT, FULL (same as standard records)

## Permission Level Selection Guide

| Use Case | Level | Notes |
|----------|-------|-------|
| Read-only reports/dashboards | VIEW | Safest, minimal privileges |
| Data entry clerks | CREATE + EDIT | Can add and modify records |
| Managers/supervisors | EDIT + full on related | Can approve, modify, view all |
| Admins | FULL | Complete control, including delete |
| API/integration accounts | VIEW + LIST_ACTIVITY | Minimal + audit trail only |
| Custom role templates | Mix levels by function | Assign only what's needed |

## Run-As Role Guidance

When assigning a custom role as "Run-As" for scripts/integrations:

1. **Principle of Least Privilege:** Only grant permissions the script actually needs
2. **Audit Trail:** Scripts running as a custom role are traceable to that role
3. **Performance:** Fewer permissions = faster permission checks
4. **Security:** A compromised script cannot exceed the run-as role's permissions

**Example: Inventory adjustment script**
- Needs: `LIST_ITEM` (VIEW), `LIST_LOCATION` (VIEW), `TRAN_INVENTORYADJUSTMENT` (CREATE)
- Does NOT need: `ADMI_SUITEAPPBUILDER`, `REPO_*` (reports), `TRAN_VENDOR*`

## Common Permission Sets

**Read-Only Analyst:**
```
ADMI_ANALYTICS (VIEW)
LIST_CUSTOMER (VIEW)
LIST_VENDOR (VIEW)
LIST_ITEM (VIEW)
REPO_FINANCIALSTATEMENT (VIEW)
REPO_SALESANALYSIS (VIEW)
```

**Order Entry Clerk:**
```
LIST_CUSTOMER (VIEW)
LIST_ITEM (VIEW)
TRAN_SALESORDER (CREATE + EDIT)
LIST_ACTIVITY (EDIT)
```

**Accounts Payable:**
```
LIST_VENDOR (VIEW)
LIST_ITEM (VIEW)
TRAN_PURCHASEORDER (VIEW)
TRAN_ITEMRECEIPT (CREATE + EDIT)
TRAN_VENDORBILL (CREATE + EDIT)
TRAN_PAYMENT (CREATE + EDIT)
```

**Finance Manager:**
```
LIST_ACCOUNT (EDIT)
LIST_DEPARTMENT (VIEW)
TRAN_JOURNALENTRY (CREATE + EDIT)
TRAN_INVOICE (EDIT)
TRAN_PAYMENT (EDIT)
REPO_INCOMESTATEMENT (VIEW)
REPO_BALANCESHEET (VIEW)
```

## Workflow for Custom Role Setup

1. **Identify the job function** — What tasks does this role perform?
2. **List required permissions** — Which records must they access?
3. **Determine access level** — VIEW, CREATE, EDIT, or FULL?
4. **Apply principle of least privilege** — Remove unnecessary permissions
5. **Test with a user** — Verify the role can perform required tasks
6. **Document in the SDF project** — Add permission details to project readme or manifest
7. **Review in SDF deploy** — Confirm all permkeys are valid before deployment

## References

For complete permission ID catalogs and use-case mappings, see:
- `permissions.json` — All 684 unique NetSuite permission IDs by category
- `permission-index.md` — Human-readable index organized by use case and functional module
