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
  Legend
} from 'recharts';
import { Trophy, Award, TrendingUp, Info } from 'lucide-react';

export const EmployeeLeaderboard: React.FC = () => {
  const { repLeaderboard, theme } = useDashboard();
  const isDark = theme === 'dark';

  const chartTheme = {
    revenueBar: isDark ? '#818cf8' : '#4f46e5',
    profitBar: isDark ? '#34d399' : '#10b981',
    text: isDark ? '#94a3b8' : '#64748b',
    grid: isDark ? '#1e293b' : '#e2e8f0',
  };

  // Helper to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Helper to get margin visual color
  const getMarginBadgeClass = (margin: number) => {
    if (margin > 45) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (margin > 35) return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
    return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  };

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border p-3.5 rounded-xl shadow-lg text-xs space-y-1.5 min-w-[150px]">
          <p className="font-bold text-foreground border-b border-border/60 pb-1 mb-1">{label}</p>
          <div className="flex justify-between gap-4 items-center">
            <span className="text-muted-foreground">Revenue:</span>
            <span className="font-semibold text-primary">{formatCurrency(payload[0].value)}</span>
          </div>
          <div className="flex justify-between gap-4 items-center">
            <span className="text-muted-foreground">Profit:</span>
            <span className="font-semibold text-emerald-500">{formatCurrency(payload[1].value)}</span>
          </div>
          <div className="flex justify-between gap-4 items-center pt-1 border-t border-border/40 mt-1">
            <span className="text-muted-foreground">Margin %:</span>
            <span className="font-bold text-foreground">{payload[0].payload.marginPercent}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
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
                Comparison of total generated revenue vs net product profit generated.
              </p>
            </div>
          </div>
          <div className="text-[10px] bg-secondary/80 font-normal px-2.5 py-0.5 rounded-full text-muted-foreground">
            OLAP Employee Dim
          </div>
        </div>

        <div className="h-[280px] w-full text-foreground select-none">
          {repLeaderboard.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
              No data available for the active filters.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={repLeaderboard}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
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
      </div>

      {/* Detailed Table Card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 bg-card">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Detailed Ranking Table</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive leaderboard sorting rep totals and margins in descending order.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {repLeaderboard.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground">
              No representative data records matched the selected query boundaries.
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
                  return (
                    <tr 
                      key={rep.id} 
                      className={`hover:bg-secondary/20 transition-colors ${
                        rank === 1 ? 'bg-primary/[0.02]' : ''
                      }`}
                    >
                      {/* Rank Indicator */}
                      <td className="py-3.5 px-5 text-center font-bold">
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-white rounded-full text-[10px] shadow-sm shadow-amber-500/30">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-zinc-400 text-white rounded-full text-[10px]">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-700 text-white rounded-full text-[10px]">
                            3
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{rank}</span>
                        )}
                      </td>

                      {/* Rep Details */}
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        <div className="flex flex-col">
                          <span className="text-foreground font-semibold text-xs">{rep.name}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">{rep.title} ({rep.code})</span>
                        </div>
                      </td>

                      {/* Revenue */}
                      <td className="py-3.5 px-4 text-right text-foreground font-bold">
                        {formatCurrency(rep.revenue)}
                      </td>

                      {/* Order Count */}
                      <td className="py-3.5 px-4 text-right text-foreground font-medium">
                        {rep.ordersCount.toLocaleString()}
                      </td>

                      {/* Volume */}
                      <td className="py-3.5 px-4 text-right text-muted-foreground">
                        {rep.volume.toLocaleString()}
                      </td>

                      {/* Avg Deal Size */}
                      <td className="py-3.5 px-4 text-right text-foreground">
                        {formatCurrency(rep.dealSize)}
                      </td>

                      {/* Profit Margin Visual */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-secondary rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div 
                              className={`h-full rounded-full ${
                                rep.marginPercent > 45 
                                  ? 'bg-emerald-500' 
                                  : rep.marginPercent > 35 
                                    ? 'bg-primary' 
                                    : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, rep.marginPercent * 1.5)}%` }}
                            />
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
          )}
        </div>

        {/* Legend / Tip */}
        <div className="p-3 bg-secondary/20 border-t border-border/40 text-[10px] text-muted-foreground flex items-center gap-1.5 px-5">
          <Info className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            Sorting and rankings represent real-time cube processing. Change years or brand filters in the top panel to see regional representative fluctuations.
          </span>
        </div>
      </div>
    </div>
  );
};
