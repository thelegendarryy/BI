'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
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
  const { brandData, categoryData, countryData, theme } = useDashboard();
  const isDark = theme === 'dark';

  const chartTheme = {
    brandBar: isDark ? '#818cf8' : '#4f46e5',      // glowing soft indigo vs solid indigo
    countryBar: isDark ? '#22d3ee' : '#06b6d4',    // glowing soft cyan vs solid cyan
    text: isDark ? '#94a3b8' : '#64748b',          // slate-400 vs slate-500
    grid: isDark ? '#1e293b' : '#e2e8f0',          // slate-800 vs slate-200
  };

  // Color palette for Categories Donut Chart (glowing soft colors in dark mode)
  const COLORS = isDark ? [
    '#818cf8', // glowing violet
    '#22d3ee', // glowing cyan
    '#f472b6', // glowing pink
    '#34d399', // glowing green/emerald
    '#fbbf24'  // glowing orange/amber
  ] : [
    '#4f46e5', // Indigo
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#10b981', // Green
    '#f59e0b'  // Orange/Amber
  ];

  // Helper to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

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
          {entry.payload.profit && (
            <div className="flex gap-4 items-center justify-between mt-1 text-emerald-500 font-medium">
              <span>Profit:</span>
              <span>{formatCurrency(entry.payload.profit)}</span>
            </div>
          )}
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
      {/* 2-Column Grid: Brand & Category */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Brand Slices Card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm lg:col-span-7 space-y-4">
          <div className="flex items-center gap-3 border-b border-border/40 pb-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Tags className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Sales by Brand</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Horizontal slice of revenue and net margin across brand dimensions.
              </p>
            </div>
          </div>

          <div className="h-[280px] w-full text-foreground select-none">
            {brandData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No data available for the active filters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={brandData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
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
                  <Bar 
                    dataKey="revenue" 
                    fill={chartTheme.brandBar} 
                    radius={[0, 6, 6, 0]} 
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Product Category Slices Card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm lg:col-span-5 space-y-4">
          <div className="flex items-center gap-3 border-b border-border/40 pb-3">
            <div className="p-2 bg-pink-500/10 text-pink-500 rounded-xl">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Sales by Product Category</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Proportion of revenue generated by each high-level category.
              </p>
            </div>
          </div>

          <div className="h-[280px] w-full text-foreground select-none relative flex items-center justify-center">
            {categoryData.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No data available for the active filters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
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

      {/* Row 2: Region/Country Performance */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-border/40 pb-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Globe2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Revenue by Region & Country</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comparative overview of net sales billing performance split by customer geography.
            </p>
          </div>
        </div>

        <div className="h-[300px] w-full text-foreground select-none">
          {countryData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              No data available for the active filters.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={countryData}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
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
                <Bar 
                  dataKey="revenue" 
                  fill={chartTheme.countryBar} 
                  radius={[6, 6, 0, 0]} 
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
