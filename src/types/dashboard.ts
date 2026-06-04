export interface Brand {
  BrandID: number;
  BrandCode: string;
  BrandName: string;
  Manufacturer: string;
  Country: string;
  Website?: string;
  IsActive: boolean;
}

export interface Product {
  ProductID: number;
  ProductCode: string;
  ProductName: string;
  CategoryID: number;
  CategoryName: string;
  BrandID: number;
  UnitID: string;
  StandardCost: number;
  ListPrice: number;
  DiscountPrice: number;
  Color: string;
  Size?: string;
  IsActive: boolean;
  IsDiscontinued: boolean;
}

export interface Customer {
  CustomerID: number;
  CustomerCode: string;
  CustomerType: 'Retail' | 'Wholesale' | 'Corporate';
  CompanyName: string;
  FirstName?: string;
  LastName?: string;
  City: string;
  Country: string;
  CategoryID?: number;
  CustomerStatus: 'Active' | 'Inactive' | 'Pending';
  IsActive: boolean;
  RegistrationDate?: string;
}

export interface Employee {
  EmployeeID: number;
  EmployeeCode: string;
  FirstName: string;
  LastName: string;
  DepartmentID: number;
  JobTitleID: number;
  JobTitle: string;
  HireDate: string;
  EmploymentType: string;
  EmploymentStatus: string;
  IsActive: boolean;
}

export interface Promotion {
  PromotionID: number;
  PromotionCode: string;
  PromotionName: string;
  PromotionType: 'Seasonal' | 'Holiday' | 'Volume' | 'Special' | 'No Promotion';
  DiscountPercent: number;
  DiscountAmount: number;
  StartDate: string;
  EndDate: string;
  IsActive: boolean;
}

export interface DimDate {
  DateKey: number;
  FullDate: string;
  DayNumber: number;
  MonthNumber: number;
  MonthName: string;
  QuarterNumber: number;
  YearNumber: number;
}

export interface FactSales {
  OrderDetailID: number;
  SalesOrderID: number;
  OrderNumber: string;
  CustomerID: number;
  OrderDate: string;
  SalesRepID: number;
  OrderType: 'Online' | 'In-Store' | 'Wholesale-Contract';
  OrderStatus: 'Completed' | 'Shipped' | 'Processing' | 'Cancelled';
  PaymentStatus: 'Paid' | 'Pending' | 'Refunded';
  ProductID: number;
  Quantity: number;
  UnitPrice: number;
  DiscountPercent: number;
  DiscountAmount: number;
  TaxPercent: number;
  TaxAmount: number;
  LineTotal: number;
  PromotionID: number;
  DeliveryStatus: 'Delivered' | 'In Transit' | 'Pending' | 'Returned';
  Currency: string;
  DueDate: string;
  DateKey: number;
  BrandID: number;
}

export interface HydratedSalesRecord extends FactSales {
  Customer: Customer;
  Employee: Employee;
  Product: Product;
  Brand: Brand;
  Promotion: Promotion;
  DateInfo: DimDate;
}

export interface DashboardFilters {
  year: number | 'All';
  quarter: number | 'All';
  month: number | 'All';
  brand: number | 'All';
  status: string | 'All';
}

export interface SalesCubeDataset {
  brands: Brand[];
  products: Product[];
  customers: Customer[];
  employees: Employee[];
  promotions: Promotion[];
  dates: DimDate[];
  sales: FactSales[];
}

// ============================================================
// OLAP API Response Types (server → client via fetch)
// ============================================================

/** Response from GET /api/kpis */
export interface OlapKpiResponse {
  totalSales: number;
  totalQuantity: number;
  totalTax: number;
  totalOrders: number;
  totalProfit: number;
  activeBrands: number;
  activeProducts: number;
  _raw?: Record<string, unknown>;
}

/** Response from GET /api/kpis-advanced */
export interface OlapAdvancedKpiResponse {
  ytdRevenue: number;
  qtdRevenue: number;
  mtdRevenue: number;
  previousYearRevenue: number;
  previousQuarterRevenue: number;
  revenueGrowthPct: number;
  totalOrders: number;
  avgOrderValue: number;
  netRevenue: number;
  estimatedProfit: number;
  profitMarginPct: number;
  discountImpact: number;
  taxAmount: number;
  currentYear: number;
  currentQuarter: number;
  currentMonth: number;
  dataSource: 'live' | 'static';
}

/** Response item from GET /api/sales-by-product */
export interface OlapProductSale {
  name: string;
  lineTotal: number;
  quantity?: number;
}

/** Response item from GET /api/sales-by-date */
export interface OlapDateSale {
  period: string;
  lineTotal: number;
  volume?: number;
  profit?: number;
}


/** Response item from GET /api/sales-by-employee */
export interface OlapEmployeeSale {
  employee: string;
  lineTotal: number;
  quantity: number;
  orderLines: number;
  profit: number;
}

/** Response item from GET /api/sales-by-promotion */
export interface OlapPromotionSale {
  promotionType: string;
  lineTotal: number;
  discountAmount: number;
  quantity: number;
  avgDiscountPercent: number;
}

/** Response item from GET /api/sales-by-brand */
export interface OlapBrandSale {
  brand: string;
  lineTotal: number;
  quantity: number;
}

/** Response item from GET /api/sales-by-geography */
export interface OlapGeographySale {
  country: string;
  city?: string;
  lineTotal: number;
  quantity: number;
  orderCount: number;
}

/** Response from GET /api/customers-analysis */

/** Generic async data state wrapper used by all useOlap* hooks */
export interface OlapDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch?: () => void;
}

// ============================================================
// Auth / Role Types
// ============================================================

export type UserRole = 'admin' | 'executive' | 'sales_manager' | 'sales_rep';

export interface RolePermissions {
  tabs: string[];
  label: string;
  description: string;
  color: string;
}

export const ROLE_CONFIG: Record<UserRole, RolePermissions> = {
  admin: {
    tabs: ['executive', 'sales', 'leaderboard', 'promotions'],
    label: 'Administrator',
    description: 'Full access to all dashboard modules',
    color: 'text-red-500',
  },
  executive: {
    tabs: ['executive'],
    label: 'Executive',
    description: 'Executive KPIs and global analytics',
    color: 'text-indigo-500',
  },
  sales_manager: {
    tabs: ['executive', 'sales', 'leaderboard', 'promotions'],
    label: 'Sales Manager',
    description: 'Sales performance, rep rankings, and campaign data',
    color: 'text-emerald-500',
  },
  sales_rep: {
    tabs: ['leaderboard', 'sales'],
    label: 'Sales Representative',
    description: 'Personal performance and sales data',
    color: 'text-amber-500',
  },
};
