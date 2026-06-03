'use client';

/**
 * LoadingSkeleton.tsx — Reusable animated skeleton components
 *
 * Used throughout the dashboard while OLAP API data is loading.
 * Matches the visual structure of the actual data components so the
 * layout doesn't shift when data arrives.
 */

import React from 'react';

// ---------------------------------------------------------------------------
// Base pulse element
// ---------------------------------------------------------------------------
interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`animate-pulse rounded-lg bg-secondary/60 dark:bg-secondary/40 ${className}`}
    aria-hidden="true"
  />
);

// ---------------------------------------------------------------------------
// KPI Card Skeleton
// Matches the layout of the 4 KPI cards in ExecutiveOverview
// ---------------------------------------------------------------------------
export const KpiCardSkeleton: React.FC = () => (
  <div className="premium-card bg-card border border-border rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-36 mt-2" />
      </div>
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
    </div>
    <div className="flex items-center justify-between mt-4">
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-3 w-14" />
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Chart Skeleton
// Matches the rough shape of a recharts area/bar chart container
// ---------------------------------------------------------------------------
interface ChartSkeletonProps {
  height?: number;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ height = 280 }) => (
  <div
    className="w-full rounded-xl bg-secondary/30 flex flex-col justify-end gap-2 p-4"
    style={{ height }}
    aria-hidden="true"
  >
    {/* Fake Y-axis bars with varying heights */}
    <div className="flex items-end gap-3 h-full">
      {[70, 40, 85, 55, 95, 30, 65, 50, 75, 45].map((h, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t-md bg-secondary/60"
          style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
    {/* Fake X-axis line */}
    <Skeleton className="h-px w-full mt-2" />
  </div>
);

// ---------------------------------------------------------------------------
// Table Row Skeleton
// Matches the leaderboard table row layout
// ---------------------------------------------------------------------------
interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, cols = 6 }) => (
  <div className="space-y-0 divide-y divide-border/40" aria-hidden="true">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-5 py-4">
        <Skeleton className="w-5 h-5 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-2.5 w-20" />
        </div>
        {Array.from({ length: cols - 2 }).map((_, j) => (
          <Skeleton key={j} className="h-3 w-16" />
        ))}
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Error Banner
// Displayed when an OLAP API call fails
// ---------------------------------------------------------------------------
interface ErrorBannerProps {
  message: string;
  endpoint?: string;
}

export const OlapErrorBanner: React.FC<ErrorBannerProps> = ({ message, endpoint }) => (
  <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
    <div className="shrink-0 mt-0.5">
      <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 4.5a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5.5Zm.75 7a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
      </svg>
    </div>
    <div>
      <p className="font-semibold">OLAP data unavailable</p>
      <p className="mt-0.5 text-destructive/80">{message}</p>
      {endpoint && (
        <p className="mt-1 font-mono text-[10px] text-destructive/60">{endpoint}</p>
      )}
      <p className="mt-1 text-destructive/70">
        Displaying static fallback data. {
          (message.toLowerCase().includes('login failed') || 
           message.toLowerCase().includes('connect') || 
           message.toLowerCase().includes('connection') ||
           message.toLowerCase().includes('econnreset') ||
           message.toLowerCase().includes('login')) 
            ? 'Verify SQL Server connection settings and login credentials.' 
            : 'Check SSAS_CUBE linked server connection.'
        }
      </p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Inline data source badge (shows whether data is live or static fallback)
// ---------------------------------------------------------------------------
interface DataSourceBadgeProps {
  isLive: boolean;
  loading?: boolean;
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({ isLive, loading }) => {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] bg-secondary/80 font-normal px-2.5 py-0.5 rounded-full text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Querying SSAS…
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-normal px-2.5 py-0.5 rounded-full ${
      isLive
        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
      {isLive ? 'Live SSAS Data' : 'Static Fallback'}
    </span>
  );
};
