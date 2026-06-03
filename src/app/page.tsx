'use client';

import React from 'react';
import { DashboardProvider, useDashboard } from './../context/DashboardContext';
import { Sidebar } from './../components/Sidebar';
import { FiltersBar } from './../components/FiltersBar';
import { ExecutiveOverview } from './../components/ExecutiveOverview';
import { SalesPerformance } from './../components/SalesPerformance';
import { EmployeeLeaderboard } from './../components/EmployeeLeaderboard';
import { PromotionsDeepDive } from './../components/PromotionsDeepDive';
import { CalendarRange, Info, Sun, Moon } from 'lucide-react';

function DashboardViewport() {
  const { activeTab, theme, toggleTheme } = useDashboard();

  // Active view header title
  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'executive':
        return {
          title: 'Executive Performance Summary',
          subtitle: 'High-level metric cards, dynamic targets, and overall quarterly sales revenue trends.'
        };
      case 'sales':
        return {
          title: 'Multi-dimensional Sales Analysis',
          subtitle: 'Slice and dice invoice datasets across brands, product categories, and buyer geographies.'
        };
      case 'leaderboard':
        return {
          title: 'Representative Rankings & Commissions',
          subtitle: 'Track salesperson standings, order counts, average contract sizes, and margin contributions.'
        };
      case 'promotions':
        return {
          title: 'Promotion Elasticity & Margin Deep-Dive',
          subtitle: 'Correlate marketing campaign types and discount rates with aggregate volume vs net returns.'
        };
      default:
        return {
          title: 'BI Intelligence Portal',
          subtitle: 'Sales data warehouse dashboard.'
        };
    }
  };

  const header = getHeaderInfo();

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground transition-all duration-300">
      
      {/* Top Application Header Bar */}
      <header className="border-b border-border/50 bg-card px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{header.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">{header.subtitle}</p>
        </div>
        
        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none active:scale-95 shadow-sm"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light Mode</span>
              </>
            )}
          </button>

          {/* Real-time Server Sync Badge */}
          <div className="flex items-center gap-2 text-xs bg-secondary/80 border border-border px-3.5 py-1.5 rounded-xl font-semibold text-muted-foreground select-none">
            <CalendarRange className="w-3.5 h-3.5 text-primary" />
            <span>Warehouse Sync: Active</span>
          </div>
        </div>
      </header>

      {/* Main Viewport Content Area */}
      <main className="flex-1 p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Dynamic Filter Panel */}
        <FiltersBar />

        {/* Tab viewport renderer */}
        <div className="transition-all duration-300">
          {activeTab === 'executive' && <ExecutiveOverview />}
          {activeTab === 'sales' && <SalesPerformance />}
          {activeTab === 'leaderboard' && <EmployeeLeaderboard />}
          {activeTab === 'promotions' && <PromotionsDeepDive />}
        </div>
      </main>
      
      {/* Footer Branding */}
      <footer className="border-t border-border/40 py-4 px-6 text-center text-[10px] text-muted-foreground bg-card/50 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="font-medium">Vertex Business Intelligence Studio © 2026. Designed for SSAS cube analysis.</span>
        <span className="text-muted-foreground/60">Version: 1.4.2-tabular-cache-active</span>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <DashboardProvider>
      <div className="flex flex-col lg:flex-row min-h-screen bg-background">
        {/* Navigation Sidebar */}
        <Sidebar />
        
        {/* Core Dashboard Workspace */}
        <DashboardViewport />
      </div>
    </DashboardProvider>
  );
}
