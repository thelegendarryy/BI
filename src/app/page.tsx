'use client';

import React, { lazy, Suspense } from 'react';
import { DashboardProvider, useDashboard } from './../context/DashboardContext';
import { AuthProvider } from './../context/AuthContext';
import { Sidebar } from './../components/Sidebar';
import { FiltersBar } from './../components/FiltersBar';
import { ExecutiveOverview } from './../components/ExecutiveOverview';
import { SalesPerformance } from './../components/SalesPerformance';
import { EmployeeLeaderboard } from './../components/EmployeeLeaderboard';
import { PromotionsDeepDive } from './../components/PromotionsDeepDive';
import { ChartSkeleton } from './../components/LoadingSkeleton';
import { CalendarRange, Sun, Moon } from 'lucide-react';

// Lazy-load the heavier new pages for better initial load performance
const ForecastingDashboard = lazy(() => import('./../components/ForecastingDashboard'));
const GeographicAnalysis = lazy(() => import('./../components/GeographicAnalysis'));
const CustomerAnalysis = lazy(() => import('./../components/CustomerAnalysis'));
const DataQuality = lazy(() => import('./../components/DataQuality'));

// Tabs where the FiltersBar should be shown (global filter only applies to core views)
const TABS_WITH_FILTERS = new Set(['executive', 'sales', 'leaderboard', 'promotions']);

// Page header metadata per tab
type HeaderInfo = { title: string; subtitle: string };
const HEADER_MAP: Record<string, HeaderInfo> = {
  executive: {
    title: 'Executive Performance Summary',
    subtitle: 'High-level metric cards, advanced KPI tracking, time intelligence, and quarterly revenue trends.',
  },
  sales: {
    title: 'Multi-dimensional Sales Analysis',
    subtitle: 'Slice and dice invoice datasets across brands, product categories, and customer segments.',
  },
  leaderboard: {
    title: 'Representative Rankings & Commissions',
    subtitle: 'Track salesperson standings, order counts, average contract sizes, and margin contributions.',
  },
  promotions: {
    title: 'Promotion Elasticity & Margin Deep-Dive',
    subtitle: 'Correlate marketing campaign types and discount rates with aggregate volume vs net returns.',
  },
  forecasting: {
    title: 'Sales Forecasting',
    subtitle: 'Linear regression + moving average model · 3-month ahead projection · confidence intervals',
  },
  geographic: {
    title: 'Geographic Revenue Analysis',
    subtitle: 'Country and city-level revenue breakdown with market share analysis.',
  },
  customers: {
    title: 'Customer Segmentation & Analysis',
    subtitle: 'Top accounts, revenue by customer type, and order value profiling.',
  },
  quality: {
    title: 'Data Warehouse Quality Monitor',
    subtitle: 'DW health checks, null audits, dimension sizes, ETL freshness, and SSAS cube status.',
  },
};

function PageLoader() {
  return (
    <div className="space-y-4">
      <ChartSkeleton height={200} />
      <div className="grid grid-cols-3 gap-4">
        <ChartSkeleton height={120} />
        <ChartSkeleton height={120} />
        <ChartSkeleton height={120} />
      </div>
    </div>
  );
}

function DashboardViewport() {
  const { activeTab, theme, toggleTheme, demoMode, setDemoMode } = useDashboard();
  const header = HEADER_MAP[activeTab] ?? { title: 'BI Intelligence Portal', subtitle: 'SalesCube OLAP Dashboard' };
  const showFilters = TABS_WITH_FILTERS.has(activeTab);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground transition-all duration-300">
      
      {/* Top Application Header Bar */}
      <header className="border-b border-border/50 bg-card px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{header.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{header.subtitle}</p>
        </div>
        
        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          {/* Demo Mode Toggle */}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none active:scale-95 shadow-sm ${
              demoMode 
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 border-amber-500/40' 
                : 'bg-secondary hover:bg-secondary/80 text-foreground border-border/80'
            }`}
            aria-label="Toggle Presentation Demo Mode"
          >
            <span className={`w-2 h-2 rounded-full ${demoMode ? 'bg-amber-500 animate-pulse' : 'bg-muted-foreground/60'}`} />
            <span>{demoMode ? 'Demo Mode Active' : 'Live Database Mode'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none active:scale-95 shadow-sm"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? (
              <><Moon className="w-3.5 h-3.5 text-indigo-500" /><span>Dark Mode</span></>
            ) : (
              <><Sun className="w-3.5 h-3.5 text-amber-400" /><span>Light Mode</span></>
            )}
          </button>

          {/* Warehouse Sync Badge */}
          <div className="flex items-center gap-2 text-xs bg-secondary/80 border border-border px-3.5 py-1.5 rounded-xl font-semibold text-muted-foreground select-none">
            <CalendarRange className="w-3.5 h-3.5 text-primary" />
            <span>Warehouse Sync: Active</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Global Filters (only on core analytical tabs) */}
        {showFilters && <FiltersBar />}

        {/* Tab Router */}
        <div className="transition-all duration-300">
          {/* Core tabs (always rendered, no lazy load needed) */}
          {activeTab === 'executive' && <ExecutiveOverview />}
          {activeTab === 'sales' && <SalesPerformance />}
          {activeTab === 'leaderboard' && <EmployeeLeaderboard />}
          {activeTab === 'promotions' && <PromotionsDeepDive />}

          {/* Advanced tabs (lazy loaded) */}
          {activeTab === 'forecasting' && (
            <Suspense fallback={<PageLoader />}>
              <ForecastingDashboard />
            </Suspense>
          )}
          {activeTab === 'geographic' && (
            <Suspense fallback={<PageLoader />}>
              <GeographicAnalysis />
            </Suspense>
          )}
          {activeTab === 'customers' && (
            <Suspense fallback={<PageLoader />}>
              <CustomerAnalysis />
            </Suspense>
          )}
          {activeTab === 'quality' && (
            <Suspense fallback={<PageLoader />}>
              <DataQuality />
            </Suspense>
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border/40 py-4 px-6 text-center text-[10px] text-muted-foreground bg-card/50 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="font-medium">SalesCube OLAP BI Dashboard © 2026 · SQL Server 2022 · SSAS Multidimensional</span>
        <span className="text-muted-foreground/60">v2.0.0 · 8 analytics modules · RBAC demo enabled</span>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <DashboardProvider>
        <div className="flex flex-col lg:flex-row min-h-screen bg-background">
          {/* Navigation Sidebar */}
          <Sidebar />
          
          {/* Core Dashboard Workspace */}
          <DashboardViewport />
        </div>
      </DashboardProvider>
    </AuthProvider>
  );
}
