'use client';

import React, { useEffect, useState } from 'react';
import { DataSourceBadge } from './LoadingSkeleton';
import { useDashboard } from '../context/DashboardContext';

interface PerformanceCard {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: string;
}

function PerformanceKpiCard({ card }: { card: PerformanceCard }) {
  return (
    <div className="premium-card bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${card.color}`}>
          {card.icon}
        </span>
      </div>
      <p className="text-xl font-bold text-foreground tracking-tight">{card.value}</p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">{card.sub}</span>
      </div>
    </div>
  );
}

export default function TimeIntelligence() {
  const { filteredSales, kpis: staticKpis, demoMode, filters } = useDashboard();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (demoMode) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    const query = (() => {
      const params = new URLSearchParams();
      if (filters.year && filters.year !== 'All') params.append('year', String(filters.year));
      if (filters.quarter && filters.quarter !== 'All') params.append('quarter', String(filters.quarter));
      if (filters.month && filters.month !== 'All') params.append('month', String(filters.month));
      if (filters.brand && filters.brand !== 'All') params.append('brand', String(filters.brand));
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      const str = params.toString();
      return str ? `?${str}` : '';
    })();

    fetch(`/api/kpis${query}`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [demoMode, filters]);

  const isLive = !demoMode && data !== null && !loading;

  // Calculate metrics based on live or static source
  const aov = isLive
    ? (data.totalOrders > 0 ? data.totalSales / data.totalOrders : 0)
    : (staticKpis.orderCount > 0 ? staticKpis.totalRevenue / staticKpis.orderCount : 0);

  const margin = isLive
    ? ((data.totalSales - data.totalTax) > 0 ? (data.totalProfit / (data.totalSales - data.totalTax)) * 100 : 0)
    : staticKpis.avgMarginPercent;

  const brands = isLive
    ? data.activeBrands
    : new Set(filteredSales.map(s => s.Brand.BrandName)).size;

  const products = isLive
    ? data.activeProducts
    : new Set(filteredSales.map(s => s.Product.ProductName)).size;

  const dataSource = isLive ? data.dataSource : 'static';

  const cards: PerformanceCard[] = [
    {
      label: 'Average Order Value',
      value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(aov),
      sub: 'Avg ticket size per Sales Order',
      color: 'bg-indigo-500/10 text-indigo-500',
      icon: '💵',
    },
    {
      label: 'Profit Margin %',
      value: `${margin.toFixed(1)}%`,
      sub: 'Margin vs Net Sales (excl. Tax)',
      color: 'bg-emerald-500/10 text-emerald-500',
      icon: '📈',
    },
    {
      label: 'Active Brands',
      value: String(brands),
      sub: 'Brands contributing to sales',
      color: 'bg-violet-500/10 text-violet-500',
      icon: '🏷️',
    },
    {
      label: 'Active Products',
      value: String(products),
      sub: 'Distinct products sold',
      color: 'bg-cyan-500/10 text-cyan-500',
      icon: '📦',
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Warehouse Performance Summary</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Catalog distribution and commercial efficiency KPIs</p>
        </div>
        <DataSourceBadge isLive={dataSource === 'live-sql' || dataSource === 'live-ssas'} loading={loading} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading && !demoMode
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="premium-card bg-card border border-border rounded-2xl p-4 h-28 animate-pulse" />
            ))
          : cards.map((card, i) => <PerformanceKpiCard key={i} card={card} />)}
      </div>
    </section>
  );
}
