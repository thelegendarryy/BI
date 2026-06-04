'use client';

/**
 * SalesPerformance.tsx — Multi-dimensional Sales Analysis view
 *
 * Data sources:
 * - Brand chart: /api/sales-by-brand (OLAP) → fallback to static brandData
 * - Product chart: /api/sales-by-product (OLAP) → fallback to static categoryData
 * - Country/Region chart: static only (SSAS endpoint not yet added for this view)
 */

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { useSalesByBrand, useSalesByProduct, useSalesByGeography } from '../hooks/useOlapData';
import { ChartSkeleton, OlapErrorBanner, DataSourceBadge } from './LoadingSkeleton';
import { exportToCSV } from '../lib/export';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Globe2, Tags, Box } from 'lucide-react';

export const SalesPerformance: React.FC = () => {
  // Static fallback data
  const { brandData: staticBrandData, categoryData: staticCategoryData, countryData, theme, filters, demoMode, setDemoMode } = useDashboard();

  // Live OLAP data
  const { data: olapBrands, loading: brandsLoading, error: brandsError } = useSalesByBrand(filters);
  const { data: olapProducts, loading: productsLoading, error: productsError } = useSalesByProduct(filters);
  const { data: geoData, loading: geoLoading, error: geoError } = useSalesByGeography('country', filters);

  const isDark = theme === 'dark';
  const brandsLive = !demoMode && !brandsLoading && !brandsError && olapBrands !== null;
  const productsLive = !demoMode && !productsLoading && !productsError && olapProducts !== null;
  const geoLive = !demoMode && !geoLoading && !geoError && geoData !== null;

  // If connection failed and NOT in demo mode, block silent fallback and prompt user to enable demo mode
  const connectionError = brandsError || productsError || geoError;
  if (connectionError && !demoMode) {
    return (
      <div className="space-y-6">
        <OlapErrorBanner message={connectionError} endpoint="/api/sales-by-brand" />
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center max-w-xl mx-auto space-y-4 my-8">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-foreground">Database Connection Offline</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The SalesCube BI workspace could not retrieve brand or product category metrics because the database server is offline. 
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

  const chartTheme = {
    brandBar: isDark ? '#818cf8' : '#4f46e5',
    countryBar: isDark ? '#22d3ee' : '#06b6d4',
    text: isDark ? '#94a3b8' : '#64748b',
    grid: isDark ? '#1e293b' : '#e2e8f0',
  };

  const COLORS = isDark
    ? ['#818cf8', '#22d3ee', '#f472b6', '#34d399', '#fbbf24']
    : ['#4f46e5', '#06b6d4', '#ec4899', '#10b981', '#f59e0b'];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  // Transform OLAP brand data to chart format
  const brandChartData = brandsLive
    ? olapBrands!.map((b) => ({ name: b.brand, revenue: Math.round(b.lineTotal), volume: b.quantity }))
    : staticBrandData;

  // Transform OLAP product data to category-style chart format (top 8 products)
  const productChartData = productsLive
    ? olapProducts!.slice(0, 8).map((p) => ({ name: p.name, value: Math.round(p.lineTotal) }))
    : staticCategoryData;

  // Transform OLAP country data to chart format
  const finalCountryData = geoLive
    ? geoData!.data.map((d) => ({ name: d.country, revenue: Math.round(d.lineTotal) }))
    : countryData;

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      return (
        <div className="bg-card border border-border p-3 rounded-xl shadow-lg text-xs">
          <p className="font-semibold text-foreground mb-1">{entry.payload.name || label}</p>
          <div className="flex gap-4 items-center justify-between">
            <span className="text-muted-foreground">Revenue:</span>
            <span className="font-bold text-primary">{formatCurrency(entry.value)}</span>
          </div>
          {entry.payload.volume && (
            <div className="flex gap-4 items-center justify-between mt-1 text-muted-foreground">
              <span>Qty Sold:</span>
              <span>{entry.payload.volume.toLocaleString()} units</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Error banners */}
      {brandsError && <OlapErrorBanner message={brandsError} endpoint="/api/sales-by-brand" />}
      {productsError && <OlapErrorBanner message={productsError} endpoint="/api/sales-by-product" />}
      {geoError && <OlapErrorBanner message={geoError} endpoint="/api/sales-by-geography" />}

      {/* 2-Column Grid: Brand & Product */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Brand Slices Card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <Tags className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Sales by Brand</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Horizontal slice of revenue across brand dimensions.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportToCSV(
                  brandChartData.map(b => ({ Brand: b.name, 'Revenue (USD)': b.revenue, 'Qty Sold': (b as { volume?: number }).volume ?? '' })),
                  'SalesCube_SalesByBrand'
                )}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                📥 Export
              </button>
              <DataSourceBadge isLive={brandsLive} loading={brandsLoading} />
            </div>
          </div>

          <div className="h-[280px] w-full text-foreground select-none">
            {brandsLoading ? (
              <ChartSkeleton height={280} />
            ) : brandChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No brand data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brandChartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartTheme.grid} />
                  <XAxis 
                    type="number"
                    stroke={chartTheme.text} 
                    fontSize={10}
                    tickFormatter={(val) => `$${val / 1000}k`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name" 
                    stroke={chartTheme.text} 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill={chartTheme.brandBar} radius={[0, 6, 6, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Products / Category Slices Card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 text-pink-500 rounded-xl">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {productsLive ? 'Top Products by Revenue' : 'Sales by Product Category'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {productsLive
                    ? 'Top 8 products ranked by [Measures].[Line Total].'
                    : 'Proportion of revenue by category.'}
                </p>
              </div>
            </div>
            <DataSourceBadge isLive={productsLive} loading={productsLoading} />
          </div>

          <div className="h-[280px] w-full text-foreground select-none relative flex items-center justify-center">
            {productsLoading ? (
              <ChartSkeleton height={280} />
            ) : productChartData.length === 0 ? (
              <div className="text-xs text-muted-foreground">No product data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {productChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', color: chartTheme.text }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Region/Country Performance — live data */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Revenue by Region & Country</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comparative overview of net sales split by customer geography.
              </p>
            </div>
          </div>
          <DataSourceBadge isLive={geoLive} loading={geoLoading} />
        </div>

        <div className="h-[300px] w-full text-foreground select-none">
          {geoLoading ? (
            <ChartSkeleton height={300} />
          ) : finalCountryData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              No data available for the active filters.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finalCountryData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
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
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill={chartTheme.countryBar} radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
