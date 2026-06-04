'use client';

import React, { useEffect, useState } from 'react';
import { OlapAdvancedKpiResponse } from '../types/dashboard';
import { DataSourceBadge, KpiCardSkeleton } from './LoadingSkeleton';
import { formatCompact, formatPercent } from '../lib/export';

interface KpiCardConfig {
  id: string;
  label: string;
  value: number;
  target: number;
  prefix?: string;
  suffix?: string;
  icon: string;
  color: string;
  description: string;
  formatFn?: (v: number) => string;
}

const QUARTER_NAMES = ['Q1', 'Q2', 'Q3', 'Q4'];

function Trend({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold rounded-full px-2 py-0.5 ${
        isPositive
          ? 'bg-emerald-500/10 text-emerald-500'
          : 'bg-red-500/10 text-red-500'
      }`}
    >
      {isPositive ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function KpiCard({ cfg, loading }: { cfg: KpiCardConfig; loading: boolean }) {
  if (loading) return <KpiCardSkeleton />;

  const pct = cfg.target > 0 ? (cfg.value / cfg.target) * 100 : 0;
  const clampedPct = Math.min(pct, 100);
  const gap = cfg.value - cfg.target;
  const isAbove = gap >= 0;

  const display = cfg.formatFn
    ? cfg.formatFn(cfg.value)
    : `${cfg.prefix ?? ''}${formatCompact(cfg.value)}${cfg.suffix ?? ''}`;

  const targetDisplay = cfg.formatFn
    ? cfg.formatFn(cfg.target)
    : `${cfg.prefix ?? ''}${formatCompact(cfg.target)}${cfg.suffix ?? ''}`;

  return (
    <div className="premium-card bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium">{cfg.label}</p>
          <p className="text-2xl font-bold text-foreground mt-1 tracking-tight">{display}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${cfg.color}`}>
          {cfg.icon}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Actual</span>
          <span>Target: {targetDisplay}</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              clampedPct >= 100 ? 'bg-emerald-500' : clampedPct >= 75 ? 'bg-primary' : 'bg-amber-500'
            }`}
            style={{ width: `${clampedPct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            isAbove
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
        >
          {isAbove ? '▲' : '▼'} {cfg.prefix}{formatCompact(Math.abs(gap))} vs target
        </span>
        <span className="text-[10px] text-muted-foreground">{pct.toFixed(0)}% achieved</span>
      </div>

      <p className="text-[10px] text-muted-foreground/70">{cfg.description}</p>
    </div>
  );
}

export default function AdvancedKPISection() {
  const [data, setData] = useState<OlapAdvancedKpiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/kpis-advanced')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refYear = data?.currentYear ?? new Date().getFullYear();
  const refQ = data?.currentQuarter ?? Math.ceil((new Date().getMonth() + 1) / 3);

  // KPI target assumptions (representative academic/demo targets)
  const configs: KpiCardConfig[] = [
    {
      id: 'ytd',
      label: `${refYear} Year-to-Date Revenue`,
      value: data?.ytdRevenue ?? 0,
      target: 2_500_000,
      prefix: '$',
      icon: '💰',
      color: 'bg-indigo-500/10 text-indigo-500',
      description: 'Total invoiced revenue for the current year',
    },
    {
      id: 'qtd',
      label: `${QUARTER_NAMES[refQ - 1]} ${refYear} Revenue`,
      value: data?.qtdRevenue ?? 0,
      target: 650_000,
      prefix: '$',
      icon: '📅',
      color: 'bg-violet-500/10 text-violet-500',
      description: 'Revenue booked in the current quarter',
    },
    {
      id: 'profit',
      label: 'Estimated Net Profit',
      value: data?.estimatedProfit ?? 0,
      target: 550_000,
      prefix: '$',
      icon: '📈',
      color: 'bg-emerald-500/10 text-emerald-500',
      description: 'Estimated at ~28% gross margin on net revenue',
    },
    {
      id: 'margin',
      label: 'Profit Margin %',
      value: data?.profitMarginPct ?? 0,
      target: 28,
      suffix: '%',
      icon: '🎯',
      color: 'bg-cyan-500/10 text-cyan-500',
      description: 'Gross profit as a percentage of total revenue',
      formatFn: (v) => `${v.toFixed(1)}%`,
    },
    {
      id: 'orders',
      label: 'Total Orders',
      value: data?.totalOrders ?? 0,
      target: 1200,
      icon: '🛒',
      color: 'bg-amber-500/10 text-amber-500',
      description: 'Unique sales orders processed this year',
    },
    {
      id: 'aov',
      label: 'Avg. Order Value',
      value: data?.avgOrderValue ?? 0,
      target: 2200,
      prefix: '$',
      icon: '🧮',
      color: 'bg-pink-500/10 text-pink-500',
      description: 'Mean revenue value per sales order',
    },
    {
      id: 'discount',
      label: 'Total Discount Impact',
      value: data?.discountImpact ?? 0,
      target: 180_000,
      prefix: '$',
      icon: '🏷️',
      color: 'bg-orange-500/10 text-orange-500',
      description: 'Total value given away as promotional discounts',
    },
    {
      id: 'tax',
      label: 'Tax Collected',
      value: data?.taxAmount ?? 0,
      target: 220_000,
      prefix: '$',
      icon: '🏦',
      color: 'bg-slate-500/10 text-slate-500',
      description: 'Total tax amount collected across all orders',
    },
  ];

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Advanced KPI Tracker</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Actual vs. Target with attainment progress</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <Trend value={data.revenueGrowthPct} />
          )}
          <DataSourceBadge isLive={data?.dataSource === 'live'} loading={loading} />
        </div>
      </div>

      {/* YoY summary banner */}
      {data && !loading && (
        <div className={`rounded-xl border px-4 py-3 text-xs flex items-center justify-between ${
          data.revenueGrowthPct >= 0
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400'
        }`}>
          <span className="font-semibold">
            {data.revenueGrowthPct >= 0 ? '📈' : '📉'} Year-over-Year Revenue{' '}
            {data.revenueGrowthPct >= 0 ? 'Growth' : 'Decline'}:{' '}
            {formatPercent(data.revenueGrowthPct / 100)}
          </span>
          <span className="text-muted-foreground">
            {refYear - 1}: ${formatCompact(data.previousYearRevenue)} → {refYear}: ${formatCompact(data.ytdRevenue)}
          </span>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {configs.map(cfg => (
          <KpiCard key={cfg.id} cfg={cfg} loading={loading} />
        ))}
      </div>
    </section>
  );
}
