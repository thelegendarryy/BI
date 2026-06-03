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
  CategoryName: string; // Helper for easy filtering/slicing
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
  JobTitle: string; // Helper for UI
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
  DateKey: number; // e.g. 20240115
  FullDate: string; // ISO Date String
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
  OrderDate: string; // YYYY-MM-DD
  SalesRepID: number; // Employee ID
  OrderType: 'Online' | 'In-Store' | 'Wholesale-Contract';
  OrderStatus: 'Completed' | 'Shipped' | 'Processing' | 'Cancelled';
  PaymentStatus: 'Paid' | 'Pending' | 'Refunded';
  ProductID: number;
  Quantity: number;
  UnitPrice: number;
  DiscountPercent: number; // e.g., 0.15 for 15%
  DiscountAmount: number;
  TaxPercent: number; // e.g., 0.08 for 8%
  TaxAmount: number;
  LineTotal: number; // Gross total after discount, including tax: (Quantity * UnitPrice - DiscountAmount) * (1 + TaxPercent)
  PromotionID: number;
  DeliveryStatus: 'Delivered' | 'In Transit' | 'Pending' | 'Returned';
  Currency: string; // e.g. USD
  DueDate: string;
  DateKey: number;
  BrandID: number;
}

// Full hydrated sales item for easy charting without repeated manual joins
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
