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
import { useSalesByBrand, useSalesByProduct } from '../hooks/useOlapData';
import { ChartSkeleton, OlapErrorBanner, DataSourceBadge } from './LoadingSkeleton';
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
  const { brandData: staticBrandData, categoryData: staticCategoryData, countryData, theme } = useDashboard();

  // Live OLAP data
  const { data: olapBrands, loading: brandsLoading, error: brandsError } = useSalesByBrand();
  const { data: olapProducts, loading: productsLoading, error: productsError } = useSalesByProduct();

  const isDark = theme === 'dark';
  const brandsLive = !brandsLoading && !brandsError && olapBrands !== null;
  const productsLive = !productsLoading && !productsError && olapProducts !== null;

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
            <DataSourceBadge isLive={brandsLive} loading={brandsLoading} />
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

      {/* Row 2: Region/Country Performance — static data */}
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
          <DataSourceBadge isLive={false} />
        </div>

        <div className="h-[300px] w-full text-foreground select-none">
          {countryData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              No data available for the active filters.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countryData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
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
