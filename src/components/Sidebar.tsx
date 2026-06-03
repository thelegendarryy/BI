'use client';

import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Percent, 
  Database,
  Menu,
  X
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useDashboard();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'executive', name: 'Executive Overview', icon: TrendingUp },
    { id: 'sales', name: 'Sales Performance', icon: BarChart3 },
    { id: 'leaderboard', name: 'Rep Leaderboard', icon: Users },
    { id: 'promotions', name: 'Promotions Deep-Dive', icon: Percent },
  ];

  return (
    <>
      {/* Mobile Top Header Bar */}
      <header className="flex lg:hidden items-center justify-between px-6 py-4 border-b border-border bg-sidebar-bg text-foreground z-30 w-full">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
            <Database className="w-5 h-5" />
          </div>
          <span className="font-bold tracking-tight text-lg">SalesCube BI</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 flex flex-col w-64 border-r border-sidebar-border bg-sidebar-bg text-foreground transition-all duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Logo Header */}
        <div className="flex items-center gap-2.5 px-6 py-6 border-b border-sidebar-border select-none">
          <div className="bg-primary p-2 rounded-xl text-primary-foreground shadow-lg shadow-primary/20">
            <Database className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight leading-none text-md">SalesCube OLAP</span>
            <span className="text-xs text-muted-foreground mt-1">Multi-dimensional SSAS v14.0</span>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <div className="text-xs font-semibold text-muted-foreground/60 px-3 mb-2 uppercase tracking-wider">
            Analytics Views
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`
                  flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer
                  ${isActive 
                    ? 'bg-sidebar-active text-sidebar-active-text shadow-sm shadow-primary/5 font-semibold' 
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  }
                `}
              >
                <Icon className={`
                  w-4 h-4 transition-transform group-hover:scale-110 duration-200
                  ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}
                `} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Footer & Action Controls */}
        <div className="p-4 border-t border-sidebar-border space-y-4">
          {/* Active Connection Badge */}
          <div className="p-3 bg-secondary/40 border border-border/40 rounded-xl flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground">Local Cube Scaffolding</span>
              <span className="text-[10px] text-muted-foreground">Status: Connected (Mock)</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay Backdrop */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
        />
      )}
    </>
  );
};
