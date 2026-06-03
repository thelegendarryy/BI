'use client';

/**
 * EmployeeLeaderboard.tsx — Sales Rep Rankings view
 *
 * Data source:
 * - Live OLAP: /api/sales-by-employee → [Employees].[Employee Name] × [Measures].[Line Total]
 * - Fallback: static repLeaderboard from DashboardContext
 */

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { useSalesByEmployee } from '../hooks/useOlapData';
import { ChartSkeleton, TableSkeleton, OlapErrorBanner, DataSourceBadge } from './LoadingSkeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Trophy, Award, Info } from 'lucide-react';

export const EmployeeLeaderboard: React.FC = () => {
  // Static fallback
  const { repLeaderboard, theme } = useDashboard();

  // Live OLAP
  const { data: olapEmployees, loading, error } = useSalesByEmployee();
  const isLive = !loading && !error && olapEmployees !== null;

  const isDark = theme === 'dark';
  const chartTheme = {
    revenueBar: isDark ? '#818cf8' : '#4f46e5',
    profitBar: isDark ? '#34d399' : '#10b981',
    text: isDark ? '#94a3b8' : '#64748b',
    grid: isDark ? '#1e293b' : '#e2e8f0',
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  // Transform OLAP data to chart-compatible shape
  const olapChartData = olapEmployees?.map((e) => ({
    name: e.employee,
    revenue: Math.round(e.lineTotal),
    quantity: e.quantity,
    orderLines: e.orderLines,
  })) ?? [];

  // Static chart data shape
  const staticChartData = repLeaderboard.map((r) => ({
    name: r.name,
    revenue: r.revenue,
    profit: r.profit,
    marginPercent: r.marginPercent,
  }));

  const chartData: any[] = isLive ? olapChartData : staticChartData;


  // Rank badge
  const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    if (rank === 1) return <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-white rounded-full text-[10px] shadow-sm shadow-amber-500/30">1</span>;
    if (rank === 2) return <span className="inline-flex items-center justify-center w-5 h-5 bg-zinc-400 text-white rounded-full text-[10px]">2</span>;
    if (rank === 3) return <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-700 text-white rounded-full text-[10px]">3</span>;
    return <span className="text-muted-foreground text-xs">{rank}</span>;
  };

  // Custom chart tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-lg text-xs space-y-1.5 min-w-[150px]">
          <p className="font-bold text-foreground border-b border-border/60 pb-1 mb-1">{label}</p>
          <div className="flex justify-between gap-4 items-center">
            <span className="text-muted-foreground">Revenue:</span>
            <span className="font-semibold text-primary">{formatCurrency(payload[0].value)}</span>
          </div>
          {payload[1] && (
            <div className="flex justify-between gap-4 items-center">
              <span className="text-muted-foreground">Profit:</span>
              <span className="font-semibold text-emerald-500">{formatCurrency(payload[1].value)}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && <OlapErrorBanner message={error} endpoint="/api/sales-by-employee" />}

      {/* Visual Rank Bar Chart */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Trophy className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Sales Rep Performance Standings</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Revenue generated per employee — from SSAS Employees dimension.
              </p>
            </div>
          </div>
          <DataSourceBadge isLive={isLive} loading={loading} />
        </div>

        <div className="h-[280px] w-full text-foreground select-none">
          {loading ? (
            <ChartSkeleton height={280} />
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              No employee data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                <XAxis 
                  dataKey="name" 
                  stroke={chartTheme.text} 
                  fontSize={10}
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
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: chartTheme.text }}
                />
                <Bar name="Total Revenue" dataKey="revenue" fill={chartTheme.revenueBar} radius={[4, 4, 0, 0]} barSize={18} />
                {/* Show profit bar only when static data (which includes profit calc) */}
                {!isLive && (
                  <Bar name="Net Profit" dataKey="profit" fill={chartTheme.profitBar} radius={[4, 4, 0, 0]} barSize={18} />
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Detailed Table Card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Detailed Ranking Table</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLive
                  ? 'Live MDX data from [Employees].[Employee Name] × [Measures].[Line Total]'
                  : 'Static fallback — comprehensive leaderboard from local dataset.'}
              </p>
            </div>
          </div>
          <DataSourceBadge isLive={isLive} loading={loading} />
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={6} cols={isLive ? 4 : 6} />
          ) : isLive ? (
            /* OLAP Table — columns available from /api/sales-by-employee */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-5 text-center w-[60px]">Rank</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                  <th className="py-3 px-4 text-right">Units Sold</th>
                  <th className="py-3 px-4 text-right">Order Lines</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {olapEmployees!.map((emp, index) => (
                  <tr 
                    key={emp.employee}
                    className={`hover:bg-secondary/20 transition-colors ${index === 0 ? 'bg-primary/[0.02]' : ''}`}
                  >
                    <td className="py-3.5 px-5 text-center font-bold">
                      <RankBadge rank={index + 1} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {emp.employee}
                    </td>
                    <td className="py-3.5 px-4 text-right text-foreground font-bold">
                      {formatCurrency(emp.lineTotal)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-muted-foreground">
                      {emp.quantity.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-muted-foreground">
                      {emp.orderLines.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* Static Fallback Table — full columns */
            repLeaderboard.length === 0 ? (
              <div className="p-10 text-center text-xs text-muted-foreground">
                No representative data matched the selected filters.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-secondary/30 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-5 text-center w-[60px]">Rank</th>
                    <th className="py-3 px-4">Sales Representative</th>
                    <th className="py-3 px-4 text-right">Total Revenue</th>
                    <th className="py-3 px-4 text-right">Orders Count</th>
                    <th className="py-3 px-4 text-right">Units Sold</th>
                    <th className="py-3 px-4 text-right">Avg Deal Size</th>
                    <th className="py-3 px-5 text-center">Avg Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {repLeaderboard.map((rep, index) => {
                    const rank = index + 1;
                    const getMarginBadgeClass = (margin: number) => {
                      if (margin > 45) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
                      if (margin > 35) return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
                      return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
                    };
                    return (
                      <tr key={rep.id} className={`hover:bg-secondary/20 transition-colors ${rank === 1 ? 'bg-primary/[0.02]' : ''}`}>
                        <td className="py-3.5 px-5 text-center font-bold"><RankBadge rank={rank} /></td>
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          <div className="flex flex-col">
                            <span className="text-foreground font-semibold text-xs">{rep.name}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">{rep.title} ({rep.code})</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right text-foreground font-bold">{formatCurrency(rep.revenue)}</td>
                        <td className="py-3.5 px-4 text-right text-foreground font-medium">{rep.ordersCount.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right text-muted-foreground">{rep.volume.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right text-foreground">{formatCurrency(rep.dealSize)}</td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-secondary rounded-full h-1.5 overflow-hidden hidden sm:block">
                              <div className={`h-full rounded-full ${rep.marginPercent > 45 ? 'bg-emerald-500' : rep.marginPercent > 35 ? 'bg-primary' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, rep.marginPercent * 1.5)}%` }} />
                            </div>
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${getMarginBadgeClass(rep.marginPercent)}`}>
                              {rep.marginPercent}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}
        </div>

        <div className="p-3 bg-secondary/20 border-t border-border/40 text-[10px] text-muted-foreground flex items-center gap-1.5 px-5">
          <Info className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            {isLive
              ? 'Live MDX: SELECT [Measures].[Line Total], [Quantity], [Fact Sales Nombre] ON COLUMNS, NON EMPTY ORDER([Employees].[Employee Name].Members, [Measures].[Line Total], BDESC) ON ROWS FROM [Entreprise DW]'
              : 'Sorting and rankings from local static dataset. Connect SSAS_CUBE linked server for live data.'}
          </span>
        </div>
      </div>
    </div>
  );
};
