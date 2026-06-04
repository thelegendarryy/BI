'use client';

/**
 * PromotionsDeepDive.tsx — Discount Elasticity & Product Performance Deep-Dive
 *
 * Data sources:
 * - Top Products chart: /api/sales-by-product (SQL DW / SSAS)
 * - Discount sensitivity chart: /api/sales-by-discount-rate (DW query with filters)
 */

import React, { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { useSalesByProduct, useSalesByDiscountRate } from '../hooks/useOlapData';
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
import { Percent, Package, TrendingUp, Info, HelpCircle, Trophy, Star } from 'lucide-react';

export const PromotionsDeepDive: React.FC = () => {
  const { discountDeepDive, categoryData: staticProductData, filters, theme, demoMode, setDemoMode } = useDashboard();

  // Live data hooks
  const { data: olapProducts, loading: productsLoading, error: productsError } = useSalesByProduct(filters);
  const { data: olapDiscountRes, loading: discountLoading, error: discountError } = useSalesByDiscountRate(filters);

  const olapDiscount = olapDiscountRes?.data ?? null;
  const olapDiscountSource = olapDiscountRes?.dataSource ?? 'static';

  // Availability flags
  const isProductsLive = !demoMode && !productsLoading && !productsError && olapProducts !== null && olapProducts.length > 0;
  const isDiscountLive = !demoMode && !discountLoading && !discountError && olapDiscount !== null;

  const isDark = theme === 'dark';
  const chartTheme = {
    productBar: isDark ? '#818cf8' : '#4f46e5',
    volumeBar: isDark ? '#60a5fa' : '#2563eb',
    marginLine: isDark ? '#34d399' : '#10b981',
    text: isDark ? '#94a3b8' : '#64748b',
    grid: isDark ? '#1e293b' : '#e2e8f0',
    accent: isDark ? '#f59e0b' : '#d97706',
  };

  const RANK_COLORS = [
    'bg-amber-500/20 text-amber-500 border-amber-500/30',
    'bg-slate-400/20 text-slate-400 border-slate-400/30',
    'bg-orange-600/20 text-orange-600 border-orange-600/30',
  ];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

  // Top 10 products from live data
  const topProducts = useMemo(() => {
    const source = isProductsLive ? (olapProducts ?? []) : [];
    const sorted = [...source].sort((a, b) => b.lineTotal - a.lineTotal).slice(0, 10);
    const totalRevenue = sorted.reduce((s, p) => s + p.lineTotal, 0) || 1;
    return sorted.map((p, i) => ({
      rank: i + 1,
      name: p.name,
      revenue: Math.round(p.lineTotal),
      quantity: p.quantity ?? 0,
      share: Math.round((p.lineTotal / totalRevenue) * 1000) / 10,
    }));
  }, [isProductsLive, olapProducts]);

  // Chart data — horizontal bar
  const productChartData = useMemo(() => topProducts.map(p => ({ name: p.name.length > 22 ? p.name.slice(0, 21) + '…' : p.name, revenue: p.revenue, share: p.share, quantity: p.quantity })), [topProducts]);

  // Transform discount elasticity data
  const discountChartData = useMemo(() => {
    if (demoMode) return discountDeepDive;
    return isDiscountLive ? (olapDiscount || []) : [];
  }, [demoMode, isDiscountLive, olapDiscount, discountDeepDive]);

  // Custom tooltip for product performance chart
  const ProductTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-lg text-xs space-y-1 min-w-[180px]">
          <p className="font-bold text-foreground mb-1 border-b border-border/50 pb-1">{label}</p>
          <div className="flex justify-between gap-4 items-center">
            <span className="text-muted-foreground">Revenue:</span>
            <span className="font-semibold text-primary">{formatCurrency(payload[0]?.value ?? 0)}</span>
          </div>
          <div className="flex justify-between gap-4 items-center">
            <span className="text-muted-foreground">Units Sold:</span>
            <span className="font-semibold text-foreground">{formatNumber(payload[0]?.payload?.quantity ?? 0)}</span>
          </div>
          <div className="flex justify-between gap-4 items-center border-t border-border/40 pt-1 mt-1">
            <span className="text-muted-foreground font-medium">Revenue Share:</span>
            <span className="font-bold text-amber-500">{payload[0]?.payload?.share ?? 0}%</span>
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
            <span className="font-medium text-foreground">{payload[0].payload.avgOrderQuantity || 0} / order</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Top Products Insight
  const productInsight = useMemo(() => {
    if (!isProductsLive || topProducts.length === 0) {
      return 'Connect to the SQL Server Data Warehouse to view live product performance rankings.';
    }
    const top1 = topProducts[0];
    const top3Revenue = topProducts.slice(0, 3).reduce((s, p) => s + p.revenue, 0);
    const totalRevenue = topProducts.reduce((s, p) => s + p.revenue, 0) || 1;
    const top3Share = Math.round((top3Revenue / totalRevenue) * 1000) / 10;
    return `Based on live warehouse data, "${top1.name}" is the highest-revenue product, generating ${formatCurrency(top1.revenue)} and representing ${top1.share}% of filtered revenue. The top 3 products together account for ${top3Share}% of total sales, indicating ${top3Share > 50 ? 'high SKU concentration — a business risk worth monitoring.' : 'healthy product diversification across the catalog.'}`;
  }, [isProductsLive, topProducts]);

  const elasticityInsight = useMemo(() => {
    if (demoMode) {
      return "Price elasticity analysis suggests that volume is highly responsive to discount rates. A 10% discount creates a 40% volume lift with moderate margin compression, representing the optimal promotion strategy for gross margin dollar maximization.";
    }
    if (!isDiscountLive || discountChartData.length === 0) {
      return "Discount sensitivity analysis is unavailable because live warehouse records could not be retrieved.";
    }

    const nonZeroDiscounts = discountChartData.filter(d => d.discount > 0);
    if (nonZeroDiscounts.length === 0) {
      return "All live transactions are recorded at 0% standard pricing. Elasticity mapping cannot be computed because no variable discount rates exist in the selected data segment.";
    }

    // Sort by volume to find maximum velocity
    const maxVolumePoint = [...discountChartData].sort((a, b) => b.volume - a.volume)[0];
    // Find maximum margin
    const maxMarginPoint = [...discountChartData].sort((a, b) => b.marginPercent - a.marginPercent)[0];

    return `Based on live transaction records, the discount rate of ${maxVolumePoint.name} yields the highest volume of ${formatNumber(maxVolumePoint.volume)} units, while the ${maxMarginPoint.name} discount rate maintains the healthiest average profit margin of ${maxMarginPoint.marginPercent}%. This proves standard retail price elasticity where profit margins compress systematically as discount rates increase.`;
  }, [demoMode, isDiscountLive, discountChartData]);

  return (
    <div className="space-y-6">
      {/* Presentation Demo Mode Header Toggle */}
      <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Presentation Demo Mode</h4>
            <p className="text-[10px] text-muted-foreground">
              {demoMode 
                ? 'Displaying static mock dataset for supervisor and academic defense demonstration.' 
                : 'Displaying live SQL and SSAS relational measurements. Toggle to preview demo data if live tables are empty.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDemoMode(!demoMode)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            demoMode ? 'bg-amber-500' : 'bg-secondary'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              demoMode ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Top Products Performance */}
      {!demoMode && productsError && (
        <OlapErrorBanner message={productsError} endpoint="/api/sales-by-product" />
      )}

      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Top Products Performance</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live SQL: Top 10 products ranked by revenue — FactSales × Products
              </p>
            </div>
          </div>
          <DataSourceBadge
            isLive={isProductsLive}
            loading={!demoMode && productsLoading}
          />
        </div>

        {/* Horizontal bar chart */}
        <div className="h-[320px] w-full text-foreground select-none">
          {productsLoading && !demoMode ? (
            <ChartSkeleton height={320} />
          ) : productChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Connecting to database…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={productChartData}
                layout="vertical"
                margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartTheme.grid} />
                <XAxis
                  type="number"
                  stroke={chartTheme.text}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke={chartTheme.text}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={130}
                />
                <Tooltip content={<ProductTooltip />} />
                <Bar
                  dataKey="revenue"
                  fill={chartTheme.productBar}
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                  label={{
                    position: 'right',
                    formatter: (val: any) => `${((Number(val) / (productChartData.reduce((s, p) => s + p.revenue, 0) || 1)) * 100).toFixed(1)}%`,
                    style: { fontSize: 9, fill: chartTheme.text },
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ranked table */}
        {topProducts.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Revenue Ranking — Top {topProducts.length}</h4>
            <div className="grid gap-1.5">
              {topProducts.map((p) => (
                <div key={p.rank} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <span className={`w-6 h-6 rounded-lg border text-[10px] font-bold flex items-center justify-center shrink-0 ${
                    p.rank <= 3 ? (RANK_COLORS[p.rank - 1] || '') : 'bg-muted/30 text-muted-foreground border-border/30'
                  }`}>{p.rank}</span>
                  <span className="flex-1 text-xs text-foreground truncate font-medium">{p.name}</span>
                  <span className="text-xs font-bold text-foreground shrink-0">{formatCurrency(p.revenue)}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 w-14 text-right">{formatNumber(p.quantity)} units</span>
                  <span className="text-[10px] font-semibold text-primary shrink-0 w-10 text-right">{p.share}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Discount Rate Sensitivity Analysis */}
      {!demoMode && discountError && (
        <OlapErrorBanner message={discountError} endpoint="/api/sales-by-discount-rate" />
      )}

      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Discount Rate Elasticity & Profit Sensitivity</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {demoMode 
                  ? 'Dual-axis mapping: discount % vs aggregate transaction volume vs profit margins (demo).'
                  : 'Live SQL: FactSales Joined with Products to compute margins per discount rate.'}
              </p>
            </div>
          </div>
          <DataSourceBadge 
            source={demoMode ? 'demo' : (isDiscountLive ? (olapDiscountSource === 'live' ? 'sql' : 'static') : 'static')} 
            loading={!demoMode && discountLoading} 
          />
        </div>

        <div className="h-[300px] w-full text-foreground select-none flex flex-col justify-center">
          {discountLoading && !demoMode ? (
            <ChartSkeleton height={300} />
          ) : discountChartData.length === 0 && !demoMode ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Failed to load live discount sensitivity data.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={discountChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-2 border-t border-border/40">
          <div className="p-4 bg-primary/[0.02] border border-primary/10 rounded-2xl space-y-2">
            <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5" />
              Top Product Performance Insight
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {productInsight}
            </p>
          </div>

          <div className="p-4 bg-amber-500/[0.02] border border-amber-500/10 rounded-2xl space-y-2">
            <h4 className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5" />
              Elasticity & Margin Sensitivity Insight
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {elasticityInsight}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 pt-1">
              <Info className="w-3 h-3" />
              <span>
                {demoMode 
                  ? 'Sensitivity chart uses pre-computed discount buckets from local dataset.' 
                  : `Discount data computed dynamically via ${olapDiscountSource === 'live' ? 'live SQL database' : 'local dataset'}.`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
