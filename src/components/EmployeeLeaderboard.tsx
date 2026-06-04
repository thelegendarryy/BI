'use client';

/**
 * EmployeeLeaderboard.tsx — Sales Rep Rankings view
 *
 * Data source:
 * - Live OLAP: /api/sales-by-employee → [Employees].[Employee Name] × [Measures].[Line Total]
 * - Fallback: static repLeaderboard from DashboardContext
 */

import React, { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { useSalesByEmployee } from '../hooks/useOlapData';
import { ChartSkeleton, TableSkeleton, OlapErrorBanner, DataSourceBadge, EmptyState } from './LoadingSkeleton';
import { exportToCSV } from '../lib/export';
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
import { Trophy, Award, Info, TrendingUp } from 'lucide-react';

export const EmployeeLeaderboard: React.FC = () => {
  // Static fallback
  const { repLeaderboard, filters, theme, demoMode, setDemoMode } = useDashboard();

  // Live OLAP with dashboard filters
  const { data: olapEmployees, loading, error } = useSalesByEmployee(filters);
  const isLive = !demoMode && !loading && !error && olapEmployees !== null;

  // If connection failed and NOT in demo mode, block silent fallback and prompt user to enable demo mode
  if (error && !demoMode) {
    return (
      <div className="space-y-6">
        <OlapErrorBanner message={error} endpoint="/api/sales-by-employee" />
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center max-w-xl mx-auto space-y-4 my-8">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-foreground">Database Connection Offline</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The SalesCube BI standings could not retrieve representative sales metrics because the database server is offline. 
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

  // Transform OLAP data to chart-compatible shape, mapping the real profit field
  const olapChartData = useMemo(() => {
    return olapEmployees?.map((e) => {
      const revenue = Math.round(e.lineTotal);
      const profit = Math.round(e.profit || 0);
      return {
        name: e.employee,
        revenue,
        quantity: e.quantity,
        orderLines: e.orderLines,
        profit,
        marginPercent: revenue > 0 ? Math.round((profit / revenue) * 100) : 0
      };
    }) ?? [];
  }, [olapEmployees]);

  // Static chart data shape
  const staticChartData = useMemo(() => {
    return repLeaderboard.map((r) => ({
      name: r.name,
      revenue: r.revenue,
      profit: r.profit,
      marginPercent: r.marginPercent,
    }));
  }, [repLeaderboard]);

  const chartData: any[] = isLive ? olapChartData : staticChartData;

  // Standings Insights
  const standingsInsight = useMemo(() => {
    if (chartData.length === 0) return null;
    const topRep = chartData[0];
    const runnerUp = chartData[1];
    
    const leadAmount = topRep.revenue - (runnerUp ? runnerUp.revenue : 0);
    const leadPct = runnerUp && runnerUp.revenue > 0 
      ? Math.round((leadAmount / runnerUp.revenue) * 100) 
      : 0;

    const topProfit = topRep.profit || 0;
    const topMargin = topRep.marginPercent !== undefined 
      ? topRep.marginPercent 
      : (topRep.revenue > 0 ? Math.round((topProfit / topRep.revenue) * 100) : 0);

    if (isLive) {
      return `According to live SSAS/DW records, ${topRep.name} leads the sales standings with ${formatCurrency(topRep.revenue)} in revenue. ${runnerUp ? `${topRep.name} maintains a ${leadPct}% lead over the runner-up, ${runnerUp.name}.` : ''} ${topProfit > 0 ? `Net profitability for ${topRep.name} stands at ${formatCurrency(topProfit)} (average margin of ${topMargin}%), highlighting strong pricing discipline and high-margin product mix.` : ''}`;
    } else {
      return `According to the fallback snapshot, ${topRep.name} leads the standings with ${formatCurrency(topRep.revenue)} in revenue, followed by ${runnerUp ? runnerUp.name : 'N/A'}. ${topRep.name} also delivered ${formatCurrency(topProfit)} in net profit (margin of ${topMargin}%).`;
    }
  }, [chartData, isLive]);

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
            <span className="text-muted-foreground">{payload[0].name}:</span>
            <span className="font-semibold text-primary">{formatCurrency(payload[0].value)}</span>
          </div>
          {payload[1] && (
            <div className="flex justify-between gap-4 items-center">
              <span className="text-muted-foreground">{payload[1].name}:</span>
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
                Revenue and profitability per employee — from SSAS/DW Employees dimension.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const liveRows = chartData.map((e, index) => ({
                  Rank: index + 1,
                  Employee: e.name,
                  'Revenue (USD)': e.revenue,
                  'Profit (USD)': e.profit || 0,
                  'Margin %': e.marginPercent || 0,
                }));
                exportToCSV(liveRows, 'SalesCube_RepLeaderboard');
              }}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              📥 Export CSV
            </button>
            <DataSourceBadge isLive={isLive} loading={loading} />
          </div>
        </div>

        <div className="h-[280px] w-full text-foreground select-none">
          {loading ? (
            <ChartSkeleton height={280} />
          ) : chartData.length === 0 ? (
            <EmptyState title="No employee data" message="SSAS employee data unavailable. Check linked server or filter settings." />
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
                <Bar name="Net Profit" dataKey="profit" fill={chartTheme.profitBar} radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Dynamic Standings Insights Box */}
        {standingsInsight && (
          <div className="p-4 bg-primary/[0.02] border border-primary/10 rounded-2xl space-y-2 mt-4">
            <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              Dynamic Performance Insights
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {standingsInsight}
            </p>
          </div>
        )}
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
                  ? 'Live DW/SSAS data from [Employees].[Employee Name] × measures'
                  : 'Static fallback — comprehensive leaderboard from local dataset.'}
              </p>
            </div>
          </div>
          <DataSourceBadge isLive={isLive} loading={loading} />
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={6} cols={isLive ? 6 : 7} />
          ) : isLive ? (
            /* OLAP Table — columns available from /api/sales-by-employee */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-5 text-center w-[60px]">Rank</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                  <th className="py-3 px-4 text-right">Net Profit</th>
                  <th className="py-3 px-4 text-right">Units Sold</th>
                  <th className="py-3 px-4 text-right font-medium text-center">Avg Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {olapChartData.map((emp, index) => (
                  <tr 
                    key={emp.name}
                    className={`hover:bg-secondary/20 transition-colors ${index === 0 ? 'bg-primary/[0.02]' : ''}`}
                  >
                    <td className="py-3.5 px-5 text-center font-bold">
                      <RankBadge rank={index + 1} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {emp.name}
                    </td>
                    <td className="py-3.5 px-4 text-right text-foreground font-bold">
                      {formatCurrency(emp.revenue)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-500 font-bold">
                      {formatCurrency(emp.profit)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-muted-foreground">
                      {emp.quantity.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                        emp.marginPercent > 45 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        emp.marginPercent > 35 ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {emp.marginPercent}%
                      </span>
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
              ? 'Live SQL: SELECT e.EmployeeName, SUM(fs.LineTotal) AS lineTotal, SUM(fs.Quantity) AS quantity, COUNT(DISTINCT fs.SalesOrderID) AS orderCount, SUM(fs.LineTotal - fs.TaxAmount - (fs.Quantity * p.StandardCost)) AS profit FROM FactSales fs JOIN Employees e ON fs.SalesRepID = e.EmployeeID JOIN Products p ON fs.ProductID = p.ProductID GROUP BY e.EmployeeName'
              : 'Sorting and rankings from local static dataset. Connect SSAS_CUBE linked server for live data.'}
          </span>
        </div>
      </div>
    </div>
  );
};
