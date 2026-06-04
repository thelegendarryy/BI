'use client';

import React, { useEffect, useState } from 'react';
import { OlapAdvancedKpiResponse } from '../types/dashboard';
import { DataSourceBadge } from './LoadingSkeleton';
import { formatCompact } from '../lib/export';
import { useDashboard } from '../context/DashboardContext';

const QUARTER_NAMES = ['Q1', 'Q2', 'Q3', 'Q4'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface IntelCard {
  label: string;
  value: string;
  sub: string;
  delta?: number;
  color: string;
  icon: string;
}

function IntelKpiCard({ card }: { card: IntelCard }) {
  const isPositive = (card.delta ?? 0) >= 0;
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
        {card.delta !== undefined && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
            isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
          }`}>
            {isPositive ? '▲' : '▼'} {Math.abs(card.delta).toFixed(1)}%
          </span>
        )}
        <span className="text-[10px] text-muted-foreground">{card.sub}</span>
      </div>
    </div>
  );
}

export default function TimeIntelligence() {
  const { demoMode } = useDashboard();
  const [data, setData] = useState<OlapAdvancedKpiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = demoMode ? '/api/kpis-advanced?demo=true' : '/api/kpis-advanced';
    fetch(url)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [demoMode]);

  const refYear = data?.currentYear ?? new Date().getFullYear();
  const refQ = data?.currentQuarter ?? Math.ceil((new Date().getMonth() + 1) / 3);
  const refM = data?.currentMonth ?? new Date().getMonth() + 1;

  const cards: IntelCard[] = [
    {
      label: `YTD Revenue (${refYear})`,
      value: `$${formatCompact(data?.ytdRevenue ?? 0)}`,
      sub: `vs $${formatCompact(data?.previousYearRevenue ?? 0)} prior year`,
      delta: data?.revenueGrowthPct,
      color: 'bg-indigo-500/10 text-indigo-500',
      icon: '📆',
    },
    {
      label: `${QUARTER_NAMES[refQ - 1]} Revenue`,
      value: `$${formatCompact(data?.qtdRevenue ?? 0)}`,
      sub: `vs $${formatCompact(data?.previousQuarterRevenue ?? 0)} prior quarter`,
      delta: data && data.previousQuarterRevenue > 0
        ? ((data.qtdRevenue - data.previousQuarterRevenue) / data.previousQuarterRevenue) * 100
        : undefined,
      color: 'bg-violet-500/10 text-violet-500',
      icon: '📊',
    },
    {
      label: `${MONTH_NAMES[refM - 1]} Revenue (MTD)`,
      value: `$${formatCompact(data?.mtdRevenue ?? 0)}`,
      sub: 'Month-to-date cumulative',
      color: 'bg-cyan-500/10 text-cyan-500',
      icon: '🗓️',
    },
    {
      label: 'Prior Year Revenue',
      value: `$${formatCompact(data?.previousYearRevenue ?? 0)}`,
      sub: `${refYear - 1} full year baseline`,
      color: 'bg-slate-500/10 text-slate-500',
      icon: '🕑',
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Time Intelligence</h2>
          <p className="text-xs text-muted-foreground mt-0.5">YTD · QTD · MTD · Prior Year comparison</p>
        </div>
        <DataSourceBadge isLive={data?.dataSource === 'live'} loading={loading} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="premium-card bg-card border border-border rounded-2xl p-4 h-28 animate-pulse" />
            ))
          : cards.map((card, i) => <IntelKpiCard key={i} card={card} />)}
      </div>
    </section>
  );
}
