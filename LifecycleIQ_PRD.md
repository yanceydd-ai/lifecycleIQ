# LifecycleIQ Product Requirements Document

**Document purpose:** This document is intended to be imported into a code repository and referenced by Codex during application design and development.

**Working product name:** LifecycleIQ  
**Product category:** Technology budgeting, asset lifecycle management, contract renewal tracking, and multi-year budget forecasting  
**Primary audience:** Technology leadership, finance, procurement, IT operations, and institutional leadership

---

## 1. Product Summary

LifecycleIQ is a decision-support application for technology budgeting. It connects hardware inventory, software licensing, SaaS subscriptions, contract renewals, capital replacement cycles, and operational expenses into a 1–7 year budget roadmap.

The application is not intended to be a passive inventory database. Its primary purpose is to help technology, finance, and leadership teams decide what to renew, replace, retire, defer, consolidate, or fund.

The product should turn technology records into budget intelligence.

---

## 2. Product Thesis

Technology budgeting is difficult because asset records, software renewals, support contracts, licensing counts, capital refresh schedules, and long-term strategic planning are often scattered across spreadsheets, invoices, ticketing systems, vendor portals, procurement files, and staff knowledge.

LifecycleIQ should answer these questions:

1. What do we own, license, support, or subscribe to?
2. What requires action soon?
3. What must be funded this fiscal year?
4. What can be reduced, deferred, consolidated, or retired?
5. What are the projected OpEx and CapEx needs over the next 1–7 years?
6. Where are future budget spikes?
7. What risks are created if a renewal or replacement is delayed?
8. What recommendation should leadership consider?

---

## 3. Guiding Standards and Reference Concepts

The application should be informed by the following practices and standards:

1. **IT Asset Management:** ISO/IEC 19770-1 defines requirements for an IT asset management system and can apply to all types of IT assets and organizations.
2. **Cybersecurity Asset Inventory:** NIST Cybersecurity Framework 2.0 includes asset management as part of the Identify function, including hardware, software, systems, services, people, and facilities.
3. **Budgeting and Forecasting:** FinOps guidance defines budgeting as establishing approved funding for planned technology activities and forecasting as modeling anticipated future cost and value using historical spend, planned changes, and related metrics.
4. **Application Security:** OWASP ASVS provides a basis for testing web application security controls and secure development requirements.

References are listed at the end of this document.

---

## 4. Intended Users

### 4.1 Technology Director / CIO

Needs:

- View upcoming renewals.
- Forecast operational and capital budgets.
- Identify budget spikes.
- Support funding requests.
- Track lifecycle risk.
- Create leadership-ready summaries.

### 4.2 IT Operations / Helpdesk Manager

Needs:

- Track hardware assets.
- Track warranty and support expiration.
- Manage device refreshes.
- Identify assets due for replacement.
- Plan summer work.

### 4.3 Finance / CFO / Business Office

Needs:

- View 1–7 year budget projections.
- Distinguish operational and capital spending.
- Review upcoming renewals.
- Compare scenarios.
- Understand funding risk and timing.

### 4.4 Procurement / Contract Owner

Needs:

- Track contract dates.
- Monitor cancellation windows.
- Maintain vendor contacts.
- Record approval status.
- Store or link contract documents.

### 4.5 Department Leaders

Needs:

- Review technology items assigned to their department.
- Validate usage and need.
- Provide renewal input.

### 4.6 Leadership Team

Needs:

- View simplified budget roadmap.
- See high-risk unfunded items.
- Understand major upcoming technology decisions.

---

## 5. Core Design Principle

Every record must support a decision.

Avoid this workflow:

```text
Add asset -> edit asset -> report asset
```

Support this workflow:

```text
Identify upcoming decision -> evaluate cost, risk, value, and timing -> choose action -> update budget roadmap
```

---

## 6. Core Decision Types

| Decision | Applies To |
|---|---|
| Renew | Software, SaaS, support, contracts |
| Reduce | Licenses, subscriptions, service quantities |
| Replace | Hardware, software, infrastructure |
| Retire | Hardware, legacy systems, unused software |
| Defer | Capital replacements, non-critical purchases |
| Consolidate | Redundant software or services |
| Fund | Required capital or operational budget items |
| Escalate | High-cost, high-risk, or strategic items |
| Monitor | Items not yet ready for action |

---

## 7. Product Scope

### 7.1 MVP Scope

The MVP must include:

1. User authentication.
2. Role-based permissions.
3. Hardware inventory.
4. Software and SaaS inventory.
5. Contract and renewal tracking.
6. License quantity and utilization tracking.
7. Replacement lifecycle rules.
8. OpEx and CapEx classification.
9. 1–7 year budget forecast.
10. Budget scenario planning.
11. Renewal and cancellation alerts.
12. Decision status tracking.
13. Recommendation engine.
14. Executive dashboard.
15. CSV/XLSX import.
16. CSV/XLSX export.
17. Decision history.
18. Basic audit log.

### 7.2 Post-MVP Scope

Future features may include:

1. Microsoft Entra ID SSO.
2. Microsoft Intune import.
3. Meraki inventory import.
4. Microsoft 365 license usage import.
5. Power BI export.
6. SharePoint contract document integration.
7. AI-generated budget summaries.
8. AI-assisted savings recommendations.
9. Approval workflows.
10. Vendor scorecards.
11. Barcode or QR asset scanning.
12. Purchase request workflow.
13. Depreciation schedules.
14. Grant/funding source tracking.
15. API integrations with service desk platforms.
16. Multi-tenant support.

### 7.3 Explicit Non-Goals for MVP

The MVP should not attempt to be:

1. A full service desk.
2. A real-time device discovery platform.
3. A procurement system.
4. A general accounting system.
5. A replacement for ERP.
6. A mobile-first asset scanner.
7. A fully automated AI decision maker.

The MVP should assist human decision-making, not make final budget decisions automatically.

---

## 8. Product Modules

## 8.1 Dashboard Module

### Purpose

Provide a leadership and operations summary of upcoming decisions, financial exposure, budget forecasts, and lifecycle risks.

### Required Dashboard Widgets

#### Executive Summary Cards

Display:

- Current fiscal year OpEx forecast.
- Current fiscal year CapEx forecast.
- Total forecasted spend over 3 years.
- Total forecasted spend over 7 years.
- Renewals due in next 30/60/90/120 days.
- Cancellation deadlines in next 30/60/90/120 days.
- High-risk unsupported assets.
- Budget spike years.
- Potential savings opportunities.

#### Upcoming Decisions

Show items requiring action.

Columns:

- Item name
- Type
- Decision needed
- Due date
- Fiscal year
- Cost
- Risk level
- Recommended action
- Owner
- Status

#### Budget Roadmap Chart

Show annual forecast for years 1–7.

Break down by:

- Operational expense
- Capital expense
- Category
- Department
- Required vs. optional
- Approved vs. pending

#### Budget Spike Detection

Show years where projected spending exceeds a configurable threshold.

Example:

```text
If FY2028 forecast is 30% higher than the rolling 3-year average, flag as budget spike.
```

### Acceptance Criteria

- User can view dashboard after login.
- User can filter by fiscal year, department, category, and funding type.
- User can click a dashboard item to open the source record.
- Dashboard totals must match underlying budget item totals.
- Dashboard must distinguish OpEx and CapEx.

---

## 8.2 Hardware Asset Module

### Purpose

Track physical technology assets and support lifecycle replacement planning.

### Asset Types

Initial supported asset types:

- Laptop
- Desktop
- Tablet
- Server
- Storage
- Network switch
- Wireless access point
- Firewall
- UPS
- Printer
- MFP/copier
- Classroom display
- Projector
- AV equipment
- Phone
- Camera
- IoT device
- Other

### Required Fields

- Asset ID
- Asset tag
- Asset type
- Manufacturer
- Model
- Serial number
- Purchase date
- Purchase cost
- Current estimated replacement cost
- Useful life in years
- Replacement fiscal year
- Warranty start date
- Warranty end date
- Support end date
- Location
- Department
- Assigned user
- Business owner
- Technical owner
- Funding type: OpEx or CapEx
- Lifecycle status
- Criticality
- Security risk
- Operational impact
- Notes

### Lifecycle Status Values

- Planned
- Ordered
- Active
- Spare
- In repair
- Due for replacement
- Deferred
- Retired
- Disposed

### Criticality Values

- Low
- Medium
- High
- Mission-critical

### Hardware Calculations

#### Replacement Fiscal Year

Default formula:

```text
replacement_year = purchase_year + useful_life_years
```

The user must be able to override the calculated replacement year.

#### Replacement Status

Rules:

- If current fiscal year is greater than or equal to replacement fiscal year, status may be "Due for replacement."
- If warranty end date has passed, flag as "Warranty expired."
- If support end date has passed, flag as "Unsupported."
- If asset is mission-critical and support has expired, flag as "High risk."

### Acceptance Criteria

- User can create, read, update, and archive hardware assets.
- User can bulk import assets from CSV/XLSX.
- System calculates replacement fiscal year.
- User can manually override replacement fiscal year.
- Asset appears in budget forecast if replacement cost and replacement year exist.
- Retired/disposed assets do not appear in future budget forecast unless explicitly included.

---

## 8.3 Software and SaaS Module

### Purpose

Track software, SaaS platforms, subscriptions, licensing, ownership, utilization, and renewal decisions.

### Required Fields

- Software ID
- Product name
- Vendor
- Category
- Description
- License model
- Quantity purchased
- Quantity assigned
- Quantity actively used
- Unit cost
- Annual cost
- Billing frequency
- Contract start date
- Contract end date
- Renewal date
- Cancellation notice deadline
- Auto-renewal flag
- Business owner
- Technical owner
- Budget owner
- Department
- Funding type
- Strategic value
- Risk if not renewed
- Duplicate/overlap notes
- Recommended action
- Decision status
- Notes

### License Model Values

- Per user
- Per device
- Site license
- FTE-based
- Concurrent user
- Consumption-based
- Flat annual
- Multi-year agreement
- Other

### Software Status Values

- Active
- Trial
- Under review
- Renewal pending
- Sunset planned
- Replaced
- Terminated

### Recommended Action Values

- Renew as-is
- Renew with reduction
- Expand
- Renegotiate
- Replace
- Consolidate
- Terminate
- Monitor
- Escalate

### Software Calculations

#### Utilization Rate

```text
utilization_rate = quantity_actively_used / quantity_purchased
```

#### Unused License Count

```text
unused_licenses = quantity_purchased - quantity_actively_used
```

#### Potential Savings Estimate

```text
potential_savings = unused_licenses * unit_cost
```

Only calculate when license model is compatible with per-license pricing.

### Acceptance Criteria

- User can track software and SaaS products.
- User can enter purchased, assigned, and actively used license counts.
- System calculates utilization rate.
- System flags low-utilization products.
- System tracks renewal date and cancellation notice deadline.
- System includes software cost in OpEx forecast unless classified otherwise.
- System supports sunset date where cost drops to zero after termination.

---

## 8.4 Contract and Renewal Module

### Purpose

Track contracts, support agreements, service renewals, vendor obligations, cancellation windows, and decision deadlines.

### Required Fields

- Contract ID
- Contract name
- Vendor
- Contract type
- Related asset or software
- Start date
- End date
- Renewal date
- Notice period in days
- Cancellation deadline
- Auto-renewal flag
- Annual cost
- Known renewal cost
- Escalation percentage
- Payment frequency
- Business owner
- Technical owner
- Budget owner
- Approval status
- Document link
- Notes

### Contract Type Values

- Software subscription
- SaaS agreement
- Hardware support
- Maintenance agreement
- Managed service
- Telecom
- Internet circuit
- Cloud service
- Professional service
- Warranty
- Other

### Approval Status Values

- Not reviewed
- Review required
- Pending quote
- Pending approval
- Approved
- Rejected
- Deferred
- Cancelled

### Renewal Alert Rules

System must create alerts for:

- Renewal due within 120 days.
- Renewal due within 90 days.
- Renewal due within 60 days.
- Renewal due within 30 days.
- Cancellation deadline within 120 days.
- Cancellation deadline within 90 days.
- Cancellation deadline within 60 days.
- Cancellation deadline within 30 days.
- Contract has auto-renewal and no decision status.
- Contract has cost increase above configured threshold.

### Acceptance Criteria

- User can associate contracts with hardware, software, or standalone services.
- System calculates cancellation deadline from renewal date and notice period.
- User can override cancellation deadline.
- System generates renewal and cancellation alerts.
- Contract costs appear in forecast.
- Contract documents can be linked.

---

## 8.5 Budget Forecasting Module

### Purpose

Generate 1–7 year OpEx and CapEx budget forecasts based on asset lifecycle, renewals, contracts, known projects, escalation rates, and user-entered assumptions.

### Forecast Inputs

- Hardware replacement year
- Hardware replacement cost
- Software annual cost
- Software renewal date
- Contract annual cost
- Contract renewal cost
- Escalation percentage
- Known future project costs
- Sunset dates
- Deferral decisions
- Scenario assumptions
- Department
- Category
- Funding type

### Forecast Output

For each fiscal year:

- Total OpEx
- Total CapEx
- Total forecast
- Forecast by department
- Forecast by category
- Forecast by vendor
- Required items
- Optional items
- Deferred items
- Approved items
- Pending items
- Savings opportunities
- Risk exposure

### Fiscal Year Configuration

The system must allow admin users to define:

- Fiscal year start month
- Fiscal year naming convention
- Default forecast length: 1–7 years
- Default escalation rate
- Capital threshold amount
- Budget spike threshold

### Forecast Logic

#### Operational Expenses

Recurring operational expenses should continue annually unless:

- termination date exists
- sunset status exists
- replacement product takes over
- user excludes from forecast

#### Capital Expenses

Capital expenses should appear in the assigned replacement or project fiscal year.

#### Escalation

If a line item has an escalation percentage, apply annually.

```text
future_cost = current_cost * (1 + escalation_rate) ^ years_forward
```

#### Known Renewal Cost

If known renewal cost exists, use known renewal cost instead of calculated escalation.

#### Sunset Logic

If sunset fiscal year exists:

- include cost up to sunset year
- exclude cost after sunset year

#### Deferred Replacement Logic

If an asset replacement is deferred:

- move replacement cost to new fiscal year
- flag deferred risk
- record decision history

### Acceptance Criteria

- User can generate a 1-year forecast.
- User can generate a 3-year forecast.
- User can generate a 5-year forecast.
- User can generate a 7-year forecast.
- Forecast separates OpEx and CapEx.
- User can filter by department, category, vendor, and funding type.
- User can export forecast to CSV/XLSX.
- Forecast updates when source records change.
- Forecast supports scenario comparison.

---

## 8.6 Scenario Planning Module

### Purpose

Allow users to model alternative budget futures without changing the approved baseline.

### Required Scenarios

System must support:

- Baseline
- Conservative
- Expected
- Aggressive
- Custom scenario

### Scenario Capabilities

User can create a scenario and adjust:

- escalation rates
- replacement years
- renewal decisions
- license quantities
- project timing
- deferrals
- terminations
- new initiatives
- cost assumptions

### Scenario Comparison

The system must show:

- baseline vs. scenario total
- annual difference
- cumulative difference
- OpEx difference
- CapEx difference
- savings
- added risk
- deferred items

### Acceptance Criteria

- User can create a scenario.
- User can duplicate baseline into a new scenario.
- User can modify scenario assumptions without changing baseline.
- User can compare scenarios side by side.
- User can mark one scenario as recommended.
- User can export scenario comparison.

---

## 8.7 Recommendation Engine

### Purpose

Generate consistent, explainable recommendations for budget decisions.

### Recommendation Types

- Renew as-is
- Renew with reduction
- Renegotiate
- Replace
- Retire
- Defer
- Consolidate
- Terminate
- Escalate
- Monitor

### Required Recommendation Inputs

- Cost
- Renewal date
- Cancellation deadline
- Utilization
- Criticality
- Strategic value
- Security risk
- Operational impact
- Support status
- Warranty status
- Budget spike impact
- Duplicate functionality
- Owner input
- Decision history

### Priority Score

Each item should receive a priority score from 0 to 100.

Suggested formula:

```text
priority_score =
  (criticality_score * 0.30)
+ (lifecycle_risk_score * 0.25)
+ (security_risk_score * 0.20)
+ (user_impact_score * 0.15)
+ (financial_urgency_score * 0.10)
```

### Score Classification

| Score | Classification |
|---|---|
| 85–100 | Must fund |
| 70–84 | Strongly recommended |
| 50–69 | Plan carefully |
| 30–49 | Optional or defer |
| 0–29 | Retirement candidate |

### Recommendation Explanation

Every recommendation must include an explanation.

Example:

```text
Recommendation: Renew with reduction.

Reason:
Current license count is 500. Active usage is 372. Renewal is due in 85 days.
Reducing to 400 licenses may reduce annual cost while preserving operational coverage.
```

### Acceptance Criteria

- System generates recommendation for assets, software, and contracts.
- Recommendation includes score, classification, and explanation.
- User can override recommendation.
- Override requires a reason.
- Original recommendation remains visible in decision history.
- Recommendation logic must be deterministic and testable.

---

## 8.8 Decision History Module

### Purpose

Maintain a record of budget decisions, overrides, approvals, and rationale.

### Required Fields

- Decision ID
- Related record type
- Related record ID
- Decision type
- Previous status
- New status
- Previous cost
- New cost
- Previous fiscal year
- New fiscal year
- Decision owner
- Decision date
- Rationale
- Approval status
- Notes

### Acceptance Criteria

- Every change to recommendation status creates a decision history entry.
- Every deferral creates a decision history entry.
- Every override creates a decision history entry.
- User can view decision history on each item.
- User can export decision history.

---

## 8.9 Import and Export Module

### Purpose

Allow users to start from existing spreadsheets and export reports for finance and leadership.

### Required Imports

- Hardware assets
- Software inventory
- Contracts
- Vendors
- Departments
- Locations
- Budget items

### Import Features

- CSV upload
- XLSX upload
- Field mapping
- Validation preview
- Duplicate detection
- Import error report
- Dry-run mode
- Commit mode

### Required Exports

- Hardware asset list
- Software inventory
- Contract renewal list
- Upcoming decisions
- 1-year budget forecast
- 3-year budget forecast
- 5-year budget forecast
- 7-year budget forecast
- Scenario comparison
- Executive summary data

### Acceptance Criteria

- User can upload CSV/XLSX.
- System validates required fields.
- System reports missing or invalid data.
- System allows user to map columns.
- User can export filtered tables.
- Exported data must match active filters.

---

## 8.10 Reporting Module

### Purpose

Generate leadership-ready summaries.

### Required Reports

#### Executive Budget Summary

Includes:

- Current-year OpEx
- Current-year CapEx
- 3-year forecast
- 7-year forecast
- Top 10 renewals
- Top 10 capital replacements
- High-risk unfunded items
- Savings opportunities
- Budget spike years
- Recommended decisions

#### Renewal Review Report

Includes:

- Renewals due in next 120 days
- Cancellation deadlines
- Owner
- Cost
- Utilization
- Recommended action
- Approval status

#### Capital Replacement Report

Includes:

- Assets due for replacement by fiscal year
- Cost by category
- Cost by location
- Deferred items
- Support/warranty risk

#### Software Optimization Report

Includes:

- Low-utilization products
- Unused license estimates
- Duplicate functionality notes
- Termination candidates
- Renewal recommendations

### Acceptance Criteria

- User can generate reports from current data.
- User can filter reports by fiscal year, department, category, and owner.
- User can export reports to CSV/XLSX.
- Future version may export PDF/DOCX.

---

# 9. Data Model

Use a relational database.

Recommended database: PostgreSQL.

## 9.1 Tables

### users

```sql
id UUID PRIMARY KEY
email TEXT UNIQUE NOT NULL
display_name TEXT NOT NULL
role TEXT NOT NULL
department_id UUID NULL
is_active BOOLEAN DEFAULT TRUE
created_at TIMESTAMP
updated_at TIMESTAMP
```

### departments

```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
budget_code TEXT NULL
owner_user_id UUID NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

### locations

```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
building TEXT NULL
room TEXT NULL
location_type TEXT NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

### vendors

```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
website TEXT NULL
account_rep_name TEXT NULL
account_rep_email TEXT NULL
support_email TEXT NULL
notes TEXT NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

### hardware_assets

```sql
id UUID PRIMARY KEY
asset_tag TEXT UNIQUE NULL
asset_type TEXT NOT NULL
manufacturer TEXT NULL
model TEXT NULL
serial_number TEXT NULL
purchase_date DATE NULL
purchase_cost NUMERIC NULL
replacement_cost NUMERIC NULL
useful_life_years INTEGER NULL
calculated_replacement_year INTEGER NULL
override_replacement_year INTEGER NULL
warranty_start_date DATE NULL
warranty_end_date DATE NULL
support_end_date DATE NULL
location_id UUID NULL
department_id UUID NULL
assigned_user TEXT NULL
business_owner_id UUID NULL
technical_owner_id UUID NULL
funding_type TEXT CHECK (funding_type IN ('OpEx','CapEx'))
lifecycle_status TEXT NOT NULL
criticality TEXT NOT NULL
security_risk TEXT NULL
operational_impact TEXT NULL
notes TEXT NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

### software_products

```sql
id UUID PRIMARY KEY
product_name TEXT NOT NULL
vendor_id UUID NULL
category TEXT NULL
description TEXT NULL
license_model TEXT NULL
business_owner_id UUID NULL
technical_owner_id UUID NULL
budget_owner_id UUID NULL
department_id UUID NULL
funding_type TEXT CHECK (funding_type IN ('OpEx','CapEx'))
strategic_value TEXT NULL
risk_if_not_renewed TEXT NULL
status TEXT NOT NULL
duplicate_notes TEXT NULL
replacement_product_id UUID NULL
notes TEXT NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

### software_licenses

```sql
id UUID PRIMARY KEY
software_product_id UUID NOT NULL
quantity_purchased INTEGER NULL
quantity_assigned INTEGER NULL
quantity_actively_used INTEGER NULL
unit_cost NUMERIC NULL
annual_cost NUMERIC NULL
billing_frequency TEXT NULL
start_date DATE NULL
end_date DATE NULL
renewal_date DATE NULL
notice_period_days INTEGER NULL
cancellation_deadline DATE NULL
auto_renew BOOLEAN DEFAULT FALSE
status TEXT NOT NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

### contracts

```sql
id UUID PRIMARY KEY
contract_name TEXT NOT NULL
vendor_id UUID NULL
contract_type TEXT NOT NULL
related_record_type TEXT NULL
related_record_id UUID NULL
start_date DATE NULL
end_date DATE NULL
renewal_date DATE NULL
notice_period_days INTEGER NULL
cancellation_deadline DATE NULL
auto_renew BOOLEAN DEFAULT FALSE
annual_cost NUMERIC NULL
known_renewal_cost NUMERIC NULL
escalation_percentage NUMERIC NULL
payment_frequency TEXT NULL
business_owner_id UUID NULL
technical_owner_id UUID NULL
budget_owner_id UUID NULL
approval_status TEXT NOT NULL
document_link TEXT NULL
notes TEXT NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

### budget_items

```sql
id UUID PRIMARY KEY
fiscal_year INTEGER NOT NULL
category TEXT NOT NULL
description TEXT NOT NULL
source_type TEXT NULL
source_id UUID NULL
cost NUMERIC NOT NULL
funding_type TEXT CHECK (funding_type IN ('OpEx','CapEx'))
department_id UUID NULL
vendor_id UUID NULL
priority_score INTEGER NULL
required_or_optional TEXT NULL
approval_status TEXT NULL
scenario_id UUID NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

### scenarios

```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
description TEXT NULL
is_baseline BOOLEAN DEFAULT FALSE
default_escalation_rate NUMERIC NULL
created_by UUID NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

### recommendations

```sql
id UUID PRIMARY KEY
related_record_type TEXT NOT NULL
related_record_id UUID NOT NULL
recommendation_type TEXT NOT NULL
priority_score INTEGER NOT NULL
classification TEXT NOT NULL
explanation TEXT NOT NULL
generated_at TIMESTAMP
overridden BOOLEAN DEFAULT FALSE
override_reason TEXT NULL
overridden_by UUID NULL
overridden_at TIMESTAMP NULL
```

### decision_history

```sql
id UUID PRIMARY KEY
related_record_type TEXT NOT NULL
related_record_id UUID NOT NULL
decision_type TEXT NOT NULL
previous_status TEXT NULL
new_status TEXT NULL
previous_cost NUMERIC NULL
new_cost NUMERIC NULL
previous_fiscal_year INTEGER NULL
new_fiscal_year INTEGER NULL
decision_owner_id UUID NULL
decision_date TIMESTAMP
rationale TEXT NULL
approval_status TEXT NULL
notes TEXT NULL
created_at TIMESTAMP
```

### alerts

```sql
id UUID PRIMARY KEY
related_record_type TEXT NOT NULL
related_record_id UUID NOT NULL
alert_type TEXT NOT NULL
severity TEXT NOT NULL
message TEXT NOT NULL
due_date DATE NULL
is_resolved BOOLEAN DEFAULT FALSE
resolved_by UUID NULL
resolved_at TIMESTAMP NULL
created_at TIMESTAMP
```

### audit_log

```sql
id UUID PRIMARY KEY
user_id UUID NULL
action TEXT NOT NULL
entity_type TEXT NOT NULL
entity_id UUID NOT NULL
old_value JSONB NULL
new_value JSONB NULL
created_at TIMESTAMP
```

---

# 10. Permissions

## 10.1 Roles

### Admin

Can:

- Manage all records.
- Manage users.
- Configure fiscal year settings.
- Import/export all data.
- Override recommendations.
- Delete/archive records.

### Editor

Can:

- Create and edit assigned records.
- Create scenarios.
- Update decision status.
- Export reports.

### Finance Viewer

Can:

- View budget forecasts.
- View contracts.
- View reports.
- Export budget reports.
- Cannot edit asset records unless granted.

### Department Viewer

Can:

- View items assigned to their department.
- Provide notes or review status.
- Cannot edit financial assumptions unless granted.

### Read-Only Viewer

Can:

- View dashboards and reports only.

## 10.2 Acceptance Criteria

- API must enforce role permissions.
- UI must hide actions unavailable to the user.
- All write actions must be logged in audit_log.

---

# 11. Security Requirements

Security design should use OWASP ASVS as a reference for web application security verification.

Minimum requirements:

1. All users must authenticate.
2. Password authentication, if used, must be secure.
3. Prefer Microsoft Entra ID SSO in post-MVP.
4. Enforce role-based access control on the server side.
5. Validate all inputs.
6. Use parameterized database queries.
7. Protect against injection attacks.
8. Protect against cross-site scripting.
9. Protect against cross-site request forgery if using cookies.
10. Encrypt data in transit.
11. Encrypt secrets at rest.
12. Do not store passwords in plaintext.
13. Log security-relevant actions.
14. Do not expose stack traces to users.
15. Use least-privilege database access.
16. Support audit logging for record changes.

---

# 12. Application Architecture

## 12.1 Recommended Stack

### Front End

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts for charts

### Back End

- Python FastAPI or Node.js/NestJS
- REST API for MVP
- PostgreSQL database
- SQLAlchemy or Prisma ORM

### Authentication

MVP:

- Local authentication or simple OAuth provider.

Preferred:

- Microsoft Entra ID SSO.

### Hosting

Recommended:

- Azure App Service
- Azure Container Apps
- Azure Database for PostgreSQL

Alternative:

- Docker Compose for local development
- Containerized deployment

## 12.2 API Design

Use RESTful endpoints.

Example endpoint groups:

```text
/api/auth
/api/users
/api/departments
/api/locations
/api/vendors
/api/hardware-assets
/api/software-products
/api/software-licenses
/api/contracts
/api/budget-forecast
/api/scenarios
/api/recommendations
/api/decision-history
/api/alerts
/api/import
/api/export
/api/reports
```

---

# 13. Core API Requirements

## 13.1 Hardware Asset API

Required endpoints:

```text
GET /api/hardware-assets
GET /api/hardware-assets/:id
POST /api/hardware-assets
PUT /api/hardware-assets/:id
DELETE /api/hardware-assets/:id
POST /api/hardware-assets/import
GET /api/hardware-assets/export
```

## 13.2 Software API

Required endpoints:

```text
GET /api/software-products
GET /api/software-products/:id
POST /api/software-products
PUT /api/software-products/:id
DELETE /api/software-products/:id
```

## 13.3 Contract API

Required endpoints:

```text
GET /api/contracts
GET /api/contracts/:id
POST /api/contracts
PUT /api/contracts/:id
DELETE /api/contracts/:id
GET /api/contracts/upcoming-renewals
GET /api/contracts/cancellation-deadlines
```

## 13.4 Forecast API

Required endpoints:

```text
GET /api/forecast?years=7
GET /api/forecast/:fiscalYear
POST /api/forecast/recalculate
GET /api/forecast/export
```

## 13.5 Scenario API

Required endpoints:

```text
GET /api/scenarios
GET /api/scenarios/:id
POST /api/scenarios
PUT /api/scenarios/:id
DELETE /api/scenarios/:id
POST /api/scenarios/:id/duplicate
GET /api/scenarios/compare
```

## 13.6 Recommendation API

Required endpoints:

```text
GET /api/recommendations
GET /api/recommendations/:id
POST /api/recommendations/recalculate
POST /api/recommendations/:id/override
```

---

# 14. User Stories

## 14.1 Technology Director

### Story 1

As a Technology Director, I want to view all technology decisions due in the next 120 days so that I can prepare budget and renewal actions early.

Acceptance criteria:

- Dashboard shows renewal, replacement, cancellation, and review deadlines.
- Items are sorted by urgency.
- Each item shows cost, owner, recommendation, and risk.

### Story 2

As a Technology Director, I want to generate a 7-year technology budget roadmap so that I can brief finance and leadership on future funding needs.

Acceptance criteria:

- User can select 1, 3, 5, or 7 years.
- Forecast includes OpEx and CapEx.
- Forecast includes assets, software, contracts, and roadmap items.
- Forecast can be exported.

### Story 3

As a Technology Director, I want the system to identify budget spikes so that I can smooth future costs.

Acceptance criteria:

- System compares each fiscal year against configurable threshold.
- Spike years are visually flagged.
- System lists major drivers of the spike.

## 14.2 Finance User

### Story 4

As a Finance user, I want to see operational and capital expenses separately so that I can align the forecast with budget categories.

Acceptance criteria:

- All budget views separate OpEx and CapEx.
- User can filter by funding type.
- Export includes funding type.

### Story 5

As a Finance user, I want to compare budget scenarios so that leadership can evaluate cost tradeoffs.

Acceptance criteria:

- User can compare baseline to at least one scenario.
- Comparison shows annual and cumulative differences.
- Comparison shows savings and risk.

## 14.3 IT Operations User

### Story 6

As an IT Operations user, I want to view assets due for replacement so that I can plan refresh projects.

Acceptance criteria:

- Assets can be filtered by replacement fiscal year.
- Assets can be filtered by location, department, and asset type.
- User can update lifecycle status.

### Story 7

As an IT Operations user, I want to flag unsupported or out-of-warranty assets so that risk can be included in budget planning.

Acceptance criteria:

- System identifies expired warranty.
- System identifies expired support.
- System assigns risk flag.

## 14.4 Procurement User

### Story 8

As a Procurement user, I want to track cancellation deadlines so that we do not miss notice windows.

Acceptance criteria:

- System calculates deadline from renewal date and notice period.
- User can override deadline.
- Alerts are generated before deadline.

---

# 15. Business Logic

## 15.1 Fiscal Year Logic

Admin configures fiscal year start month.

Example:

```text
If fiscal year starts July 1, then July 1, 2026 through June 30, 2027 is FY2027.
```

## 15.2 Renewal Alert Logic

Generate alert when:

```text
days_until_renewal <= configured_threshold
```

Default thresholds:

- 120 days
- 90 days
- 60 days
- 30 days

## 15.3 Cancellation Deadline Logic

Default calculation:

```text
cancellation_deadline = renewal_date - notice_period_days
```

## 15.4 Budget Spike Logic

Default:

```text
if fiscal_year_total > rolling_average * 1.30:
    flag_budget_spike = true
```

Threshold must be configurable.

## 15.5 Low Utilization Logic

Default:

```text
if utilization_rate < 0.70:
    flag_low_utilization = true
```

Threshold must be configurable.

## 15.6 Unsupported Asset Logic

```text
if support_end_date < today:
    flag_unsupported = true
```

## 15.7 Warranty Expiration Logic

```text
if warranty_end_date < today:
    flag_warranty_expired = true
```

---

# 16. UI Requirements

## 16.1 Navigation

Primary navigation:

- Dashboard
- Decisions
- Assets
- Software
- Contracts
- Budget Roadmap
- Scenarios
- Reports
- Imports
- Settings

## 16.2 Decisions Page

This should be a central workflow page.

Columns:

- Item
- Type
- Decision needed
- Due date
- Cost
- Fiscal year
- Owner
- Risk
- Recommendation
- Status

Filters:

- Due date range
- Fiscal year
- Owner
- Department
- Recommendation
- Risk level
- Funding type

Actions:

- Approve
- Defer
- Renew
- Reduce
- Terminate
- Replace
- Assign owner
- Add note

## 16.3 Asset Detail Page

Sections:

- Overview
- Lifecycle
- Financials
- Location/assignment
- Warranty/support
- Budget impact
- Recommendation
- Decision history
- Notes

## 16.4 Software Detail Page

Sections:

- Overview
- Licensing
- Usage
- Renewal
- Financials
- Overlap/consolidation
- Recommendation
- Decision history
- Notes

## 16.5 Contract Detail Page

Sections:

- Overview
- Dates
- Renewal/cancellation
- Financials
- Related assets/software
- Documents
- Approval status
- Decision history
- Notes

## 16.6 Budget Roadmap Page

Views:

- Annual summary
- OpEx vs. CapEx
- Category view
- Department view
- Vendor view
- Budget spike view
- Scenario comparison

Charts:

- Stacked bar chart by fiscal year
- Line chart for total forecast
- Table of forecast drivers
- Budget spike flags

---

# 17. Reporting and Export Requirements

## 17.1 Export Formats

MVP:

- CSV
- XLSX

Future:

- PDF
- DOCX
- PPTX

## 17.2 Required Report Exports

- Executive Budget Summary
- Renewal Review Report
- Capital Replacement Report
- Software Optimization Report
- Scenario Comparison Report
- Decision History Report

---

# 18. Notifications

## 18.1 MVP Notifications

In-app alerts only.

## 18.2 Future Notifications

- Email alerts
- Microsoft Teams notifications
- Calendar reminders
- Power Automate workflow

---

# 19. Settings

Admin settings:

- Organization name
- Fiscal year start month
- Default forecast length
- Default escalation rate
- Capital threshold
- Budget spike threshold
- Low-utilization threshold
- Renewal alert thresholds
- Cancellation alert thresholds
- Default useful life by asset type
- Role management

---

# 20. Success Metrics

The product should be considered successful if it can:

1. Produce a usable 7-year technology budget roadmap.
2. Identify all renewals due in the next 120 days.
3. Identify all cancellation deadlines in the next 120 days.
4. Distinguish OpEx and CapEx accurately.
5. Show budget spikes before they occur.
6. Identify low-utilization software.
7. Track decision history.
8. Support scenario comparison.
9. Export leadership-ready budget data.
10. Reduce reliance on disconnected spreadsheets.

---

# 21. MVP Build Sequence

## Phase 1: Foundation

Build:

- Authentication
- Users
- Departments
- Vendors
- Locations
- Base layout
- Database schema
- Audit logging

## Phase 2: Inventory

Build:

- Hardware CRUD
- Software CRUD
- Contract CRUD
- Import/export

## Phase 3: Forecasting

Build:

- Fiscal year settings
- Replacement calculations
- Renewal calculations
- OpEx/CapEx forecast
- 1–7 year roadmap

## Phase 4: Decisions

Build:

- Recommendation engine
- Decision status
- Decision history
- Alerts
- Dashboard

## Phase 5: Scenarios and Reports

Build:

- Scenario creation
- Scenario comparison
- Executive reports
- Export functions

---

# 22. Testing Requirements

## 22.1 Unit Tests

Required for:

- Fiscal year calculation
- Replacement year calculation
- Cancellation deadline calculation
- Renewal alert logic
- Budget forecast calculation
- Escalation calculation
- Utilization calculation
- Recommendation scoring

## 22.2 Integration Tests

Required for:

- Asset CRUD
- Software CRUD
- Contract CRUD
- Forecast generation
- Scenario comparison
- Import workflow
- Export workflow

## 22.3 Security Tests

Required for:

- Authentication
- Authorization
- Role enforcement
- Input validation
- Unauthorized API access
- Audit logging

---

# 23. Seed Data

Create sample seed data for:

- 5 departments
- 5 locations
- 10 vendors
- 25 hardware assets
- 15 software products
- 10 contracts
- 3 scenarios
- 20 budget items

Seed data should include:

- At least one expired warranty
- At least one upcoming renewal
- At least one upcoming cancellation deadline
- At least one low-utilization software product
- At least one FY budget spike
- At least one deferred replacement

---

# 24. Codex Build Instructions

When generating code:

1. Build the application incrementally.
2. Prioritize clean data models and deterministic business logic.
3. Keep recommendation logic explainable.
4. Do not create AI-driven features in MVP.
5. Do not hard-code fiscal year assumptions.
6. All dates must be timezone-safe.
7. All currency values should use decimal numeric types, not floating point.
8. All write actions must create audit log entries.
9. All recommendation overrides must require rationale.
10. All forecast values must trace back to source records.
11. Keep UI simple, clean, and suitable for finance and leadership review.
12. Use TypeScript on the front end.
13. Use a relational database.
14. Include test coverage for forecasting and recommendation logic.
15. Prefer clarity over clever abstractions.

---

# 25. Definition of Done for MVP

The MVP is done when:

1. A user can import hardware, software, and contract data.
2. The system calculates lifecycle replacement years.
3. The system tracks renewals and cancellation deadlines.
4. The system generates a 1–7 year budget forecast.
5. The forecast separates OpEx and CapEx.
6. The system identifies upcoming decisions.
7. The system generates recommendation statuses.
8. The user can create and compare scenarios.
9. The user can export budget reports.
10. The dashboard gives leadership a clear view of cost, risk, timing, and decisions.

---

# 26. Suggested First Codex Prompt

Use this prompt after placing this PRD in the repository:

```text
Read PRD.md and generate the initial application architecture for LifecycleIQ.
Start with the database schema, backend API structure, and front-end route structure.
Do not build AI features yet.
Prioritize the data model, fiscal year logic, asset/software/contract CRUD, audit logging, and deterministic budget forecasting.
Return a proposed file structure and implementation plan before writing code.
```

---

# 27. Final Product Guardrail

The application must remain a decision-support system.

Inventory is only useful when it helps answer:

- What needs funding?
- What can wait?
- What creates risk?
- What can be reduced?
- What should be retired?
- What should leadership approve?

---

# 28. References

1. ISO, **ISO/IEC 19770-1:2017 — IT asset management**, https://www.iso.org/standard/68531.html
2. NIST, **Cybersecurity Framework 2.0**, https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf
3. CSF Tools, **NIST CSF 2.0 ID.AM-02: Inventories of software, services, and systems**, https://csf.tools/reference/nist-cybersecurity-framework/v2-0/id/id-am/id-am-02/
4. FinOps Foundation, **Budgeting Capability**, https://www.finops.org/framework/capabilities/budgeting/
5. FinOps Foundation, **Forecasting Capability**, https://www.finops.org/framework/capabilities/forecasting/
6. OWASP, **Application Security Verification Standard**, https://owasp.org/www-project-application-security-verification-standard/
