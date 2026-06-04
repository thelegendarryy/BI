'use client';

import React, { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { OlapCustomerAnalysis } from '../types/dashboard';
import { DataSourceBadge, ChartSkeleton, EmptyState } from './LoadingSkeleton';
import { formatCompact, exportToCSV } from '../lib/export';

const SEGMENT_COLORS: Record<string, string> = {
  Corporate: '#6366f1',
  Wholesale: '#10b981',
  Retail: '#f59e0b',
};
const FALLBACK_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f87171'];

const TYPE_ICONS: Record<string, string> = {
  Corporate: '🏢',
  Wholesale: '📦',
  Retail: '🛍️',
};

interface SegmentTooltipPayload {
  name: string;
  value: number;
  payload: { lineTotal: number };
}

function SegTooltip({ active, payload }: { active?: boolean; payload?: SegmentTooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-xs shadow-xl">
      <p className="font-semibold text-foreground">{d.name}</p>
      <p className="text-muted-foreground mt-1">Revenue: <span className="font-bold text-foreground">${formatCompact(d.value)}</span></p>
    </div>
  );
}

export default function CustomerAnalysis() {
  const [data, setData] = useState<OlapCustomerAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customers-analysis')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleExport = () => {
    if (!data) return;
    exportToCSV(
      data.topCustomers.map(c => ({
        Customer: c.customer,
        Type: c.customerType,
        Country: c.country,
        'Revenue (USD)': c.lineTotal,
        Orders: c.orderCount,
        'Avg Order Value': c.avgOrderValue,
      })),
      'SalesCube_TopCustomers'
    );
  };

  const pieData = (data?.bySegment ?? []).map(s => ({
    name: s.segment,
    value: s.lineTotal,
  }));

  const barData = (data?.topCustomers ?? []).slice(0, 8).map(c => ({
    name: c.customer.length > 18 ? c.customer.slice(0, 16) + '…' : c.customer,
    revenue: c.lineTotal,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Customer Analysis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Top customers, revenue by segment, and customer segmentation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge isLive={data?.dataSource === 'live'} loading={loading} />
          {!loading && data && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              📥 Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Segment summary cards */}
      {!loading && data && (
        <div className="grid grid-cols-3 gap-4">
          {data.bySegment.map((seg, i) => (
            <div
              key={seg.segment}
              className="premium-card bg-card border border-border rounded-2xl p-4 flex flex-col gap-1"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>{TYPE_ICONS[seg.segment] ?? '👤'}</span>
                {seg.segment}
              </div>
              <p className="text-xl font-bold text-foreground">${formatCompact(seg.lineTotal)}</p>
              <p className="text-[10px] text-muted-foreground">
                {seg.customerCount} customers · {seg.orderCount} orders
              </p>
              <div className="h-1 bg-secondary rounded-full mt-1">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(seg.lineTotal / (data.bySegment.reduce((t, s) => t + s.lineTotal, 0) || 1)) * 100}%`,
                    background: SEGMENT_COLORS[seg.segment] ?? FALLBACK_COLORS[i],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pie: revenue by segment */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Revenue by Customer Segment</h2>
          {loading ? (
            <ChartSkeleton height={260} />
          ) : !pieData.length ? (
            <EmptyState title="No segment data" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={SEGMENT_COLORS[entry.name] ?? FALLBACK_COLORS[i]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<SegTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar: top customers */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Top 8 Customers by Revenue</h2>
          {loading ? (
            <ChartSkeleton height={260} />
          ) : !barData.length ? (
            <EmptyState title="No customer data" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => `$${formatCompact(v)}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                  tickLine={false} axisLine={false}
                  width={110}
                />
                <Tooltip
                  formatter={(v) => [`$${formatCompact(Number(v))}`, 'Revenue']}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.75rem',
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[0, 6, 6, 0]} maxBarSize={20}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Customers table */}
      {!loading && data && data.topCustomers.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Top Customers Detail</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">#</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Customer</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Type</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Country</th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">Revenue</th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">Orders</th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">Avg Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {data.topCustomers.map((c, i) => (
                  <tr key={i} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3 text-muted-foreground font-mono text-[10px]">#{i + 1}</td>
                    <td className="px-5 py-3 font-semibold text-foreground max-w-[200px] truncate">
                      {c.customer}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: `${SEGMENT_COLORS[c.customerType] ?? '#6366f1'}18`,
                          color: SEGMENT_COLORS[c.customerType] ?? '#6366f1',
                        }}
                      >
                        {TYPE_ICONS[c.customerType] ?? '👤'} {c.customerType}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{c.country}</td>
                    <td className="px-5 py-3 text-right font-bold text-foreground">
                      ${formatCompact(c.lineTotal)}
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground">{c.orderCount}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground">
                      ${formatCompact(c.avgOrderValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
