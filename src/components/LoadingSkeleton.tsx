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
  onRetry?: () => void;
  loading?: boolean;
}

export const OlapErrorBanner: React.FC<ErrorBannerProps> = ({ message, endpoint, onRetry, loading }) => (
  <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
    <div className="flex items-start gap-3">
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
          Verify SQL Server connection settings, login credentials, or SSAS_CUBE linked server connection.
        </p>
      </div>
    </div>
    {onRetry && (
      <div className="shrink-0 self-center">
        <RetryButton onRetry={onRetry} loading={loading} />
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Inline data source badge (shows whether data is live or static fallback)
// ---------------------------------------------------------------------------
interface DataSourceBadgeProps {
  isLive?: boolean;
  loading?: boolean;
  source?: 'ssas' | 'sql' | 'calculated' | 'empty' | 'demo' | 'static' | 'live';
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({ isLive, loading, source }) => {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] bg-secondary/80 font-normal px-2.5 py-0.5 rounded-full text-muted-foreground border border-border">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Querying Data Source…
      </span>
    );
  }

  let finalSource = source;
  if (!finalSource) {
    if (isLive === true) {
      finalSource = 'ssas';
    } else if (isLive === false) {
      finalSource = 'static';
    } else {
      finalSource = 'ssas';
    }
  }

  let badgeClass = '';
  let bulletClass = '';
  let text = '';

  switch (finalSource) {
    case 'ssas':
      badgeClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      bulletClass = 'bg-emerald-500';
      text = 'Live SSAS Data';
      break;
    case 'sql':
      badgeClass = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      bulletClass = 'bg-emerald-500';
      text = 'Live SQL Data';
      break;
    case 'calculated':
      badgeClass = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      bulletClass = 'bg-blue-500';
      text = 'Backend Calculated';
      break;
    case 'empty':
      badgeClass = 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20';
      bulletClass = 'bg-neutral-500';
      text = 'Empty / No Data';
      break;
    case 'demo':
      badgeClass = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      bulletClass = 'bg-amber-500';
      text = 'Static Demo Fallback';
      break;
    case 'static':
    default:
      badgeClass = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      bulletClass = 'bg-amber-400';
      text = 'Static Fallback';
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-normal px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${bulletClass}`} />
      {text}
    </span>
  );
};

// ---------------------------------------------------------------------------
// EmptyState
// Displayed when a query succeeds but returns no data rows
// ---------------------------------------------------------------------------
interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data available',
  message = 'There are no records matching the current filters.',
  icon,
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-3">
    <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground/60 mb-2">
      {icon ?? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
        </svg>
      )}
    </div>
    <p className="text-sm font-semibold text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground max-w-xs">{message}</p>
  </div>
);

// ---------------------------------------------------------------------------
// RetryButton
// ---------------------------------------------------------------------------
interface RetryButtonProps {
  onRetry: () => void;
  loading?: boolean;
}

export const RetryButton: React.FC<RetryButtonProps> = ({ onRetry, loading }) => (
  <button
    onClick={onRetry}
    disabled={loading}
    className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
  >
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
    >
      <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.75.75 0 0 1 1.357-.637A6.5 6.5 0 1 1 8 1.5v1A5 5 0 0 0 8 3Z" />
    </svg>
    {loading ? 'Retrying…' : 'Retry'}
  </button>
);
