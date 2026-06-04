'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { OlapGeographySale } from '../types/dashboard';
import { DataSourceBadge, ChartSkeleton, EmptyState } from './LoadingSkeleton';
import { formatCompact, exportToCSV } from '../lib/export';

import { useDashboard } from '../context/DashboardContext';
import { OlapErrorBanner } from './LoadingSkeleton';

const COUNTRY_FLAGS: Record<string, string> = {
  USA: '🇺🇸', Canada: '🇨🇦', UK: '🇬🇧', Germany: '🇩🇪',
  France: '🇫🇷', Japan: '🇯🇵', 'South Korea': '🇰🇷', Australia: '🇦🇺',
  Brazil: '🇧🇷', India: '🇮🇳',
};

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#60a5fa',
  '#34d399', '#fbbf24', '#f87171', '#fb923c',
];

interface GeographyData {
  data: OlapGeographySale[];
  dataSource: 'live' | 'static';
  groupBy: string;
}

interface TooltipPayload {
  value: number;
  name: string;
  payload: { location: string };
}

function GeoTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-xs shadow-xl">
      <p className="font-semibold text-foreground">{d.payload?.location ?? d.name}</p>
      <p className="text-muted-foreground mt-1">Revenue: <span className="text-foreground font-bold">${formatCompact(d.value)}</span></p>
    </div>
  );
}

export default function GeographicAnalysis() {
  const { demoMode, setDemoMode } = useDashboard();
  const [countryData, setCountryData] = useState<GeographyData | null>(null);
  const [cityData, setCityData] = useState<GeographyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const cUrl = demoMode ? '/api/sales-by-geography?groupBy=country&demo=true' : '/api/sales-by-geography?groupBy=country';
    const ciUrl = demoMode ? '/api/sales-by-geography?groupBy=city&demo=true' : '/api/sales-by-geography?groupBy=city';

    Promise.all([
      fetch(cUrl).then(r => {
        if (!r.ok) throw new Error('Failed to fetch country geographic data');
        return r.json();
      }),
      fetch(ciUrl).then(r => {
        if (!r.ok) throw new Error('Failed to fetch city geographic data');
        return r.json();
      }),
    ])
      .then(([c, ci]) => {
        setCountryData(c);
        setCityData(ci);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [demoMode]);

  if (error && !demoMode) {
    return (
      <div className="space-y-6">
        <OlapErrorBanner message={error} endpoint="/api/sales-by-geography" />
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center max-w-xl mx-auto space-y-4 my-8">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-foreground">Database Connection Offline</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Geographic sales analysis metrics could not be retrieved because the database server is offline. 
            To proceed using local pre-seeded snapshot data, click below to enable Demo Mode.
          </p>
          <button
            onClick={() => setDemoMode(true)}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm select-none active:scale-95 cursor-pointer"
          >
            Enable Presentation Demo Mode
          </button>
        </div>
      </div>
    );
  }

  const topCountries = (countryData?.data ?? []).slice(0, 10).map(d => ({
    location: d.country,
    revenue: d.lineTotal,
    orders: d.orderCount,
  }));

  const topCities = (cityData?.data ?? []).slice(0, 8).map(d => ({
    location: d.city ?? d.country,
    revenue: d.lineTotal,
    orders: d.orderCount,
  }));

  const handleExportCountries = () => {
    if (!countryData) return;
    exportToCSV(
      countryData.data.map(d => ({
        Country: d.country,
        'Revenue (USD)': d.lineTotal,
        'Qty Sold': d.quantity,
        'Orders': d.orderCount,
      })),
      'SalesCube_Geographic_Countries'
    );
  };

  const isLive = countryData?.dataSource === 'live';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Geographic Analysis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Revenue distribution by customer country and city
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge isLive={isLive} loading={loading} />
          {!loading && countryData && (
            <button
              onClick={handleExportCountries}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              📥 Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Summary stat cards */}
      {!loading && countryData && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">Markets Served</p>
            <p className="text-2xl font-bold text-foreground mt-1">{countryData.data.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Countries with active orders</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">Top Market Revenue</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              ${formatCompact(countryData.data[0]?.lineTotal ?? 0)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {COUNTRY_FLAGS[countryData.data[0]?.country ?? ''] ?? '🌍'} {countryData.data[0]?.country ?? '—'}
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">Cities Reached</p>
            <p className="text-2xl font-bold text-foreground mt-1">{cityData?.data.length ?? 0}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Unique city locations</p>
          </div>
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue by Country */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Revenue by Country</h2>
          {loading ? <ChartSkeleton height={300} /> : !topCountries.length ? (
            <EmptyState title="No country data" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCountries} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => `$${formatCompact(v)}`}
                />
                <YAxis
                  type="category"
                  dataKey="location"
                  tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                  tickLine={false} axisLine={false}
                  width={90}
                  tickFormatter={(v: string) => `${COUNTRY_FLAGS[v] ?? '🌍'} ${v}`}
                />
                <Tooltip content={<GeoTooltip />} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {topCountries.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue by City */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Top Cities by Revenue</h2>
          {loading ? <ChartSkeleton height={300} /> : !topCities.length ? (
            <EmptyState title="No city data" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCities} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => `$${formatCompact(v)}`}
                />
                <YAxis
                  type="category"
                  dataKey="location"
                  tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                  tickLine={false} axisLine={false}
                  width={90}
                />
                <Tooltip content={<GeoTooltip />} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {topCities.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Country revenue table */}
      {!loading && countryData && countryData.data.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Country Revenue Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">#</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Country</th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">Revenue</th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">Orders</th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {(() => {
                  const total = countryData.data.reduce((t, d) => t + d.lineTotal, 0);
                  return countryData.data.map((d, i) => (
                    <tr key={i} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-5 py-3 font-medium text-foreground">
                        {COUNTRY_FLAGS[d.country] ?? '🌍'} {d.country}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-foreground">
                        ${formatCompact(d.lineTotal)}
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{d.orderCount.toLocaleString()}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(d.lineTotal / total) * 100}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground w-10 text-right">
                            {((d.lineTotal / total) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
