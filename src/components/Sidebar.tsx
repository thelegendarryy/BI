'use client';

import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { useAuth } from '../context/AuthContext';
import RoleSelector from './RoleSelector';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Percent, 
  Database,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  id: string;
  name: string;
  icon: React.ElementType;
  group: 'core' | 'advanced';
  badge?: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  // Core Analytics
  { id: 'executive', name: 'Executive Overview', icon: TrendingUp, group: 'core' },
  { id: 'sales', name: 'Sales Performance', icon: BarChart3, group: 'core' },
  { id: 'leaderboard', name: 'Rep Leaderboard', icon: Users, group: 'core' },
  { id: 'promotions', name: 'Promotions Deep-Dive', icon: Percent, group: 'core' },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useDashboard();
  const { canAccess } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const coreItems = ALL_NAV_ITEMS.filter(i => i.group === 'core' && canAccess(i.id));
  const advancedItems = ALL_NAV_ITEMS.filter(i => i.group === 'advanced' && canAccess(i.id));

  const NavButton = ({ item }: { item: NavItem }) => {
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
          flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer
          ${isActive 
            ? 'bg-sidebar-active text-sidebar-active-text shadow-sm shadow-primary/5 font-semibold' 
            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
          }
        `}
      >
        <Icon className={`
          w-4 h-4 transition-transform group-hover:scale-110 duration-200 shrink-0
          ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}
        `} />
        <span className="flex-1 text-left">{item.name}</span>
        {item.badge && !isActive && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const SidebarContent = () => (
    <aside className={`
      fixed inset-y-0 left-0 z-40 flex flex-col w-64 border-r border-sidebar-border bg-sidebar-bg text-foreground transition-all duration-300 ease-in-out
      lg:static lg:translate-x-0
      ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Logo Header */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-sidebar-border select-none">
        <div className="bg-primary p-2 rounded-xl text-primary-foreground shadow-lg shadow-primary/20">
          <Database className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold tracking-tight leading-none text-md">SalesCube OLAP</span>
          <span className="text-[10px] text-muted-foreground mt-1">SSAS Multidimensional v14.0</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {/* Core Analytics */}
        {coreItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground/60 px-3 uppercase tracking-wider mb-2">
              Core Analytics
            </p>
            {coreItems.map(item => <NavButton key={item.id} item={item} />)}
          </div>
        )}

        {/* Advanced Analytics */}
        {advancedItems.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground/60 px-3 uppercase tracking-wider mb-2">
              Advanced Analytics
            </p>
            {advancedItems.map(item => <NavButton key={item.id} item={item} />)}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-3">
        {/* Connection status */}
        <div className="p-3 bg-secondary/40 border border-border/40 rounded-xl flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-medium text-foreground">EntrepriseDW Connected</span>
            <span className="text-[9px] text-muted-foreground truncate">SQL Server 2022 · SSAS OLAP</span>
          </div>
        </div>

        {/* Role Selector */}
        <RoleSelector />
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="flex lg:hidden items-center justify-between px-6 py-4 border-b border-border bg-sidebar-bg text-foreground z-30 w-full">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg text-primary-foreground">
            <Database className="w-5 h-5" />
          </div>
          <span className="font-bold tracking-tight text-lg">SalesCube BI</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Toggle Menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      <SidebarContent />

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
        />
      )}
    </>
  );
};
