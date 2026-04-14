# NetSuite AI Connector Instructions

## Overview
This skill provides guidelines for AI assistants integrating with NetSuite via the AI Connector. It covers tool selection order, output formatting, domain knowledge, multi-subsidiary handling, and SuiteQL safety practices.

## Tool Selection Order (Mandatory Execution Sequence)

**Always follow this priority order — do not skip levels:**

1. **Reports** (if user mentions "dashboard", "compare", "trend", or "report")
   - Use NetSuite native reports first
   - Fastest, pre-aggregated, pre-authorized
   - Built-in formatting and drill-down

2. **Saved Searches** (if user asks about specific records, filters, or named data sets)
   - Pre-built queries with saved filters
   - Account-specific customizations
   - Faster than ad-hoc SuiteQL

3. **Records** (if user asks about a specific transaction or entity)
   - Use get_record tools by ID or document number
   - Direct record lookup
   - Single record context

4. **SuiteQL** (last resort for complex multi-record queries)
   - Use only when Reports, Searches, and Records don't work
   - Always parameterized with `?` placeholders
   - Never interpolate user input

## Number Formatting Rules

Format numbers for clarity and brevity:

| Range | Format | Example |
|-------|--------|---------|
| Millions | $X.XM | $2.1M (not $2,100,000) |
| Hundreds of thousands | $XXX.XK | $342.5K (not $342,500) |
| Percentages | XX.X% | 12.3% (not 0.123) |
| Large whole numbers | X,XXX | 1,250 (with commas) |

## Hyperlink Patterns

Create hyperlinks for transaction and entity references using these exact URL patterns:

**Transaction Records:**
- Invoice: `https://[ACCOUNT].app.netsuite.com/app/accounting/transactions/custinvc.nl?id=[ID]`
- Sales Order: `https://[ACCOUNT].app.netsuite.com/app/order/salesorder.nl?id=[ID]`
- Purchase Order: `https://[ACCOUNT].app.netsuite.com/app/order/purchaseorder.nl?id=[ID]`
- Vendor Bill: `https://[ACCOUNT].app.netsuite.com/app/accounting/transactions/vendorbill.nl?id=[ID]`
- Payment: `https://[ACCOUNT].app.netsuite.com/app/accounting/transactions/payment.nl?id=[ID]`
- Journal Entry: `https://[ACCOUNT].app.netsuite.com/app/accounting/transactions/journal.nl?id=[ID]`
- Credit Memo: `https://[ACCOUNT].app.netsuite.com/app/accounting/transactions/creditmemo.nl?id=[ID]`

**Entity Records:**
- Customer: `https://[ACCOUNT].app.netsuite.com/app/common/entity/custvendtype.nl?id=[ID]`
- Vendor: `https://[ACCOUNT].app.netsuite.com/app/common/entity/custvendtype.nl?id=[ID]`
- Employee: `https://[ACCOUNT].app.netsuite.com/app/common/entity/employee.nl?id=[ID]`

**Report Records:**
- Report: `https://[ACCOUNT].app.netsuite.com/app/reporting/report/[REPORTID].html`

Replace `[ACCOUNT]` with the account subdomain, `[ID]` with the internal ID, and `[REPORTID]` with the report numeric ID.

## Artifact Threshold Rules

Create React artifacts (interactive dashboards/reports) when:

- **3+ KPIs** are shown (Key Performance Indicators with current value + trend)
- **10+ data rows** are displayed (tables, lists with pagination)
- User explicitly requests "dashboard", "report", or "compare"

Do not create artifacts for:
- Simple text responses or brief tables
- Single metrics or 1-2 rows of data
- Lists under 10 items

## Oracle Redwood Design Tokens

Use these brand colors for consistency:

| Token | Color | Usage |
|-------|-------|-------|
| Ocean 160 | #003764 | Primary headers, key metrics |
| Ocean 120 | #36677D | Links, secondary headers |
| Ocean 80 | #5B8DB1 | Chart fill, accent background |
| Coral 100 | #D64700 | Alerts, negative values, errors |
| Moss 100 | #3D7A41 | Positive values, success |
| Amber 100 | #B95C00 | Warnings, attention needed |

## KPI Card Component Template

```jsx
<div style={{
  background: '#fff',
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  padding: '20px',
  minWidth: '200px'
}}>
  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
    {title}
  </div>
  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#003764' }}>
    {value}
  </div>
  <div style={{ fontSize: '12px', color: trend > 0 ? '#3D7A41' : '#D64700', marginTop: '8px' }}>
    {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last period
  </div>
</div>
```

## Record Type Hierarchy

**Sales & AR:**
- Sales Order → Item Fulfillment → Invoice → Customer Payment

**Purchasing & AP:**
- Purchase Order → Item Receipt → Vendor Bill → Vendor Payment

**Finance:**
- Journal Entry (GL postings)
- Bank Reconciliation

**Inventory:**
- Inventory Adjustment
- Transfer Order
- Item Receipt (from PO)
- Item Fulfillment (to SO)

## GL & Accounting Logic

| Account Type | Normal Balance | Debit Effect | Credit Effect |
|--------------|----------------|--------------|---------------|
| Asset | Debit | Increase | Decrease |
| Liability | Credit | Decrease | Increase |
| Equity | Credit | Decrease | Increase |
| Revenue | Credit | Decrease | Increase |
| Expense | Debit | Increase | Decrease |
| COGS | Debit | Increase | Decrease |

**Key SuiteQL field names:**
- `trandate` — transaction date
- `tranid` — document number
- `amount` — transaction amount (home currency)
- `foreignamount` — transaction amount (original currency)
- `exchangerate` — conversion rate applied
- `recordtype` — transaction type (invoice, payment, etc.)
- `approvalstatus` — approval workflow state
- `posting` — GL posting flag (T/F)
- `subsidiary` — subsidiary context
- `account` — GL account
- `entity` — customer/vendor/employee
- `department`, `class`, `location` — segment fields

## Multi-Subsidiary & Currency Handling

**Multi-Subsidiary Rules:**
- Always include `subsidiary` filter when querying multi-subsidiary accounts
- Report separately by subsidiary unless user explicitly requests consolidated view
- Include subsidiary name in all output headers

**Currency Rules:**
- Always show both home currency (`amount`) and original currency (`foreignamount`)
- Use exchange rate (`exchangerate`) for analysis
- Clearly label currency codes (USD, EUR, GBP, etc.)
- Do not mix currencies in aggregations without conversion

## SuiteQL Safety Guardrails

**Pre-Query Checklist:**

Every SuiteQL query MUST include:

- ✓ `ROWNUM <= 1000` (prevent runaway queries)
- ✓ `NVL(field, 0)` for nullable numeric fields (prevent NULL errors)
- ✓ `posting = 'T'` for GL transactions (exclude drafts)
- ✓ `approvalstatus = 2` for approved transactions (exclude pending)
- ✓ `subsidiary = [ID]` filter in multi-subsidiary accounts

**Safe Query Template:**

```sql
SELECT
  id,
  NVL(amount, 0) AS amount,
  trandate,
  entity
FROM transaction
WHERE posting = 'T'
  AND approvalstatus = 2
  AND subsidiary = 1
  AND trandate >= TO_DATE('2024-01-01', 'YYYY-MM-DD')
  AND ROWNUM <= 1000
ORDER BY trandate DESC
```

**Common Mistakes & Corrections:**

| Mistake | Problem | Fix |
|---------|---------|-----|
| `SELECT *` | Slow, unnecessary columns | Name specific fields |
| Missing `ROWNUM` | Query timeout or crash | Add `AND ROWNUM <= 1000` |
| `amount` without NVL | NULL errors in math | Wrap: `NVL(amount, 0)` |
| No `posting = 'T'` | Includes draft transactions | Filter drafts out |
| String concatenation | SQL injection risk | Use `?` placeholders + params |
| `LIKE '%pattern%'` | Slow full-text scan | Use exact match if possible |

## Error Recovery Patterns

When a query fails:

1. **SuiteQL syntax error** → Fall back to Saved Searches
2. **Permission denied** → Check role permissions, suggest viewing via Reports
3. **Timeout/ROWNUM hit** → Narrow the date range or add more filters
4. **NULL/empty result** → Verify the data exists in the target period
5. **Multi-subsidiary confusion** → Ask user which subsidiary/company to focus on
