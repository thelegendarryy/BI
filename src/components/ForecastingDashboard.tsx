'use client';

import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { OlapForecastResponse, ForecastPoint } from '../types/dashboard';
import { DataSourceBadge, ChartSkeleton, EmptyState } from './LoadingSkeleton';
import { formatCompact, formatPeriod, exportToCSV } from '../lib/export';

const PALETTE = {
  actual: '#6366f1',    // indigo
  forecast: '#f59e0b',  // amber
  movingAvg: '#10b981', // emerald
};

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-3 text-xs space-y-1.5 min-w-[160px]">
      <p className="font-semibold text-foreground">{formatPeriod(label ?? '')}</p>
      {(payload as TooltipPayload[]).map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-foreground">${formatCompact(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub: string; icon: string; color: string;
}) {
  return (
    <div className={`premium-card border rounded-2xl p-4 flex flex-col gap-1 ${color}`}>
      <div className="flex items-center gap-2 text-xs font-medium opacity-80">
        <span>{icon}</span>
        {label}
      </div>
      <p className="text-xl font-bold tracking-tight">{value}</p>
      <p className="text-[10px] opacity-70">{sub}</p>
    </div>
  );
}

export default function ForecastingDashboard() {
  const [data, setData] = useState<OlapForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/forecasting')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleExport = () => {
    if (!data?.data) return;
    exportToCSV(
      data.data.map(d => ({
        Period: d.period,
        Actual: d.actual ?? '',
        Forecast: d.forecast ?? '',
        'Moving Average': d.movingAvg ?? '',
        'Is Forecasted': d.isForecasted ? 'Yes' : 'No',
      })),
      'SalesCube_Forecast'
    );
  };

  // Find the boundary period (first forecasted point)
  const splitPeriod = data?.data.find(d => d.isForecasted)?.period;

  const chartData = data?.data.map((d: ForecastPoint) => ({
    period: d.period,
    Actual: d.actual,
    Forecast: d.forecast,
    'Moving Avg': d.movingAvg,
    isForecasted: d.isForecasted,
  })) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Sales Forecasting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            3-Month ahead revenue projection using linear regression + moving average
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge isLive={data?.dataSource === 'live'} loading={loading} />
          {data && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              📥 Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard
            label="Next Month Forecast"
            value={`$${formatCompact(data.nextMonthForecast)}`}
            sub="Blended model projection"
            icon="🔮"
            color="bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
          />
          <SummaryCard
            label="Next Quarter Forecast"
            value={`$${formatCompact(data.nextQuarterForecast)}`}
            sub="3-month aggregate projection"
            icon="📈"
            color="bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400"
          />
          <SummaryCard
            label="Model Confidence"
            value={`${data.confidence}%`}
            sub={`R² = ${(data.rSquared ?? 0).toFixed(3)} · ${data.data.filter(d => !d.isForecasted).length} months data`}
            icon="🎯"
            color="bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
          />
        </div>
      ) : null}

      {/* Forecast Chart */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Revenue Trend & Forecast</h2>
            <p className="text-xs text-muted-foreground">Solid = historical · Dashed = projected</p>
          </div>
          {data?.method && (
            <span className="text-[10px] text-muted-foreground bg-secondary rounded-full px-2 py-1">
              📐 {data.method}
            </span>
          )}
        </div>

        {loading ? (
          <ChartSkeleton height={320} />
        ) : !chartData.length ? (
          <EmptyState title="No forecast data" message="Not enough historical data to generate a forecast." />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <defs>
                <linearGradient id="fgActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE.actual} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={PALETTE.actual} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fgForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE.forecast} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={PALETTE.forecast} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatPeriod}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `$${formatCompact(v)}`}
                width={65}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              {splitPeriod && (
                <ReferenceLine
                  x={splitPeriod}
                  stroke={PALETTE.forecast}
                  strokeDasharray="4 4"
                  label={{ value: 'Forecast ▶', position: 'top', fontSize: 9, fill: PALETTE.forecast }}
                />
              )}
              <Area
                type="monotone"
                dataKey="Actual"
                stroke={PALETTE.actual}
                strokeWidth={2}
                fill="url(#fgActual)"
                dot={false}
                connectNulls={false}
              />
              <Area
                type="monotone"
                dataKey="Forecast"
                stroke={PALETTE.forecast}
                strokeWidth={2}
                strokeDasharray="6 3"
                fill="url(#fgForecast)"
                dot={false}
                connectNulls={false}
              />
              <Area
                type="monotone"
                dataKey="Moving Avg"
                stroke={PALETTE.movingAvg}
                strokeWidth={1.5}
                strokeDasharray="3 2"
                fill="none"
                dot={false}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Methodology note */}
      <div className="bg-secondary/40 border border-border rounded-xl p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground text-sm">📐 Forecast Methodology</p>
        <p>The forecast uses a blended model combining <strong>Ordinary Least Squares linear regression</strong> (60% weight) and a <strong>3-month Simple Moving Average</strong> (40% weight). This hybrid approach reduces variance from single-method forecasts.</p>
        <p className="mt-1">The <strong>R² coefficient of determination</strong> measures how well the linear trend explains past variance. A value close to 1.0 indicates a strong linear trend. Low R² values suggest seasonality or external shocks should be modelled separately.</p>
      </div>
    </div>
  );
}
