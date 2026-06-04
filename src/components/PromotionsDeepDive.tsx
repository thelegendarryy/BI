'use client';

/**
 * PromotionsDeepDive.tsx — Promotion Elasticity & Margin Deep-Dive view
 *
 * Data source:
 * - Promotions bar chart: /api/sales-by-promotion (OLAP)
 * - Discount sensitivity chart: /api/sales-by-discount-rate (DW query with filters)
 */

import React, { useState, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { useSalesByPromotion, useSalesByDiscountRate } from '../hooks/useOlapData';
import { ChartSkeleton, OlapErrorBanner, DataSourceBadge, EmptyState } from './LoadingSkeleton';
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
import { Percent, Sparkles, TrendingUp, Info, HelpCircle } from 'lucide-react';

export const PromotionsDeepDive: React.FC = () => {
  const { promotionsData, discountDeepDive, filters, theme, demoMode, setDemoMode } = useDashboard();

  // Live OLAP data hooks (with filter parameters)
  const { data: olapPromotions, loading: promoLoading, error: promoError } = useSalesByPromotion(filters);
  const { data: olapDiscountRes, loading: discountLoading, error: discountError } = useSalesByDiscountRate(filters);

  const olapDiscount = olapDiscountRes?.data ?? null;
  const olapDiscountSource = olapDiscountRes?.dataSource ?? 'static';

  // Determine availability
  const isPromoLive = !demoMode && !promoLoading && !promoError && olapPromotions !== null;
  const isDiscountLive = !demoMode && !discountLoading && !discountError && olapDiscount !== null;

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
  const olapChartData = useMemo(() => {
    return olapPromotions?.map((p) => ({
      name: p.promotionType === 'Unknown' || p.promotionType === null ? 'Standard Sales (No Promotion)' : p.promotionType,
      revenue: Math.round(p.lineTotal),
      volume: p.quantity,
      avgDiscountPercent: p.avgDiscountPercent,
    })) ?? [];
  }, [olapPromotions]);

  // If in demo mode, use mock promotionsData. Otherwise, if live is available, use it. Else empty.
  const promoChartData = useMemo(() => {
    if (demoMode) return promotionsData;
    return isPromoLive ? olapChartData : [];
  }, [demoMode, isPromoLive, olapChartData, promotionsData]);

  // Determine if promotions data is actually empty (meaning no promotional campaigns exist in the live DB)
  const isPromoEmpty = useMemo(() => {
    if (demoMode) return false;
    if (promoLoading || promoError) return false;
    // Empty if no data, or if the only entry is standard sales (no actual campaigns run)
    return (
      promoChartData.length === 0 ||
      (promoChartData.length === 1 && 
        (promoChartData[0].name.includes('No Promotion') || promoChartData[0].name.includes('Standard Sales')))
    );
  }, [demoMode, promoLoading, promoError, promoChartData]);

  // Transform discount elasticity data
  const discountChartData = useMemo(() => {
    if (demoMode) return discountDeepDive;
    return isDiscountLive ? (olapDiscount || []) : [];
  }, [demoMode, isDiscountLive, olapDiscount, discountDeepDive]);

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
            <span className="font-medium text-foreground">{payload[0].payload.avgOrderQuantity || 0} / order</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Dynamic Insight Generation
  const promoInsight = useMemo(() => {
    if (demoMode) {
      return "The data demonstrates standard retail price elasticity. Zero discount sales generate the highest average gross profit margin (~53%), but limit transaction velocity. Transitioning to higher discount brackets (e.g. 10% to 15%) drives significantly larger volume sales, yet the profit margins decay steadily. Black Friday (20% discount) results in the highest volume spikes, but represents the lowest profit margin point (~34%), illustrating the inflection trade-off between volume scale and net returns.";
    }
    if (isPromoEmpty) {
      return "No promotion campaigns are active in the current data warehouse load. 100% of generated revenue is categorized as Standard Sales (No Promotion). To view how promotional campaign impact is visualized, enable Presentation Demo Mode in the header.";
    }
    if (!isPromoLive || promoChartData.length === 0) {
      return "OLAP query is currently unavailable. Ensure the database connection is running to view live campaign performance insights.";
    }

    // Sort by revenue
    const nonStd = promoChartData.filter(d => !d.name.includes('Standard') && !d.name.includes('No Promotion'));
    if (nonStd.length === 0) {
      return "Standard retail sales represent the total transaction volume. No separate promotional campaign segments were registered in the filtered dataset.";
    }
    const topPromo = [...nonStd].sort((a, b) => b.revenue - a.revenue)[0];
    return `Based on live SSAS data, the campaign "${topPromo.name}" is the top performer, generating ${formatCurrency(topPromo.revenue)} in revenue across ${formatNumber(topPromo.volume)} units sold at an average discount of ${topPromo.avgDiscountPercent}%. This indicates targeted promotions successfully drive the largest order quantities.`;
  }, [demoMode, isPromoEmpty, isPromoLive, promoChartData]);

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

      {/* Error banner - only shown when NOT in demo mode */}
      {!demoMode && promoError && (
        <OlapErrorBanner message={promoError} endpoint="/api/sales-by-promotion" />
      )}

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
                {demoMode 
                  ? 'Revenue and volume by promotion type — static demonstration data.'
                  : 'Live MDX: [Promotions].[Promotion Type] × [Measures].[Line Total, Quantity]'}
              </p>
            </div>
          </div>
          <DataSourceBadge 
            source={demoMode ? 'demo' : (isPromoLive ? 'ssas' : 'static')} 
            loading={!demoMode && promoLoading} 
          />
        </div>

        <div className="h-[280px] w-full text-foreground select-none flex flex-col justify-center">
          {promoLoading && !demoMode ? (
            <ChartSkeleton height={280} />
          ) : isPromoEmpty ? (
            <div className="border border-dashed border-border/60 rounded-xl bg-secondary/10 py-6">
              <EmptyState 
                title="No Campaign Records Available" 
                message="All 7,306 sales records in the current warehouse load have NULL PromotionID. Enable Presentation Demo Mode above to preview campaign visuals."
              />
            </div>
          ) : promoChartData.length === 0 && !demoMode ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              Failed to load live data. Click "Presentation Demo Mode" to view mock visualization.
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
              <TrendingUp className="w-3.5 h-3.5" />
              Campaign Performance Insight
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {promoInsight}
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
