'use client';

import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  DollarSign, 
  ShoppingBag, 
  Tag, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  Info
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

export const ExecutiveOverview: React.FC = () => {
  const { kpis, kpiTrends, timeSeriesData, filters, theme } = useDashboard();
  const [chartMetric, setChartMetric] = useState<'financial' | 'volume'>('financial');
  const isDark = theme === 'dark';

  const colors = {
    revenue: isDark ? '#818cf8' : '#4f46e5', // glowing soft indigo vs solid indigo
    profit: isDark ? '#34d399' : '#10b981',  // glowing soft emerald vs solid emerald
    volume: isDark ? '#60a5fa' : '#2563eb',  // glowing soft blue vs solid blue
    text: isDark ? '#94a3b8' : '#64748b',    // slate-400 vs slate-500 text
    grid: isDark ? '#1e293b' : '#e2e8f0',    // slate-800 vs slate-200 lines
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format number
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Helper to render growth indicator badge
  const renderTrendBadge = (growth: number) => {
    const isPositive = growth >= 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
      }`}>
        {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
        {formatPercent(growth)} YoY
      </span>
    );
  };

  // Custom tooltips for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-lg text-xs space-y-1.5 min-w-[150px]">
          <p className="font-semibold text-foreground border-b border-border/60 pb-1 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-4 items-center">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{entry.name}:</span>
              </span>
              <span className="font-semibold text-foreground">
                {entry.name === 'Volume' ? formatNumber(entry.value) : formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 4 Core KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="premium-card bg-card border border-border rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Revenue</span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {formatCurrency(kpis.totalRevenue)}
              </h2>
            </div>
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            {renderTrendBadge(kpiTrends.revenueGrowth)}
            <span className="text-[10px] text-muted-foreground/60">Target: $1.2M</span>
          </div>
        </div>

        {/* Total Units Sold */}
        <div className="premium-card bg-card border border-border rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Units Sold</span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {formatNumber(kpis.totalUnits)}
              </h2>
            </div>
            <div className="p-2.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            {renderTrendBadge(kpiTrends.unitsGrowth)}
            <span className="text-[10px] text-muted-foreground/60">Net Quantity</span>
          </div>
        </div>

        {/* Average Discount Amount */}
        <div className="premium-card bg-card border border-border rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average Discount</span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {formatCurrency(kpis.avgDiscountAmount)}
              </h2>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-500">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <span className="text-xs font-semibold text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
              Avg Deal: {formatNumber(kpis.totalUnits > 0 ? kpis.totalRevenue / kpis.orderCount : 0)}
            </span>
            <span className="text-[10px] text-muted-foreground/60">Per Item</span>
          </div>
        </div>

        {/* Active Customer Count */}
        <div className="premium-card bg-card border border-border rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Customers</span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {formatNumber(kpis.activeCustomers)}
              </h2>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            {renderTrendBadge(kpiTrends.customersGrowth)}
            <span className="text-[10px] text-muted-foreground/60">Corporate/Retail</span>
          </div>
        </div>
      </div>

      {/* Time Series Charts Card */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/40">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              Sales Trend Analysis
              <span className="text-[10px] bg-secondary/80 font-normal px-2.5 py-0.5 rounded-full text-muted-foreground">
                {filters.year === 'All' ? 'Quarterly Slices' : `Monthly Slices (${filters.year})`}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Time-series view showing performance trajectory of dimensions inside the SSAS cube.
            </p>
          </div>
          {/* Chart Metric Toggle */}
          <div className="flex bg-secondary p-1 rounded-xl w-fit border border-border/40">
            <button
              onClick={() => setChartMetric('financial')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-foreground data-[active=false]:text-muted-foreground data-[active=false]:hover:text-foreground data-[active=true]:bg-card data-[active=true]:shadow-sm"
              data-active={chartMetric === 'financial'}
            >
              Revenue vs Profit
            </button>
            <button
              onClick={() => setChartMetric('volume')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-foreground data-[active=false]:text-muted-foreground data-[active=false]:hover:text-foreground data-[active=true]:bg-card data-[active=true]:shadow-sm"
              data-active={chartMetric === 'volume'}
            >
              Units Sold
            </button>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-[350px] w-full text-foreground select-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={timeSeriesData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.revenue} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={colors.revenue} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.profit} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={colors.profit} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.volume} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={colors.volume} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
              <XAxis 
                dataKey="name" 
                stroke={colors.text} 
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke={colors.text} 
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => chartMetric === 'financial' ? `$${value / 1000}k` : value}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', paddingBottom: '15px', color: colors.text }}
              />
              {chartMetric === 'financial' ? (
                <>
                  <Area 
                    name="Revenue"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke={colors.revenue} 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                  <Area 
                    name="Net Profit"
                    type="monotone" 
                    dataKey="profit" 
                    stroke={colors.profit} 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                  />
                </>
              ) : (
                <Area 
                  name="Volume"
                  type="monotone" 
                  dataKey="volume" 
                  stroke={colors.volume} 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorVolume)" 
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Cube Metadata Context Hint */}
        <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-xl border border-border/30 text-xs text-muted-foreground mt-2">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>
            Financial profit is calculated as <b>Net Revenue (LineTotal - Tax) - StandardCost</b>. Discount percentages represent direct sales invoice reductions from standard List Prices inside the SSAS tabular schemas.
          </span>
        </div>
      </div>
    </div>
  );
};
