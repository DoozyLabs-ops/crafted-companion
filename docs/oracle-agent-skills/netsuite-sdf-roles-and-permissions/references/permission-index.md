# NetSuite Permissions Index

A human-readable, searchable index of all 684 NetSuite permissions (673 unique IDs) organized by use case, functional module, and common scenarios.

---

## Part A: By Category

### Administration (ADMI) — 203 unique permissions

Core system configuration and development permissions.

| Permission Key | Label | Common Levels |
|---|---|---|
| ADMI_SUITESCRIPT | SuiteScript | VIEW, CREATE, EDIT, FULL |
| ADMI_CUSTOMIZATION | Custom Records | VIEW, CREATE, EDIT, FULL |
| ADMI_CUSTOMFIELD | Custom Fields | VIEW, CREATE, EDIT, FULL |
| ADMI_WORKFLOW | Workflows | VIEW, CREATE, EDIT, FULL |
| ADMI_SUITEAPPBUILDER | SuiteApps | VIEW, CREATE, EDIT, FULL |
| ADMI_RESTWEBSERVICES | REST Web Services | VIEW, EDIT, FULL |
| ADMI_SOAPWEBSERVICES | SOAP Web Services | VIEW, EDIT, FULL |
| ADMI_OAUTH | OAuth Tokens | VIEW, CREATE, EDIT, FULL |
| ADMI_SETUP | Setup | VIEW, EDIT |
| ADMI_FEATURESETUP | Feature Setup | VIEW, EDIT |
| ADMI_SETUPUSERS | Users | VIEW, CREATE, EDIT, FULL |
| ADMI_SETUPROLES | Roles | VIEW, CREATE, EDIT, FULL |
| ADMI_SETUPSUBSIDIARIES | Subsidiaries | VIEW, CREATE, EDIT, FULL |
| ADMI_SETUPDEPARTMENTS | Departments | VIEW, CREATE, EDIT, FULL |
| ADMI_SETUPLOCATIONS | Locations | VIEW, CREATE, EDIT, FULL |
| ADMI_SETUPCLASSES | Classes | VIEW, CREATE, EDIT, FULL |
| ADMI_AUDITTRAIL | Audit Trail | VIEW |
| ADMI_DATAEXCHANGE | Data Exchange | VIEW, CREATE, EDIT, FULL |
| ADMI_INTEGRATIONMANAGEMENT | Integration Management | VIEW, CREATE, EDIT, FULL |

### Lists (LIST) — 224 unique permissions

Records, entities, and configuration lists.

| Permission Key | Label | Common Levels |
|---|---|---|
| LIST_CUSTOMER | Customers | VIEW, CREATE, EDIT, FULL |
| LIST_VENDOR | Vendors | VIEW, CREATE, EDIT, FULL |
| LIST_EMPLOYEE | Employees | VIEW, CREATE, EDIT, FULL |
| LIST_ITEM | Items/Products | VIEW, CREATE, EDIT, FULL |
| LIST_ACCOUNT | Chart of Accounts | VIEW, CREATE, EDIT, FULL |
| LIST_CONTACT | Contacts | VIEW, CREATE, EDIT, FULL |
| LIST_DEPARTMENT | Departments | VIEW, CREATE, EDIT, FULL |
| LIST_LOCATION | Locations | VIEW, CREATE, EDIT, FULL |
| LIST_SUBSIDIARY | Subsidiaries | VIEW, CREATE, EDIT, FULL |
| LIST_ACTIVITY | Activities | VIEW, CREATE, EDIT, FULL |
| LIST_CAMPAIGN | Campaigns | VIEW, CREATE, EDIT, FULL |
| LIST_CASE | Cases | VIEW, CREATE, EDIT, FULL |
| LIST_OPPORTUNITY | Opportunities | VIEW, CREATE, EDIT, FULL |
| LIST_PROJECT | Projects | VIEW, CREATE, EDIT, FULL |
| LIST_BOM | Bill of Materials | VIEW, CREATE, EDIT, FULL |
| LIST_FILECABINET | File Cabinet | VIEW, CREATE, EDIT, FULL |

### GL Registers (REGT) — 21 unique permissions

Account type register access for GL account management.

| Permission Key | Label | Common Levels |
|---|---|---|
| REGT_ASSET | Asset Accounts | VIEW, EDIT |
| REGT_BANK | Bank Accounts | VIEW, EDIT |
| REGT_COGS | Cost of Goods Sold | VIEW, EDIT |
| REGT_EXPENSE | Expense Accounts | VIEW, EDIT |
| REGT_INCOME | Income Accounts | VIEW, EDIT |
| REGT_LIABILITY | Liability Accounts | VIEW, EDIT |
| REGT_EQUITY | Equity Accounts | VIEW, EDIT |

### Reports (REPO) — 66 unique permissions

Financial and operational reporting access.

| Permission Key | Label | Common Levels |
|---|---|---|
| REPO_INCOMESTATEMENT | Income Statement | VIEW |
| REPO_BALANCESHEET | Balance Sheet | VIEW |
| REPO_CASHFLOW | Cash Flow Statement | VIEW |
| REPO_FINANCIALSTATEMENT | Financial Statements | VIEW |
| REPO_SALESANALYSIS | Sales Analysis | VIEW |
| REPO_ARAGINGREPORT | AR Aging Report | VIEW |
| REPO_APAGINGREPORT | AP Aging Report | VIEW |
| REPO_INVENTORYVALUATION | Inventory Valuation | VIEW |
| REPO_CUSTOMREPORT | Custom Reports | VIEW, CREATE, EDIT |

### Transactions (TRAN) — 159 unique permissions

Transaction document access across all modules.

| Permission Key | Label | Common Levels |
|---|---|---|
| TRAN_SALESORDER | Sales Orders | VIEW, CREATE, EDIT, FULL |
| TRAN_INVOICE | Invoices | VIEW, CREATE, EDIT, FULL |
| TRAN_CUSTPAYMENT | Customer Payments | VIEW, CREATE, EDIT, FULL |
| TRAN_PURCHASEORDER | Purchase Orders | VIEW, CREATE, EDIT, FULL |
| TRAN_ITEMRECEIPT | Item Receipts | VIEW, CREATE, EDIT, FULL |
| TRAN_VENDORBILL | Vendor Bills | VIEW, CREATE, EDIT, FULL |
| TRAN_PAYMENT | Vendor Payments | VIEW, CREATE, EDIT, FULL |
| TRAN_JOURNALENTRY | Journal Entries | VIEW, CREATE, EDIT, FULL |
| TRAN_INVENTORYADJUSTMENT | Inventory Adjustments | VIEW, CREATE, EDIT, FULL |
| TRAN_TRANSFERORDER | Transfer Orders | VIEW, CREATE, EDIT, FULL |
| TRAN_WORKORDER | Work Orders | VIEW, CREATE, EDIT, FULL |
| TRAN_TIMEENTRY | Time Entries | VIEW, CREATE, EDIT, FULL |
| TRAN_EXPENSE | Expense Reports | VIEW, CREATE, EDIT, FULL |

---

## Part B: By Use Case

Common business scenarios and minimum required permissions.

### Sales Order Processing

**Read a Sales Order:**
- `LIST_CUSTOMER` (VIEW)
- `LIST_ITEM` (VIEW)
- `TRAN_SALESORDER` (VIEW)

**Create a Sales Order:**
- `LIST_CUSTOMER` (VIEW)
- `LIST_ITEM` (VIEW)
- `TRAN_SALESORDER` (CREATE)
- `LIST_ACTIVITY` (CREATE) — for attachments/notes

**Fulfill a Sales Order:**
- `TRAN_SALESORDER` (VIEW)
- `TRAN_ITEMFULFILLMENT` (CREATE)
- `LIST_LOCATION` (VIEW)

**Invoice from Sales Order:**
- `TRAN_SALESORDER` (VIEW)
- `TRAN_INVOICE` (CREATE)
- `LIST_ACCOUNT` (VIEW)

### Purchase Order Processing

**Read a Purchase Order:**
- `LIST_VENDOR` (VIEW)
- `LIST_ITEM` (VIEW)
- `TRAN_PURCHASEORDER` (VIEW)

**Create a Purchase Order:**
- `LIST_VENDOR` (VIEW)
- `LIST_ITEM` (VIEW)
- `TRAN_PURCHASEORDER` (CREATE)

**Receive a Purchase Order:**
- `TRAN_PURCHASEORDER` (VIEW)
- `TRAN_ITEMRECEIPT` (CREATE)
- `LIST_LOCATION` (VIEW)

**Process Vendor Bill:**
- `TRAN_PURCHASEORDER` (VIEW)
- `TRAN_ITEMRECEIPT` (VIEW)
- `TRAN_VENDORBILL` (CREATE)
- `LIST_ACCOUNT` (VIEW)

### Accounts Payable

**Pay a Vendor Bill:**
- `TRAN_VENDORBILL` (VIEW)
- `TRAN_PAYMENT` (CREATE)
- `LIST_VENDOR` (VIEW)
- `REGT_BANK` (VIEW)

**View Aging Report:**
- `REPO_APAGINGREPORT` (VIEW)
- `LIST_VENDOR` (VIEW)

### Accounts Receivable

**Apply Customer Payment:**
- `TRAN_INVOICE` (VIEW)
- `TRAN_CUSTPAYMENT` (CREATE)
- `LIST_CUSTOMER` (VIEW)
- `REGT_BANK` (VIEW)

**View Aging Report:**
- `REPO_ARAGINGREPORT` (VIEW)
- `LIST_CUSTOMER` (VIEW)

### General Ledger & Accounting

**Create Journal Entry:**
- `TRAN_JOURNALENTRY` (CREATE)
- `LIST_ACCOUNT` (VIEW)
- `LIST_DEPARTMENT` (VIEW)

**View Financial Statements:**
- `REPO_INCOMESTATEMENT` (VIEW)
- `REPO_BALANCESHEET` (VIEW)
- `LIST_ACCOUNT` (VIEW)

**View General Ledger:**
- `REPO_GENERALLEDGER` (VIEW)
- `LIST_ACCOUNT` (VIEW)

### Inventory Management

**View Inventory Levels:**
- `LIST_ITEM` (VIEW)
- `LIST_LOCATION` (VIEW)
- `REPO_INVENTORYVALUATION` (VIEW)

**Adjust Inventory:**
- `LIST_ITEM` (VIEW)
- `LIST_LOCATION` (VIEW)
- `TRAN_INVENTORYADJUSTMENT` (CREATE)

**Transfer Inventory Between Locations:**
- `LIST_ITEM` (VIEW)
- `LIST_LOCATION` (VIEW)
- `TRAN_TRANSFERORDER` (CREATE)

### Manufacturing

**Create Work Order:**
- `LIST_ITEM` (VIEW)
- `LIST_BOM` (VIEW)
- `LIST_LOCATION` (VIEW)
- `TRAN_WORKORDER` (CREATE)

**Complete Work Order:**
- `TRAN_WORKORDER` (EDIT)
- `TRAN_INVENTORYADJUSTMENT` (CREATE)

### Time Tracking

**Log Time Entry:**
- `LIST_EMPLOYEE` (VIEW)
- `LIST_PROJECT` (VIEW)
- `TRAN_TIMEENTRY` (CREATE)

**View Time Reports:**
- `REPO_TIMETRACKING` (VIEW)
- `TRAN_TIMEENTRY` (VIEW)

### Expense Reports

**Submit Expense Report:**
- `TRAN_EXPENSE` (CREATE)
- `LIST_ACCOUNT` (VIEW)

**Approve Expense Report:**
- `TRAN_EXPENSE` (EDIT)

### REST API Integration

**Read-Only API Access:**
- `ADMI_RESTWEBSERVICES` (VIEW)
- Specific transaction/list permissions for READ operations
- `LIST_ACTIVITY` (VIEW) — for audit

**Create/Update API Access:**
- `ADMI_RESTWEBSERVICES` (EDIT)
- `ADMI_OAUTH` (CREATE) — for token generation
- Specific transaction/list permissions for WRITE operations

### SuiteScript Deployment

**Deploy Custom Scripts:**
- `ADMI_SUITESCRIPT` (CREATE or EDIT)
- `ADMI_SETUP` (EDIT)
- Record permissions for any records the script touches

**Debug Scripts:**
- `ADMI_SUITESCRIPT` (VIEW)
- `ADMI_AUDITTRAIL` (VIEW)

### Custom Records

**Manage Custom Records:**
- `ADMI_CUSTOMIZATION` (VIEW/CREATE/EDIT/FULL)
- `LIST_[CUSTOMRECORD_NAME]` (appropriate level)

**Assign Custom Fields:**
- `ADMI_CUSTOMFIELD` (CREATE or EDIT)

---

## Part C: By Functional Module

Organized by business function and department.

### Sales & CRM

| Use Case | Minimum Permissions |
|---|---|
| **Sales Order Processing** | TRAN_SALESORDER (EDIT), LIST_CUSTOMER (VIEW), LIST_ITEM (VIEW) |
| **Customer Management** | LIST_CUSTOMER (EDIT), LIST_CONTACT (CREATE) |
| **Opportunity Tracking** | TRAN_OPPORTUNITY (CREATE), LIST_CUSTOMER (VIEW) |
| **Activity Logging** | LIST_ACTIVITY (CREATE), LIST_CONTACT (VIEW) |
| **Campaign Management** | LIST_CAMPAIGN (EDIT), LIST_CUSTOMER (VIEW) |
| **Price Management** | LIST_PRICELEVEL (EDIT) |

### Purchasing & Vendors

| Use Case | Minimum Permissions |
|---|---|
| **Purchase Order Creation** | TRAN_PURCHASEORDER (CREATE), LIST_VENDOR (VIEW), LIST_ITEM (VIEW) |
| **Vendor Management** | LIST_VENDOR (EDIT), LIST_CONTACT (CREATE) |
| **Receiving** | TRAN_ITEMRECEIPT (CREATE), TRAN_PURCHASEORDER (VIEW) |
| **Vendor Billing** | TRAN_VENDORBILL (CREATE), TRAN_ITEMRECEIPT (VIEW) |
| **Vendor Payments** | TRAN_PAYMENT (CREATE), TRAN_VENDORBILL (VIEW), REGT_BANK (VIEW) |

### Inventory & Warehouse

| Use Case | Minimum Permissions |
|---|---|
| **Inventory Viewing** | LIST_ITEM (VIEW), LIST_LOCATION (VIEW) |
| **Inventory Adjustment** | TRAN_INVENTORYADJUSTMENT (CREATE), LIST_ITEM (VIEW) |
| **Inter-Location Transfer** | TRAN_TRANSFERORDER (CREATE), LIST_LOCATION (VIEW) |
| **Warehouse Management** | LIST_LOCATION (EDIT), LIST_ITEM (VIEW) |
| **Bin Management** | LIST_LOCATION (EDIT), LIST_ITEM (VIEW) |

### Manufacturing

| Use Case | Minimum Permissions |
|---|---|
| **BOM Management** | LIST_BOM (EDIT), LIST_ITEM (VIEW) |
| **Work Order Creation** | TRAN_WORKORDER (CREATE), LIST_BOM (VIEW) |
| **Work Order Completion** | TRAN_WORKORDER (EDIT), TRAN_INVENTORYADJUSTMENT (CREATE) |
| **Production Reporting** | REPO_PRODUCTIONANALYSIS (VIEW), TRAN_WORKORDER (VIEW) |

### Finance & Accounting

| Use Case | Minimum Permissions |
|---|---|
| **Journal Entry Creation** | TRAN_JOURNALENTRY (CREATE), LIST_ACCOUNT (VIEW) |
| **GL Account Management** | LIST_ACCOUNT (EDIT), REGT_* (EDIT) |
| **Financial Reporting** | REPO_INCOMESTATEMENT (VIEW), REPO_BALANCESHEET (VIEW) |
| **Bank Reconciliation** | REGT_BANK (EDIT), LIST_ACCOUNT (VIEW) |
| **Tax Reporting** | REPO_TAXREPORT (VIEW), REPO_1099 (VIEW) |
| **Budget Tracking** | REPO_BUDGET (VIEW), LIST_ACCOUNT (VIEW) |

### HR & Payroll

| Use Case | Minimum Permissions |
|---|---|
| **Employee Management** | LIST_EMPLOYEE (EDIT), LIST_CONTACT (CREATE) |
| **Time Tracking** | TRAN_TIMEENTRY (CREATE), LIST_PROJECT (VIEW) |
| **Payroll Processing** | LIST_PAYITEM (VIEW), REPO_PAYROLL (VIEW) |
| **Expense Reports** | TRAN_EXPENSE (CREATE), LIST_ACCOUNT (VIEW) |
| **Performance Reviews** | LIST_EMPLOYEE (VIEW), LIST_ACTIVITY (CREATE) |

### Support & Cases

| Use Case | Minimum Permissions |
|---|---|
| **Case Management** | LIST_CASE (EDIT), LIST_CUSTOMER (VIEW) |
| **Issue Tracking** | LIST_ISSUE (EDIT), LIST_CASE (VIEW) |
| **Solution Management** | LIST_SOLUTION (EDIT), LIST_CASE (VIEW) |

### Administration & System

| Use Case | Minimum Permissions |
|---|---|
| **User Account Management** | ADMI_SETUPUSERS (EDIT), ADMI_SETUPROLES (VIEW) |
| **Custom Role Creation** | ADMI_SETUPROLES (CREATE), ADMI_SETUP (EDIT) |
| **SuiteScript Development** | ADMI_SUITESCRIPT (EDIT), ADMI_CUSTOMIZATION (VIEW) |
| **Custom Field Management** | ADMI_CUSTOMFIELD (CREATE), ADMI_CUSTOMIZATION (VIEW) |
| **Workflow Automation** | ADMI_WORKFLOW (CREATE), ADMI_CUSTOMIZATION (VIEW) |
| **Integration Setup** | ADMI_RESTWEBSERVICES (EDIT), ADMI_OAUTH (CREATE) |

---

## Part D: Most Common Permissions

Ranked by frequency of use in production SDF projects and typical NetSuite roles.

| Rank | Permission Key | Category | Label | Why Common |
|---|---|---|---|---|
| 1 | TRAN_SALESORDER | TRAN | Sales Orders | Core to all sales operations |
| 2 | TRAN_INVOICE | TRAN | Invoices | Billing/revenue core |
| 3 | LIST_CUSTOMER | LIST | Customers | Needed for almost every transaction |
| 4 | TRAN_CUSTPAYMENT | TRAN | Customer Payments | AR operations |
| 5 | TRAN_PURCHASEORDER | TRAN | Purchase Orders | Core to purchasing |
| 6 | LIST_VENDOR | LIST | Vendors | Needed for PO and AP operations |
| 7 | TRAN_VENDORBILL | TRAN | Vendor Bills | AP core |
| 8 | TRAN_PAYMENT | TRAN | Vendor Payments | Paying bills |
| 9 | LIST_ITEM | LIST | Items | Inventory/product master |
| 10 | TRAN_JOURNALENTRY | TRAN | Journal Entries | GL and accounting |
| 11 | LIST_ACCOUNT | LIST | Chart of Accounts | Required for any GL operation |
| 12 | TRAN_ITEMRECEIPT | TRAN | Item Receipts | Receiving goods |
| 13 | TRAN_INVENTORYADJUSTMENT | TRAN | Inventory Adjustments | Stock corrections |
| 14 | LIST_LOCATION | LIST | Locations | Multi-warehouse operations |
| 15 | LIST_EMPLOYEE | LIST | Employees | HR and expense tracking |
| 16 | REPO_INCOMESTATEMENT | REPO | Income Statement | Financial reporting |
| 17 | TRAN_EXPENSE | TRAN | Expense Reports | Employee reimbursement |
| 18 | REPO_BALANCESHEET | REPO | Balance Sheet | Financial reporting |
| 19 | LIST_DEPARTMENT | LIST | Departments | Department-based filtering |
| 20 | ADMI_SUITESCRIPT | ADMI | SuiteScript | Custom automation |

---

## Quick Reference: Role Templates

### Read-Only Analyst
```
LIST_CUSTOMER (VIEW)
LIST_VENDOR (VIEW)
LIST_ITEM (VIEW)
LIST_ACCOUNT (VIEW)
REPO_INCOMESTATEMENT (VIEW)
REPO_SALESANALYSIS (VIEW)
REPO_ARAGINGREPORT (VIEW)
REPO_APAGINGREPORT (VIEW)
```

### Order Entry Clerk
```
LIST_CUSTOMER (VIEW)
LIST_ITEM (VIEW)
LIST_LOCATION (VIEW)
TRAN_SALESORDER (CREATE)
TRAN_SALESORDER (EDIT) — own records only
LIST_ACTIVITY (CREATE)
```

### Finance Manager
```
LIST_ACCOUNT (VIEW)
LIST_ACCOUNT (EDIT)
LIST_DEPARTMENT (VIEW)
TRAN_JOURNALENTRY (CREATE)
TRAN_INVOICE (EDIT)
TRAN_CUSTPAYMENT (VIEW)
REPO_INCOMESTATEMENT (VIEW)
REPO_BALANCESHEET (VIEW)
REPO_CASHFLOW (VIEW)
```

### Warehouse Manager
```
LIST_ITEM (VIEW)
LIST_LOCATION (VIEW)
TRAN_ITEMRECEIPT (CREATE)
TRAN_INVENTORYADJUSTMENT (CREATE)
TRAN_TRANSFERORDER (CREATE)
LIST_ACTIVITY (CREATE)
```

---

## Notes

- Permission levels vary by record type. Not all records support all four levels (VIEW/CREATE/EDIT/FULL).
- Custom records inherit permissions structure: `LIST_[CUSTOMRECORD_ID]` with standard levels.
- Use the `permissions.json` file for the complete list of all 684 permissions.
- Apply **Principle of Least Privilege**: Grant only the minimum permissions needed for the job.
- Test custom role permissions with a test user before deploying to production.
- Audit role assignments regularly to prevent permission creep.
