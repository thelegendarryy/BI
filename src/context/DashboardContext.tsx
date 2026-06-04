'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { DashboardFilters, HydratedSalesRecord } from '../types/dashboard';
import { hydratedDataset, dataset } from '../data/salesCubeData';

interface DashboardContextType {
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  filteredSales: HydratedSalesRecord[];
  
  // Theme state
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Demo Mode (prevents silent fallback to static mock data)
  demoMode: boolean;
  setDemoMode: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Available filter options based on dataset
  availableYears: number[];
  availableBrands: { id: number; name: string }[];
  availableStatuses: string[];

  // Global Filtered KPIs
  kpis: {
    totalRevenue: number;
    totalUnits: number;
    avgDiscountAmount: number;
    totalTax: number;
    activeCustomers: number;
    totalProfit: number;
    avgMarginPercent: number;
    orderCount: number;
  };

  // KPI Growth Rates (YoY comparisons if single year is selected, otherwise overall comparison)
  kpiTrends: {
    revenueGrowth: number; // percentage change
    unitsGrowth: number;
    customersGrowth: number;
    profitGrowth: number;
  };

  // Structured Chart Data
  timeSeriesData: any[];
  brandData: any[];
  categoryData: any[];
  countryData: any[];
  repLeaderboard: any[];
  promotionsData: any[];
  discountDeepDive: any[];
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('executive');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [filters, setFilters] = useState<DashboardFilters>({
    year: 'All',
    quarter: 'All',
    month: 'All',
    brand: 'All',
    status: 'All'
  });

  // Initialize theme from localStorage or default to dark
  useEffect(() => {
    const root = window.document.documentElement;
    const initialTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (initialTheme) {
      setTheme(initialTheme);
      if (initialTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else {
      root.classList.add('dark');
      setTheme('dark');
      localStorage.setItem('theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const [demoMode, setDemoMode] = useState<boolean>(false);

  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableBrands, setAvailableBrands] = useState<{ id: number; name: string }[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/filters')
      .then(r => r.json())
      .then(d => {
        setAvailableYears(d.years ?? []);
        setAvailableBrands(d.brands ?? []);
        setAvailableStatuses(d.statuses ?? []);
      })
      .catch(() => {
        const staticYears = Array.from(new Set(dataset.dates.map(d => d.YearNumber))).sort((a, b) => b - a);
        const staticBrands = dataset.brands.map(b => ({ id: b.BrandID, name: b.BrandName }));
        const staticStatuses = Array.from(new Set(dataset.sales.map(s => s.OrderStatus)));
        setAvailableYears(staticYears);
        setAvailableBrands(staticBrands);
        setAvailableStatuses(staticStatuses);
      });
  }, []);

  // Filter the sales dataset dynamically
  const filteredSales = useMemo(() => {
    return hydratedDataset.filter(record => {
      // 1. Year Filter
      if (filters.year !== 'All' && record.DateInfo.YearNumber !== filters.year) {
        return false;
      }
      // 2. Quarter Filter
      if (filters.quarter !== 'All' && record.DateInfo.QuarterNumber !== filters.quarter) {
        return false;
      }
      // 3. Brand Filter
      if (filters.brand !== 'All' && record.BrandID !== filters.brand) {
        return false;
      }
      // 4. Order Status Filter
      if (filters.status !== 'All' && record.OrderStatus !== filters.status) {
        return false;
      }
      return true;
    });
  }, [filters]);

  // Compute standard dynamic KPIs
  const kpis = useMemo(() => {
    let totalRevenue = 0;
    let totalUnits = 0;
    let totalDiscountAmount = 0;
    let totalCost = 0;
    let totalTax = 0;
    const uniqueCustomers = new Set<number>();
    const orderIds = new Set<number>();

    filteredSales.forEach(record => {
      totalRevenue += record.LineTotal;
      totalUnits += record.Quantity;
      totalDiscountAmount += record.DiscountAmount;
      totalTax += record.TaxAmount;
      
      const cost = record.Quantity * record.Product.StandardCost;
      totalCost += cost;

      uniqueCustomers.add(record.CustomerID);
      orderIds.add(record.SalesOrderID);
    });

    let netSales = 0;
    filteredSales.forEach(r => {
      netSales += (r.LineTotal - r.TaxAmount);
    });
    const totalProfit = netSales - totalCost;
    const avgMarginPercent = netSales > 0 ? (totalProfit / netSales) * 100 : 0;
    const avgDiscountAmount = filteredSales.length > 0 ? totalDiscountAmount / filteredSales.length : 0;

    return {
      totalRevenue,
      totalUnits,
      avgDiscountAmount,
      totalTax,
      activeCustomers: uniqueCustomers.size,
      totalProfit,
      avgMarginPercent,
      orderCount: orderIds.size
    };
  }, [filteredSales]);

  // Compute Trend Indicators compared to previous year (YoY) or previous periods
  const kpiTrends = useMemo(() => {
    // If year is "All" or is the earliest year (2024), we compare against a virtual baseline
    const currentYear = filters.year === 'All' ? 2026 : filters.year;
    const priorYear = currentYear - 1;

    // Filter data for current and prior years (respecting Brand/Status filters)
    const currentYearSales = hydratedDataset.filter(r => 
      r.DateInfo.YearNumber === currentYear &&
      (filters.brand === 'All' || r.BrandID === filters.brand) &&
      (filters.status === 'All' || r.OrderStatus === filters.status)
    );

    const priorYearSales = hydratedDataset.filter(r => 
      r.DateInfo.YearNumber === priorYear &&
      (filters.brand === 'All' || r.BrandID === filters.brand) &&
      (filters.status === 'All' || r.OrderStatus === filters.status)
    );

    const computeMetrics = (salesArr: HydratedSalesRecord[]) => {
      let revenue = 0;
      let units = 0;
      const customers = new Set<number>();
      let cost = 0;
      let netSales = 0;

      salesArr.forEach(r => {
        revenue += r.LineTotal;
        units += r.Quantity;
        customers.add(r.CustomerID);
        cost += r.Quantity * r.Product.StandardCost;
        netSales += (r.LineTotal - r.TaxAmount);
      });

      return {
        revenue,
        units,
        customers: customers.size,
        profit: netSales - cost
      };
    };

    const cur = computeMetrics(currentYearSales);
    const pri = computeMetrics(priorYearSales);

    const calcGrowth = (current: number, prior: number) => {
      if (prior === 0) return current > 0 ? 100 : 0;
      return ((current - prior) / prior) * 100;
    };

    return {
      revenueGrowth: calcGrowth(cur.revenue, pri.revenue),
      unitsGrowth: calcGrowth(cur.units, pri.units),
      customersGrowth: calcGrowth(cur.customers, pri.customers),
      profitGrowth: calcGrowth(cur.profit, pri.profit)
    };
  }, [filters.year, filters.brand, filters.status]);

  // Chart Data: Time-Series (Sales over time: Monthly/Quarterly)
  const timeSeriesData = useMemo(() => {
    // If filtering by a single year, slice by Month. Else, group by Year-Quarter.
    const groupings: { [key: string]: { revenue: number; profit: number; volume: number } } = {};

    filteredSales.forEach(record => {
      let key = '';
      if (filters.year !== 'All') {
        // Group by Month (e.g., "01 Jan", "02 Feb", etc.)
        const monthPad = String(record.DateInfo.MonthNumber).padStart(2, '0');
        // Get short month name
        const shortName = record.DateInfo.MonthName.substring(0, 3);
        key = `${monthPad} ${shortName}`;
      } else {
        // Group by Year and Quarter (e.g., "2024 Q1")
        key = `${record.DateInfo.YearNumber} Q${record.DateInfo.QuarterNumber}`;
      }

      if (!groupings[key]) {
        groupings[key] = { revenue: 0, profit: 0, volume: 0 };
      }

      const netSales = record.LineTotal - record.TaxAmount;
      const profit = netSales - (record.Quantity * record.Product.StandardCost);

      groupings[key].revenue += record.LineTotal;
      groupings[key].profit += profit;
      groupings[key].volume += record.Quantity;
    });

    return Object.keys(groupings)
      .sort()
      .map(key => ({
        name: filters.year !== 'All' ? key.substring(3) : key, // strip sorting padding
        revenue: Math.round(groupings[key].revenue),
        profit: Math.round(groupings[key].profit),
        volume: groupings[key].volume
      }));
  }, [filteredSales, filters.year]);

  // Chart Data: Brand Slices
  const brandData = useMemo(() => {
    const groupings: { [key: string]: { revenue: number; profit: number; volume: number } } = {};

    filteredSales.forEach(record => {
      const key = record.Brand.BrandName;
      if (!groupings[key]) {
        groupings[key] = { revenue: 0, profit: 0, volume: 0 };
      }

      const netSales = record.LineTotal - record.TaxAmount;
      const profit = netSales - (record.Quantity * record.Product.StandardCost);

      groupings[key].revenue += record.LineTotal;
      groupings[key].profit += profit;
      groupings[key].volume += record.Quantity;
    });

    return Object.keys(groupings)
      .map(key => ({
        name: key,
        revenue: Math.round(groupings[key].revenue),
        profit: Math.round(groupings[key].profit),
        volume: groupings[key].volume
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  // Chart Data: Category Slices
  const categoryData = useMemo(() => {
    const groupings: { [key: string]: { revenue: number; profit: number; volume: number } } = {};

    filteredSales.forEach(record => {
      const key = record.Product.CategoryName;
      if (!groupings[key]) {
        groupings[key] = { revenue: 0, profit: 0, volume: 0 };
      }

      const netSales = record.LineTotal - record.TaxAmount;
      const profit = netSales - (record.Quantity * record.Product.StandardCost);

      groupings[key].revenue += record.LineTotal;
      groupings[key].profit += profit;
      groupings[key].volume += record.Quantity;
    });

    return Object.keys(groupings)
      .map(key => ({
        name: key,
        value: Math.round(groupings[key].revenue),
        profit: Math.round(groupings[key].profit),
        volume: groupings[key].volume
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredSales]);

  // Chart Data: Region/Country Slices
  const countryData = useMemo(() => {
    const groupings: { [key: string]: { revenue: number; profit: number; volume: number } } = {};

    filteredSales.forEach(record => {
      const key = record.Customer.Country;
      if (!groupings[key]) {
        groupings[key] = { revenue: 0, profit: 0, volume: 0 };
      }

      const netSales = record.LineTotal - record.TaxAmount;
      const profit = netSales - (record.Quantity * record.Product.StandardCost);

      groupings[key].revenue += record.LineTotal;
      groupings[key].profit += profit;
      groupings[key].volume += record.Quantity;
    });

    return Object.keys(groupings)
      .map(key => ({
        name: key,
        revenue: Math.round(groupings[key].revenue),
        profit: Math.round(groupings[key].profit),
        volume: groupings[key].volume
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  // Leaderboard data
  const repLeaderboard = useMemo(() => {
    const groupings: {
      [key: number]: {
        repId: number;
        code: string;
        fullName: string;
        title: string;
        revenue: number;
        profit: number;
        volume: number;
        orders: Set<number>;
      }
    } = {};

    filteredSales.forEach(record => {
      const key = record.Employee.EmployeeID;
      if (!groupings[key]) {
        groupings[key] = {
          repId: key,
          code: record.Employee.EmployeeCode,
          fullName: `${record.Employee.FirstName} ${record.Employee.LastName}`,
          title: record.Employee.JobTitle,
          revenue: 0,
          profit: 0,
          volume: 0,
          orders: new Set<number>()
        };
      }

      const netSales = record.LineTotal - record.TaxAmount;
      const profit = netSales - (record.Quantity * record.Product.StandardCost);

      groupings[key].revenue += record.LineTotal;
      groupings[key].profit += profit;
      groupings[key].volume += record.Quantity;
      groupings[key].orders.add(record.SalesOrderID);
    });

    return Object.values(groupings)
      .map(rep => {
        const netSales = rep.revenue; // roughly equivalent
        const marginPercent = netSales > 0 ? (rep.profit / netSales) * 100 : 0;
        const avgDealSize = rep.orders.size > 0 ? rep.revenue / rep.orders.size : 0;

        return {
          id: rep.repId,
          code: rep.code,
          name: rep.fullName,
          title: rep.title,
          revenue: Math.round(rep.revenue),
          profit: Math.round(rep.profit),
          volume: rep.volume,
          marginPercent: Math.round(marginPercent * 10) / 10,
          dealSize: Math.round(avgDealSize),
          ordersCount: rep.orders.size
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  // Promotions Slices
  const promotionsData = useMemo(() => {
    const groupings: { [key: string]: { revenue: number; volume: number; discountAmt: number; count: number } } = {};

    filteredSales.forEach(record => {
      const key = record.Promotion.PromotionType;
      if (!groupings[key]) {
        groupings[key] = { revenue: 0, volume: 0, discountAmt: 0, count: 0 };
      }

      groupings[key].revenue += record.LineTotal;
      groupings[key].volume += record.Quantity;
      groupings[key].discountAmt += record.DiscountAmount;
      groupings[key].count += 1;
    });

    return Object.keys(groupings).map(key => ({
      name: key === 'No Promotion' ? 'Standard Sales' : key,
      revenue: Math.round(groupings[key].revenue),
      volume: groupings[key].volume,
      avgDiscountPercent: groupings[key].revenue > 0 ? Math.round((groupings[key].discountAmt / (groupings[key].revenue + groupings[key].discountAmt)) * 100) : 0
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  // Discount deep-dive comparison data (analyzing how discount rates affect Quantity and Margin %)
  const discountDeepDive = useMemo(() => {
    // Group transactions into buckets of discount percent (e.g. 0%, 5%, 7%, 10%, 15%, 20%)
    const buckets: { [key: string]: { discountPercent: number; volume: number; revenue: number; profit: number; count: number } } = {};

    filteredSales.forEach(record => {
      // Round to nearest integer percent for grouping
      const pct = Math.round(record.DiscountPercent * 100);
      const key = `${pct}%`;

      if (!buckets[key]) {
        buckets[key] = { discountPercent: pct, volume: 0, revenue: 0, profit: 0, count: 0 };
      }

      const netSales = record.LineTotal - record.TaxAmount;
      const profit = netSales - (record.Quantity * record.Product.StandardCost);

      buckets[key].volume += record.Quantity;
      buckets[key].revenue += record.LineTotal;
      buckets[key].profit += profit;
      buckets[key].count += 1;
    });

    return Object.values(buckets)
      .map(b => {
        const marginPercent = b.revenue > 0 ? (b.profit / b.revenue) * 100 : 0;
        return {
          name: `${b.discountPercent}%`,
          discount: b.discountPercent,
          volume: b.volume,
          revenue: Math.round(b.revenue),
          profit: Math.round(b.profit),
          marginPercent: Math.round(marginPercent * 10) / 10,
          avgOrderQuantity: Math.round((b.volume / b.count) * 10) / 10
        };
      })
      .sort((a, b) => a.discount - b.discount);
  }, [filteredSales]);

  return (
    <DashboardContext.Provider
      value={{
        filters,
        setFilters,
        activeTab,
        setActiveTab,
        filteredSales,
        theme,
        toggleTheme,
        availableYears,
        availableBrands,
        availableStatuses,
        kpis,
        kpiTrends,
        timeSeriesData,
        brandData,
        categoryData,
        countryData,
        repLeaderboard,
        promotionsData,
        discountDeepDive,
        demoMode,
        setDemoMode
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
