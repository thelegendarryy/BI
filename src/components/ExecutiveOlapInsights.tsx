'use client';

/**
 * ExecutiveOlapInsights.tsx — Executive OLAP Insights component
 * 
 * Sourced dynamically from:
 * 1. Live API endpoints (/api/sales-by-brand, /api/sales-by-product, /api/sales-by-employee, /api/sales-by-date?granularity=quarter, /api/sales-by-discount-rate)
 * 2. Static client-side aggregation of filteredSales from DashboardContext when in demoMode or offline.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { DataSourceBadge } from './LoadingSkeleton';
import { TrendingUp, Award, Box, Calendar, Percent, ShieldCheck, Flame, PieChart } from 'lucide-react';

interface BrandInsight {
  name: string;
  revenue: number;
  percent: number;
}

interface RepInsight {
  name: string;
  revenue: number;
  orderCount: number;
  marginPercent: number;
}

interface ProductInsight {
  name: string;
  revenue: number;
  quantity: number;
}

interface QuarterInsight {
  name: string;
  revenue: number;
  growthPercent: number;
}

interface DistributionInsight {
  brandsCount: number;
  productsCount: number;
  employeesCount: number;
}

interface DiscountInsight {
  highestRevenueRate: string;
  highestMarginRate: string;
  highestMarginVal: number;
  takeaway: string;
}

export default function ExecutiveOlapInsights() {
  const { filteredSales, demoMode, filters } = useDashboard();

  // Live state
  const [liveBrands, setLiveBrands] = useState<any[] | null>(null);
  const [liveProducts, setLiveProducts] = useState<any[] | null>(null);
  const [liveEmployees, setLiveEmployees] = useState<any[] | null>(null);
  const [liveQuarters, setLiveQuarters] = useState<any[] | null>(null);
  const [liveDiscounts, setLiveDiscounts] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiveActive, setIsLiveActive] = useState(false);

  // Fetch live metrics if not in demoMode
  useEffect(() => {
    if (demoMode) {
      setLoading(false);
      setIsLiveActive(false);
      return;
    }

    setLoading(true);
    const query = filters ? (() => {
      const params = new URLSearchParams();
      if (filters.year && filters.year !== 'All') params.append('year', String(filters.year));
      if (filters.quarter && filters.quarter !== 'All') params.append('quarter', String(filters.quarter));
      if (filters.month && filters.month !== 'All') params.append('month', String(filters.month));
      if (filters.brand && filters.brand !== 'All') params.append('brand', String(filters.brand));
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      const str = params.toString();
      return str ? `?${str}` : '';
    })() : '';

    Promise.all([
      fetch(`/api/sales-by-brand${query}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/sales-by-product${query}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/sales-by-employee${query}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/sales-by-date${query ? query + '&' : '?'}granularity=quarter`).then(r => r.ok ? r.json() : null),
      fetch(`/api/sales-by-discount-rate${query}`).then(r => r.ok ? r.json() : null)
    ])
      .then(([brands, products, employees, quarters, discounts]) => {
        if (brands && products && employees && quarters && discounts) {
          setLiveBrands(brands);
          setLiveProducts(products);
          setLiveEmployees(employees);
          setLiveQuarters(quarters);
          setLiveDiscounts(discounts);
          setIsLiveActive(true);
        } else {
          setIsLiveActive(false);
        }
      })
      .catch(() => {
        setIsLiveActive(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [demoMode, filters]);

  // Format Helpers
  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  // Computations
  const computedInsights = useMemo(() => {
    // Renders live data if active and database connected, otherwise computes client-side from filteredSales
    const isLive = isLiveActive && !demoMode;

    // 1. Total Revenue Sourcing
    let totalRevenue = 0;
    if (isLive && liveBrands) {
      totalRevenue = liveBrands.reduce((t, b) => t + b.lineTotal, 0);
    } else {
      totalRevenue = filteredSales.reduce((t, s) => t + s.LineTotal, 0);
    }

    if (totalRevenue === 0) totalRevenue = 1; // avoid divide by zero

    // 2. Brand Insights
    let brandInsight: BrandInsight = { name: 'N/A', revenue: 0, percent: 0 };
    if (isLive && liveBrands && liveBrands.length > 0) {
      const top = liveBrands[0];
      brandInsight = {
        name: top.brand,
        revenue: top.lineTotal,
        percent: Math.round((top.lineTotal / totalRevenue) * 1000) / 10
      };
    } else if (filteredSales.length > 0) {
      const grouped: Record<string, number> = {};
      filteredSales.forEach(s => {
        grouped[s.Brand.BrandName] = (grouped[s.Brand.BrandName] || 0) + s.LineTotal;
      });
      const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        brandInsight = {
          name: sorted[0][0],
          revenue: sorted[0][1],
          percent: Math.round((sorted[0][1] / totalRevenue) * 1000) / 10
        };
      }
    }

    // 3. Representative Insights
    let repInsight: RepInsight = { name: 'N/A', revenue: 0, orderCount: 0, marginPercent: 0 };
    if (isLive && liveEmployees && liveEmployees.length > 0) {
      const top = liveEmployees[0];
      const rev = top.lineTotal;
      const profit = top.profit ?? 0;
      repInsight = {
        name: top.employee,
        revenue: rev,
        orderCount: top.orderLines ?? 0,
        marginPercent: rev > 0 ? Math.round((profit / rev) * 100) : 0
      };
    } else if (filteredSales.length > 0) {
      const grouped: Record<string, { revenue: number; profit: number; orders: Set<number> }> = {};
      filteredSales.forEach(s => {
        const key = `${s.Employee.FirstName} ${s.Employee.LastName}`;
        if (!grouped[key]) {
          grouped[key] = { revenue: 0, profit: 0, orders: new Set() };
        }
        grouped[key].revenue += s.LineTotal;
        const profit = s.LineTotal - s.TaxAmount - (s.Quantity * s.Product.StandardCost);
        grouped[key].profit += profit;
        grouped[key].orders.add(s.SalesOrderID);
      });
      const sorted = Object.entries(grouped).sort((a, b) => b[1].revenue - a[1].revenue);
      if (sorted.length > 0) {
        const top = sorted[0];
        repInsight = {
          name: top[0],
          revenue: top[1].revenue,
          orderCount: top[1].orders.size,
          marginPercent: top[1].revenue > 0 ? Math.round((top[1].profit / top[1].revenue) * 100) : 0
        };
      }
    }

    // 4. Product Insights
    let productInsight: ProductInsight = { name: 'N/A', revenue: 0, quantity: 0 };
    if (isLive && liveProducts && liveProducts.length > 0) {
      const top = liveProducts[0];
      productInsight = {
        name: top.name,
        revenue: top.lineTotal,
        quantity: top.quantity ?? 0
      };
    } else if (filteredSales.length > 0) {
      const grouped: Record<string, { revenue: number; quantity: number }> = {};
      filteredSales.forEach(s => {
        const key = s.Product.ProductName;
        if (!grouped[key]) {
          grouped[key] = { revenue: 0, quantity: 0 };
        }
        grouped[key].revenue += s.LineTotal;
        grouped[key].quantity += s.Quantity;
      });
      const sorted = Object.entries(grouped).sort((a, b) => b[1].revenue - a[1].revenue);
      if (sorted.length > 0) {
        productInsight = {
          name: sorted[0][0],
          revenue: sorted[0][1].revenue,
          quantity: sorted[0][1].quantity
        };
      }
    }

    // 5. Quarter Insights
    let quarterInsight: QuarterInsight = { name: 'N/A', revenue: 0, growthPercent: 0 };
    if (isLive && liveQuarters && liveQuarters.length > 0) {
      const sortedByRevenue = [...liveQuarters].sort((a, b) => b.lineTotal - a.lineTotal);
      const topQ = sortedByRevenue[0];
      const topIdx = liveQuarters.findIndex(q => q.period === topQ.period);
      let growth = 0;
      if (topIdx > 0) {
        const prevQ = liveQuarters[topIdx - 1];
        growth = prevQ.lineTotal > 0 ? ((topQ.lineTotal - prevQ.lineTotal) / prevQ.lineTotal) * 100 : 0;
      }
      quarterInsight = {
        name: topQ.period,
        revenue: topQ.lineTotal,
        growthPercent: Math.round(growth * 10) / 10
      };
    } else if (filteredSales.length > 0) {
      const grouped: Record<string, number> = {};
      filteredSales.forEach(s => {
        const key = `${s.DateInfo.YearNumber}-Q${s.DateInfo.QuarterNumber}`;
        grouped[key] = (grouped[key] || 0) + s.LineTotal;
      });
      const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        const topQKey = sorted[0][0];
        const parts = topQKey.split('-Q');
        const y = parseInt(parts[0], 10);
        const q = parseInt(parts[1], 10);
        const prevQKey = q === 1 ? `${y - 1}-Q4` : `${y}-Q${q - 1}`;
        const prevRev = grouped[prevQKey] || 0;
        const growth = prevRev > 0 ? ((sorted[0][1] - prevRev) / prevRev) * 100 : 0;
        quarterInsight = {
          name: topQKey,
          revenue: sorted[0][1],
          growthPercent: Math.round(growth * 10) / 10
        };
      }
    }

    // 6. Distribution Insights
    let distributionInsight: DistributionInsight = { brandsCount: 0, productsCount: 0, employeesCount: 0 };
    if (isLive) {
      distributionInsight = {
        brandsCount: liveBrands?.length ?? 0,
        productsCount: liveProducts?.length ?? 0,
        employeesCount: liveEmployees?.length ?? 0
      };
    } else {
      distributionInsight = {
        brandsCount: new Set(filteredSales.map(s => s.Brand.BrandName)).size,
        productsCount: new Set(filteredSales.map(s => s.Product.ProductName)).size,
        employeesCount: new Set(filteredSales.map(s => s.Employee.EmployeeID)).size
      };
    }

    // 7. Discount Insights
    let discountInsight: DiscountInsight = {
      highestRevenueRate: 'N/A',
      highestMarginRate: 'N/A',
      highestMarginVal: 0,
      takeaway: 'Standard margins are maintained by keeping promotions under 10% average discounts.'
    };
    if (isLive && liveDiscounts?.data && liveDiscounts.data.length > 0) {
      const sortedByRev = [...liveDiscounts.data].sort((a, b) => b.revenue - a.revenue);
      const sortedByMargin = [...liveDiscounts.data].sort((a, b) => b.marginPercent - a.marginPercent);
      const topRev = sortedByRev[0];
      const topMargin = sortedByMargin[0];
      discountInsight = {
        highestRevenueRate: topRev.name,
        highestMarginRate: topMargin.name,
        highestMarginVal: topMargin.marginPercent,
        takeaway: `Discount rates at ${topRev.name} drive the bulk of sales volume. Profit margin peaks at ${topMargin.marginPercent}% when discount rate is ${topMargin.name}.`
      };
    } else if (filteredSales.length > 0) {
      const buckets: Record<string, { revenue: number; profit: number; discount: number }> = {};
      filteredSales.forEach(s => {
        const pct = Math.round(s.DiscountPercent * 100);
        const key = `${pct}%`;
        if (!buckets[key]) {
          buckets[key] = { revenue: 0, profit: 0, discount: pct };
        }
        buckets[key].revenue += s.LineTotal;
        const profit = (s.LineTotal - s.TaxAmount) - (s.Quantity * s.Product.StandardCost);
        buckets[key].profit += profit;
      });
      const sortedByRev = Object.entries(buckets).sort((a, b) => b[1].revenue - a[1].revenue);
      const sortedByMargin = Object.entries(buckets).sort((a, b) => {
        const marginA = a[1].revenue > 0 ? (a[1].profit / a[1].revenue) * 100 : 0;
        const marginB = b[1].revenue > 0 ? (b[1].profit / b[1].revenue) * 100 : 0;
        return marginB - marginA;
      });

      if (sortedByRev.length > 0) {
        const topMarginKey = sortedByMargin[0][0];
        const topMarginData = sortedByMargin[0][1];
        const topMarginVal = topMarginData.revenue > 0 ? (topMarginData.profit / topMarginData.revenue) * 100 : 0;
        discountInsight = {
          highestRevenueRate: sortedByRev[0][0],
          highestMarginRate: topMarginKey,
          highestMarginVal: Math.round(topMarginVal * 10) / 10,
          takeaway: `Standard pricing (${sortedByRev[0][0]}) generates the highest volume. Peak margin of ${Math.round(topMarginVal)}% is achieved at ${topMarginKey} discount tier.`
        };
      }
    }

    // 8. Executive Summary Generation
    const totalProfit = isLive && liveEmployees
      ? liveEmployees.reduce((t, e) => t + (e.profit ?? 0), 0)
      : filteredSales.reduce((t, s) => t + ((s.LineTotal - s.TaxAmount) - (s.Quantity * s.Product.StandardCost)), 0);
    const avgMarginPercent = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

    const summaryText = `${brandInsight.name} contributes ${brandInsight.percent}% of company revenue, while ${repInsight.name} remains the highest-performing sales representative with ${formatCurrency(repInsight.revenue)} in bookings. Revenue concentration is strongest in ${quarterInsight.name} and company net profit margin averages ${avgMarginPercent}%.`;

    return {
      brand: brandInsight,
      rep: repInsight,
      product: productInsight,
      quarter: quarterInsight,
      distribution: distributionInsight,
      discount: discountInsight,
      summary: summaryText,
      isLive
    };
  }, [isLiveActive, demoMode, liveBrands, liveProducts, liveEmployees, liveQuarters, liveDiscounts, filteredSales]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-secondary rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 h-36 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const data = computedInsights;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Executive OLAP Insights</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time multidimensional data mining from SSAS cube and SQL warehouse</p>
        </div>
        <DataSourceBadge isLive={data.isLive} />
      </div>

      {/* AI Executive Summary Card */}
      <div className="premium-card bg-card border border-primary/20 bg-gradient-to-r from-primary/[0.02] to-indigo-500/[0.02] rounded-2xl p-5 flex items-start gap-4">
        <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">OLAP Synthesis Insight</span>
          <p className="text-xs font-semibold text-foreground leading-relaxed">
            "{data.summary}"
          </p>
          <p className="text-[10px] text-muted-foreground">
            Automatically compiled across {formatNumber(filteredSales.length)} sales records.
          </p>
        </div>
      </div>

      {/* 2x3 Grid of OLAP Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Card 1: Revenue Leader */}
        <div className="premium-card bg-card border border-border rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Revenue Leader</span>
              <h3 className="text-lg font-bold text-foreground tracking-tight">{data.brand.name}</h3>
            </div>
            <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-foreground">{formatCurrency(data.brand.revenue)}</span>
              <span className="text-primary">{data.brand.percent}% of total</span>
            </div>
            <p className="text-[10px] text-muted-foreground/80">Highest contributing brand across selected dimensions.</p>
          </div>
        </div>

        {/* Card 2: Top Sales Rep */}
        <div className="premium-card bg-card border border-border rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Top Representative</span>
              <h3 className="text-lg font-bold text-foreground tracking-tight">{data.rep.name}</h3>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-foreground">{formatCurrency(data.rep.revenue)} ({data.rep.orderCount} orders)</span>
              <span className="text-emerald-500">{data.rep.marginPercent}% margin</span>
            </div>
            <p className="text-[10px] text-muted-foreground/80">Leading representative by total revenue booked.</p>
          </div>
        </div>

        {/* Card 3: Best Selling Product */}
        <div className="premium-card bg-card border border-border rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between">
            <div className="space-y-1 pr-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Best Selling Product</span>
              <h3 className="text-sm font-bold text-foreground tracking-tight truncate max-w-[170px]" title={data.product.name}>
                {data.product.name}
              </h3>
            </div>
            <div className="p-2.5 bg-pink-500/10 text-pink-500 rounded-xl shrink-0">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-foreground">{formatCurrency(data.product.revenue)}</span>
              <span className="text-pink-500">{formatNumber(data.product.quantity)} units sold</span>
            </div>
            <p className="text-[10px] text-muted-foreground/80">Top performing product by total sales volume.</p>
          </div>
        </div>

        {/* Card 4: Strongest Quarter */}
        <div className="premium-card bg-card border border-border rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Strongest Quarter</span>
              <h3 className="text-lg font-bold text-foreground tracking-tight">{data.quarter.name}</h3>
            </div>
            <div className="p-2.5 bg-violet-500/10 text-violet-500 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-foreground">{formatCurrency(data.quarter.revenue)}</span>
              <span className={data.quarter.growthPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                {data.quarter.growthPercent >= 0 ? '▲' : '▼'} {Math.abs(data.quarter.growthPercent)}% QoQ
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/80">Quarter with peak financial transaction volumes.</p>
          </div>
        </div>

        {/* Card 5: Revenue Distribution */}
        <div className="premium-card bg-card border border-border rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Market Distribution</span>
              <h3 className="text-lg font-bold text-foreground tracking-tight">Active Slices</h3>
            </div>
            <div className="p-2.5 bg-cyan-500/10 text-cyan-500 rounded-xl">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex justify-between gap-2 text-center text-xs">
            <div className="flex-1 bg-secondary/50 rounded-lg p-1">
              <div className="font-bold text-foreground">{data.distribution.brandsCount}</div>
              <div className="text-[8px] text-muted-foreground uppercase font-medium">Brands</div>
            </div>
            <div className="flex-1 bg-secondary/50 rounded-lg p-1">
              <div className="font-bold text-foreground">{data.distribution.productsCount}</div>
              <div className="text-[8px] text-muted-foreground uppercase font-medium">Products</div>
            </div>
            <div className="flex-1 bg-secondary/50 rounded-lg p-1">
              <div className="font-bold text-foreground">{data.distribution.employeesCount}</div>
              <div className="text-[8px] text-muted-foreground uppercase font-medium">Reps</div>
            </div>
          </div>
        </div>

        {/* Card 6: Discount Effectiveness */}
        <div className="premium-card bg-card border border-border rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Discount effectiveness</span>
              <h3 className="text-sm font-bold text-foreground tracking-tight">Elasticity Insights</h3>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-[10px] text-muted-foreground leading-normal italic">
              "{data.discount.takeaway}"
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
