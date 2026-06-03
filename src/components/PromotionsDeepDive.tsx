'use client';

/**
 * PromotionsDeepDive.tsx — Promotion Elasticity & Margin Deep-Dive view
 *
 * Data source:
 * - Promotions bar chart: /api/sales-by-promotion (OLAP) → fallback to static promotionsData
 * - Discount sensitivity chart: static only (requires pre-computed discount buckets)
 */

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { useSalesByPromotion } from '../hooks/useOlapData';
import { ChartSkeleton, OlapErrorBanner, DataSourceBadge } from './LoadingSkeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Line,
  Legend
} from 'recharts';
import { Percent, Sparkles, TrendingUp, Info } from 'lucide-react';

export const PromotionsDeepDive: React.FC = () => {
  // Static fallback data
  const { promotionsData, discountDeepDive, theme } = useDashboard();

  // Live OLAP data
  const { data: olapPromotions, loading, error } = useSalesByPromotion();
  const isLive = !loading && !error && olapPromotions !== null;

  const isDark = theme === 'dark';
  const chartTheme = {
    promoBar: isDark ? '#818cf8' : '#4f46e5',
    volumeBar: isDark ? '#60a5fa' : '#2563eb',
    marginLine: isDark ? '#34d399' : '#10b981',
    text: isDark ? '#94a3b8' : '#64748b',
    grid: isDark ? '#1e293b' : '#e2e8f0',
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

  // Transform OLAP data to chart format
  const olapChartData = olapPromotions?.map((p) => ({
    name: p.promotionType,
    revenue: Math.round(p.lineTotal),
    volume: p.quantity,
    avgDiscountPercent: p.avgDiscountPercent,
  })) ?? [];

  const promoChartData = isLive ? olapChartData : promotionsData;

  // Custom tooltip for promotion comparison
  const PromoTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-lg text-xs space-y-1">
          <p className="font-bold text-foreground mb-1">{label}</p>
          <div className="flex justify-between gap-4 items-center">
            <span className="text-muted-foreground">Revenue:</span>
            <span className="font-semibold text-primary">{formatCurrency(payload[0].value)}</span>
          </div>
          <div className="flex justify-between gap-4 items-center">
            <span className="text-muted-foreground">Volume Sold:</span>
            <span className="font-semibold text-foreground">{formatNumber(payload[0].payload.volume)} units</span>
          </div>
          <div className="flex justify-between gap-4 items-center border-t border-border/40 pt-1 mt-1">
            <span className="text-muted-foreground font-medium">Avg Discount Rate:</span>
            <span className="font-bold text-amber-500">{payload[0].payload.avgDiscountPercent}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for sensitivity chart
  const SensitivityTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const volumePayload = payload.find((p: any) => p.dataKey === 'volume');
      const marginPayload = payload.find((p: any) => p.dataKey === 'marginPercent');
      return (
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-lg text-xs space-y-1.5 min-w-[170px]">
          <p className="font-bold text-foreground border-b border-border/60 pb-1 mb-1">Discount Rate: {label}</p>
          {volumePayload && (
            <div className="flex justify-between gap-4 items-center">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                <span className="text-muted-foreground">Units Sold:</span>
              </span>
              <span className="font-semibold text-foreground">{formatNumber(volumePayload.value)} units</span>
            </div>
          )}
          {marginPayload && (
            <div className="flex justify-between gap-4 items-center">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                <span className="text-muted-foreground">Avg Margin %:</span>
              </span>
              <span className="font-bold text-emerald-500">{marginPayload.value}%</span>
            </div>
          )}
          <div className="flex justify-between gap-4 items-center border-t border-border/40 pt-1 mt-1 text-[10px] text-muted-foreground">
            <span>Avg Order Quantity:</span>
            <span className="font-medium text-foreground">{payload[0].payload.avgOrderQuantity} / order</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && <OlapErrorBanner message={error} endpoint="/api/sales-by-promotion" />}

      {/* Promotion Slices Overview */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Promotion Campaigns Performance</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLive
                  ? 'Live MDX: [Promotions].[Promotion Type] × [Measures].[Line Total, Discount Amount]'
                  : 'Revenue and volume by promotion type — static fallback data.'}
              </p>
            </div>
          </div>
          <DataSourceBadge isLive={isLive} loading={loading} />
        </div>

        <div className="h-[280px] w-full text-foreground select-none">
          {loading ? (
            <ChartSkeleton height={280} />
          ) : promoChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              No promotion data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={promoChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                <XAxis 
                  dataKey="name" 
                  stroke={chartTheme.text} 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis 
                  stroke={chartTheme.text} 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val / 1000}k`}
                  dx={-8}
                />
                <Tooltip content={<PromoTooltip />} />
                <Bar dataKey="revenue" fill={chartTheme.promoBar} radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Discount Rate Sensitivity Analysis — static only */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Discount Rate Elasticity & Profit Sensitivity</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dual-axis mapping: discount % vs aggregate transaction volume vs profit margins.
              </p>
            </div>
          </div>
          {/* This chart uses computed static data — MDX cannot easily compute discount buckets */}
          <DataSourceBadge isLive={false} />
        </div>

        <div className="h-[300px] w-full text-foreground select-none">
          {discountDeepDive.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              No data available for the active filters.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={discountDeepDive} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                <XAxis 
                  dataKey="name" 
                  stroke={chartTheme.text} 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={8}
                />
                <YAxis 
                  yAxisId="left"
                  stroke={chartTheme.text} 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Quantity Sold (Units)', angle: -90, position: 'insideLeft', style: { fill: chartTheme.text, fontSize: 10, textAnchor: 'middle' }, offset: -5 }}
                  dx={-5}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke={chartTheme.text} 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}%`}
                  label={{ value: 'Average Profit Margin %', angle: 90, position: 'insideRight', style: { fill: chartTheme.text, fontSize: 10, textAnchor: 'middle' }, offset: -5 }}
                  dx={5}
                />
                <Tooltip content={<SensitivityTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: chartTheme.text }}
                />
                <Bar 
                  yAxisId="left"
                  name="Volume Sold (Units)" 
                  dataKey="volume" 
                  fill={chartTheme.volumeBar} 
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Line 
                  yAxisId="right"
                  name="Avg Profit Margin %" 
                  type="monotone" 
                  dataKey="marginPercent" 
                  stroke={chartTheme.marginLine} 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Insight Box */}
        <div className="p-4 bg-primary/[0.02] border border-primary/10 rounded-2xl space-y-2 mt-4">
          <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Executive OLAP Elasticity Insight
          </h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            The data demonstrates standard retail price elasticity. Zero discount sales generate the highest 
            average gross profit margin (~53%), but limit transaction velocity. Transitioning to higher discount 
            brackets (e.g. 10% to 15%) drives significantly larger volume sales, yet the profit margins decay 
            steadily. Black Friday (20% discount) results in the highest volume spikes, but represents the lowest 
            profit margin point (~34%), illustrating the inflection trade-off between volume scale and net returns.
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 pt-1">
            <Info className="w-3 h-3" />
            <span>Sensitivity chart uses pre-computed discount buckets from local dataset.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
