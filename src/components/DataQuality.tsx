'use client';

import React, { useEffect, useState } from 'react';
import { DataQualityResponse } from '../types/dashboard';
import { DataSourceBadge } from './LoadingSkeleton';

type StatusLevel = 'good' | 'warn' | 'error' | 'info';

interface QualityCard {
  label: string;
  value: string;
  sub: string;
  status: StatusLevel;
  icon: string;
}

const STATUS_STYLES: Record<StatusLevel, string> = {
  good: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  warn: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400',
  error: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400',
  info: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400',
};

const STATUS_DOT: Record<StatusLevel, string> = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-indigo-500',
};

function QCard({ card }: { card: QualityCard }) {
  return (
    <div className={`premium-card border rounded-2xl p-4 flex flex-col gap-2 ${STATUS_STYLES[card.status]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium opacity-80">{card.label}</span>
        <span className="text-lg">{card.icon}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{card.value}</p>
      <div className="flex items-center gap-1.5 text-[10px] opacity-70">
        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[card.status]}`} />
        {card.sub}
      </div>
    </div>
  );
}

function DimRow({ label, count, icon }: { label: string; count: number; icon: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 text-sm text-foreground">
        <span>{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold text-foreground">{count.toLocaleString()}</span>
    </div>
  );
}

export default function DataQuality() {
  const [data, setData] = useState<DataQualityResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/data-quality')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Determine status for each card
  const cubeStatus: StatusLevel =
    data?.cubeStatus === 'connected' ? 'good' :
    data?.cubeStatus === 'disconnected' ? 'error' : 'warn';

  const freshnessStatus: StatusLevel =
    data?.etlIndicators.status === 'fresh' ? 'good' :
    data?.etlIndicators.status === 'stale' ? 'warn' : 'info';

  const nullStatus: StatusLevel =
    (data?.nullLineTotals ?? 0) === 0 ? 'good' :
    (data?.nullLineTotals ?? 0) < 10 ? 'warn' : 'error';

  const cards: QualityCard[] = [
    {
      label: 'Total Fact Rows',
      value: (data?.totalRows ?? 0).toLocaleString(),
      sub: 'Records in FactSales table',
      status: (data?.totalRows ?? 0) > 0 ? 'good' : 'warn',
      icon: '📊',
    },
    {
      label: 'Null LineTotal Rows',
      value: (data?.nullLineTotals ?? 0).toString(),
      sub: (data?.nullLineTotals ?? 0) === 0 ? 'No null revenue values — data integrity OK' : 'Rows with missing revenue — review ETL',
      status: nullStatus,
      icon: '🔍',
    },
    {
      label: 'Last Order Date',
      value: data?.lastOrderDate ?? '—',
      sub: `${data?.etlIndicators.dataFreshnessDays ?? '?'} days ago · ${data?.etlIndicators.status ?? 'unknown'}`,
      status: freshnessStatus,
      icon: '📅',
    },
    {
      label: 'SSAS Cube Status',
      value: data?.cubeStatus === 'connected' ? 'Connected' :
             data?.cubeStatus === 'disconnected' ? 'Disconnected' : 'Unknown',
      sub: data?.cubeLinkedServerExists
        ? 'Linked server SSAS_CUBE is registered'
        : 'Linked server not found or not accessible',
      status: cubeStatus,
      icon: '🧊',
    },
    {
      label: 'Null Customer IDs',
      value: (data?.nullCustomers ?? 0).toString(),
      sub: (data?.nullCustomers ?? 0) === 0 ? 'All orders have valid customer keys' : 'Orphan records detected',
      status: (data?.nullCustomers ?? 0) === 0 ? 'good' : 'error',
      icon: '👤',
    },
    {
      label: 'Null Employee IDs',
      value: (data?.nullEmployees ?? 0).toString(),
      sub: (data?.nullEmployees ?? 0) === 0 ? 'All orders have assigned sales reps' : 'Unassigned orders exist',
      status: (data?.nullEmployees ?? 0) === 0 ? 'good' : 'warn',
      icon: '👔',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Data Quality Monitor</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Data warehouse health checks, null value audits, and SSAS cube status
          </p>
        </div>
        <DataSourceBadge
          isLive={data?.cubeStatus === 'connected'}
          loading={loading}
        />
      </div>

      {/* Status summary banner */}
      {!loading && data && (
        <div className={`rounded-xl border px-4 py-3 text-xs flex items-center justify-between ${
          data.nullLineTotals === 0 && data.nullCustomers === 0 && data.nullEmployees === 0
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400'
        }`}>
          <span className="font-semibold">
            {data.nullLineTotals === 0 && data.nullCustomers === 0 && data.nullEmployees === 0
              ? '✅ Data integrity checks passed — no null foreign keys or revenue values detected.'
              : '⚠️ Data quality issues detected — review the highlighted metrics below.'}
          </span>
          <span className="text-muted-foreground">
            Last check: {new Date().toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Quality cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 h-28 animate-pulse" />
            ))
          : cards.map((c, i) => <QCard key={i} card={c} />)
        }
      </div>

      {/* ETL Indicators */}
      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ETL Summary */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">ETL Load Indicators</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Fact Rows</span>
                <span className="font-semibold text-foreground">{data.etlIndicators.totalFactRows.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Est. Load Time</span>
                <span className="font-semibold text-foreground">{data.etlIndicators.estimatedLoadTime}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Data Freshness</span>
                <span className={`font-semibold ${
                  data.etlIndicators.status === 'fresh' ? 'text-emerald-500' :
                  data.etlIndicators.status === 'stale' ? 'text-amber-500' : 'text-muted-foreground'
                }`}>
                  {data.etlIndicators.dataFreshnessDays} days ({data.etlIndicators.status})
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Last Refresh</span>
                <span className="font-semibold text-foreground">{data.lastRefreshDate ?? 'Unknown'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">SSAS Linked Server</span>
                <span className={`font-semibold ${data.cubeLinkedServerExists ? 'text-emerald-500' : 'text-red-500'}`}>
                  {data.cubeLinkedServerExists ? 'Registered ✓' : 'Not Found ✗'}
                </span>
              </div>
            </div>
          </div>

          {/* Dimension counts */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Dimension Table Sizes</h2>
            <DimRow label="Brands" count={data.dimensionCounts.brands} icon="🏷️" />
            <DimRow label="Products" count={data.dimensionCounts.products} icon="📦" />
            <DimRow label="Customers" count={data.dimensionCounts.customers} icon="👥" />
            <DimRow label="Employees" count={data.dimensionCounts.employees} icon="👔" />
            <DimRow label="Promotions" count={data.dimensionCounts.promotions} icon="🎁" />
            <DimRow label="Date Dimension" count={data.dimensionCounts.dates} icon="📅" />
          </div>
        </div>
      )}

      {/* SSAS Architecture note */}
      <div className="bg-secondary/40 border border-border rounded-xl p-4 text-xs text-muted-foreground space-y-1.5">
        <p className="font-semibold text-foreground text-sm">🏗️ Architecture Note</p>
        <p>
          This BI system uses a <strong>SQL Server Data Warehouse (EntrepriseDW)</strong> as the relational layer,
          with an <strong>SSAS Multidimensional cube</strong> (Entreprise DW) exposed via a SQL Server Linked Server
          named <code className="bg-secondary px-1 rounded text-[10px]">SSAS_CUBE</code> using OPENQUERY.
        </p>
        <p>
          The Next.js API routes execute MDX queries via T-SQL and join the results against relational dimension tables
          to resolve descriptive attributes (names, labels) not yet exposed as SSAS cube attributes.
          This is a known hybrid pattern and a planned SSAS enhancement.
        </p>
      </div>
    </div>
  );
}
