# SalesCube OLAP — BI Features Reference

## Document Overview

This document describes every BI feature implemented in the **SalesCube OLAP** dashboard system, including the analytical measures, KPIs, dimensions used, and the technical implementation method for each.

---

## 1. Analytical Measures

All monetary measures are in **USD**. The system computes measures either live from SSAS/SQL Server, or from the static in-memory dataset (fallback).

| Measure | Description | Source |
|---------|-------------|--------|
| **Total Revenue** | Sum of `LineTotal` for all non-cancelled orders | SSAS `[Measures].[Line Total]` |
| **Net Revenue** | Revenue minus discounts (`LineTotal - DiscountAmount`) | Computed |
| **Estimated Profit** | Net Revenue × 28% margin assumption | Computed |
| **Total Quantity** | Sum of units sold | SSAS `[Measures].[Quantity]` |
| **Total Discount** | Sum of `DiscountAmount` | SSAS `[Measures].[Discount Amount]` |
| **Total Tax** | Sum of `TaxAmount` | SSAS `[Measures].[Tax Amount]` |
| **Order Count** | `COUNT(DISTINCT SalesOrderID)` | SQL DW |
| **Average Order Value** | Total Revenue / Order Count | Computed |
| **YTD Revenue** | Revenue from Jan 1 of the current year to now | SQL DW JOIN DimDate |
| **QTD Revenue** | Revenue for the current quarter | SQL DW JOIN DimDate |
| **MTD Revenue** | Revenue for the current month | SQL DW JOIN DimDate |
| **Previous Year Revenue** | Full-year revenue for year-1 | SQL DW JOIN DimDate |
| **Previous Quarter Revenue** | Revenue for the prior quarter | SQL DW JOIN DimDate |
| **Revenue Growth %** | `(YTD - PY) / PY × 100` | Computed |
| **Profit Margin %** | `Estimated Profit / Total Revenue × 100` | Computed |
| **Discount Impact** | `Sum(DiscountAmount)` for analysis period | SQL DW / SSAS |
| **Next Month Forecast** | Blended linear regression + MA projection | Forecasting lib |
| **Next Quarter Forecast** | 3-month aggregate projection | Forecasting lib |
| **Model Confidence** | R² based, adjusted for data volume | Forecasting lib |

---

## 2. Time Intelligence

The Time Intelligence module computes period-over-period comparisons using SQL Server DimDate joins.

| KPI | Period Filter | Prior Period |
|-----|--------------|--------------|
| YTD | `YearNumber = currentYear` | `YearNumber = currentYear - 1` |
| QTD | `YearNumber = Y AND QuarterNumber = Q` | `QuarterNumber = Q-1` |
| MTD | `YearNumber = Y AND MonthNumber = M` | — |
| YoY Growth | Δ(YTD vs PY Revenue) | — |
| QoQ Growth | Δ(QTD vs PQ Revenue) | — |

### MDX Equivalent (for SSAS direct query)
```mdx
WITH
  MEMBER [Measures].[YTD Revenue] AS
    AGGREGATE(YTD(), [Measures].[Line Total])
  MEMBER [Measures].[PY Revenue] AS
    (PARALLELPERIOD([Date].[Calendar Year].CurrentMember, 1), [Measures].[Line Total])
  MEMBER [Measures].[YoY Growth] AS
    ([Measures].[YTD Revenue] - [Measures].[PY Revenue]) / [Measures].[PY Revenue]
SELECT
  { [Measures].[YTD Revenue], [Measures].[PY Revenue], [Measures].[YoY Growth] } ON COLUMNS
FROM [Entreprise DW]
```

---

## 3. Forecasting Methodology

The Forecasting module (`src/lib/forecasting.ts`) uses a **blended model**:

| Method | Weight | Description |
|--------|--------|-------------|
| Ordinary Least Squares (Linear Regression) | 60% | Fits a linear trend to historical monthly revenue |
| Simple Moving Average (3-month window) | 40% | Smoothed average of last 3 months |

**Formula:**
```
forecast(t+n) = regression.predict(t+n) × 0.6 + movingAvg × 0.4
```

**Accuracy Metric:** R² (coefficient of determination). R² = 1.0 → perfect linear trend. R² < 0.5 → high seasonality / external drivers.

**Confidence Score:** `confidence = (R² × 0.7 + dataCoverage × 0.3) × 100`
- `dataCoverage = min(months / 24, 1)` — score increases with more historical data.

---

## 4. Dimensions

All dimensions map to SSAS dimension files in `CubeProject/CubeProject/`.

| Dimension | Key Attribute | SSAS File | DW Table |
|-----------|--------------|-----------|---------|
| Date | DateKey (YYYYMMDD) | `DimDate.dim` | `DimDate` |
| Product | ProductID | `Products.dim` | `Products` |
| Brand | BrandID | `Brands.dim` | `Brands` |
| Customer | CustomerID | `Customers.dim` | `Customers` |
| Employee | EmployeeID | `Employees.dim` | `Employees` |
| Promotion | PromotionID | `Promotions.dim` | `Promotions` |

> [!NOTE]
> **Known Gap**: Current SSAS dimension configuration only exports surrogate keys (IDs) as attributes. Descriptive labels (e.g. `BrandName`, `EmployeeName`) must be joined from relational tables in the backend API. See the architecture note in Data Quality page.

### SSAS Dimension Enhancement Guide

To expose descriptive attributes in SSAS, add the following to each `.dim` file in Visual Studio SSDT:

**Brands.dim** — Add `BrandName` attribute:
```xml
<DimensionAttribute>
  <ID>Brand Name</ID>
  <Name>Brand Name</Name>
  <Type>Regular</Type>
  <KeyColumns>
    <KeyColumn>
      <DataItem>
        <DataSourceViewID>EntrepriseDW</DataSourceViewID>
        <ColumnID>BrandName</ColumnID>
      </DataItem>
    </KeyColumn>
  </KeyColumns>
  <NameColumn>
    <DataItem>
      <ColumnID>BrandName</ColumnID>
    </DataItem>
  </NameColumn>
</DimensionAttribute>
```
Apply the same pattern for: `ProductName`, `CompanyName`, `FirstName+LastName`, `PromotionName`.

---

## 5. SSAS Cube Hierarchies

Recommended hierarchies to add for drill-down analysis:

### Date Hierarchy
```
Year → Quarter → Month → Day
```
In MDX:
```mdx
[Date].[Calendar].[Calendar Year] → [Calendar Quarter] → [Calendar Month] → [Date]
```

### Geography Hierarchy (via Customer dimension)
```
Country → City → Customer
```

### Product Hierarchy
```
Category → Brand → Product
```

---

## 6. MDX Calculated Members

These calculated members can be added to the SSAS cube or used in OPENQUERY MDX:

```mdx
-- Net Revenue (after discounts)
WITH MEMBER [Measures].[Net Revenue] AS
  [Measures].[Line Total] - [Measures].[Discount Amount]

-- Estimated Profit (28% margin)
WITH MEMBER [Measures].[Estimated Profit] AS
  [Measures].[Net Revenue] * 0.28

-- Profit Margin %
WITH MEMBER [Measures].[Profit Margin Pct] AS
  IIF([Measures].[Line Total] = 0, NULL,
    [Measures].[Estimated Profit] / [Measures].[Line Total])
  , FORMAT_STRING = "Percent"

-- Discount Rate %
WITH MEMBER [Measures].[Avg Discount Rate] AS
  IIF([Measures].[Line Total] = 0, NULL,
    [Measures].[Discount Amount] / ([Measures].[Line Total] + [Measures].[Discount Amount]))
  , FORMAT_STRING = "Percent"
```

---

## 7. Dashboard Pages

| Page | Tab ID | Components | Data Sources |
|------|--------|-----------|--------------|
| Executive Overview | `executive` | TimeIntelligence, KPI cards, AdvancedKPISection, Sales Trend chart | `/api/kpis`, `/api/kpis-advanced`, `/api/sales-by-date` |
| Sales Performance | `sales` | Brand bar chart, Product pie chart, Country chart | `/api/sales-by-brand`, `/api/sales-by-product` |
| Rep Leaderboard | `leaderboard` | Employee bar chart, ranking table | `/api/sales-by-employee` |
| Promotions Deep-Dive | `promotions` | Promotion bar chart, discount analysis | `/api/sales-by-promotion` |
| Forecasting | `forecasting` | Area chart (actual + forecast), KPI cards | `/api/forecasting` |
| Geographic Analysis | `geographic` | Country/city bar charts, revenue table | `/api/sales-by-geography` |
| Customer Analysis | `customers` | Segment pie, top customers bar, customer table | `/api/customers-analysis` |
| Data Quality | `quality` | Health cards, ETL indicators, dimension sizes | `/api/data-quality` |

---

## 8. Export Capabilities

All major data views support **CSV export** via the `export.ts` utility:

| Page | Export Button | Output File |
|------|--------------|-------------|
| Rep Leaderboard | "📥 Export CSV" in chart header | `SalesCube_RepLeaderboard.csv` |
| Sales Performance | "📥 Export" in brand chart | `SalesCube_SalesByBrand.csv` |
| Forecasting | "📥 Export CSV" in page header | `SalesCube_Forecast.csv` |
| Geographic | "📥 Export CSV" in page header | `SalesCube_Geographic_Countries.csv` |
| Customer Analysis | "📥 Export CSV" in page header | `SalesCube_TopCustomers.csv` |

Export format: UTF-8 CSV with BOM (Excel compatible).

---

## 9. Role-Based Access Control (Demo)

The RBAC system demonstrates permission-based access using a client-side mock. In production, this would be backed by NextAuth.js with database sessions.

| Role | Accessible Tabs | Icon |
|------|----------------|------|
| Administrator | All 8 tabs | 🔑 |
| Executive | Executive, Forecasting, Geographic, Customers | 💼 |
| Sales Manager | Executive, Sales, Leaderboard, Promotions, Customers | 📊 |
| Sales Rep | Leaderboard, Sales | 🧑‍💼 |

The `AuthContext.tsx` provides `canAccess(tabId)` which the Sidebar uses to filter navigation items.

---

## 10. Data Quality Metrics

The Data Quality monitor runs the following checks:

| Check | Query | Pass Condition |
|-------|-------|---------------|
| Null LineTotal | `SUM(CASE WHEN LineTotal IS NULL THEN 1 ELSE 0 END)` | = 0 |
| Null CustomerID | `SUM(CASE WHEN CustomerID IS NULL THEN 1 ELSE 0 END)` | = 0 |
| Null EmployeeID | `SUM(CASE WHEN SalesRepID IS NULL THEN 1 ELSE 0 END)` | = 0 |
| Cube linked server | `SELECT COUNT(*) FROM sys.servers WHERE name='SSAS_CUBE'` | > 0 |
| Data freshness | Days since `MAX(OrderDate)` | < 7 = fresh |

---

*Last updated: June 2026 | SalesCube OLAP BI Dashboard v2.0.0*
