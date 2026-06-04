'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ROLE_CONFIG } from '../types/dashboard';

const ROLE_OPTIONS: { value: UserRole; label: string; icon: string }[] = [
  { value: 'admin', label: 'Administrator', icon: '🔑' },
  { value: 'executive', label: 'Executive', icon: '💼' },
  { value: 'sales_manager', label: 'Sales Manager', icon: '📊' },
  { value: 'sales_rep', label: 'Sales Rep', icon: '🧑‍💼' },
];

export default function RoleSelector() {
  const { role, setRole, permissions } = useAuth();

  return (
    <div className="border-t border-sidebar-border pt-3 mt-2 space-y-2">
      {/* Demo mode badge */}
      <div className="flex items-center gap-1.5 px-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Demo RBAC Mode</span>
      </div>

      {/* Role selector */}
      <div className="px-2">
        <label className="text-[10px] text-muted-foreground block mb-1">Current role</label>
        <select
          id="role-selector"
          value={role}
          onChange={e => setRole(e.target.value as UserRole)}
          className="w-full text-xs bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
        >
          {ROLE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.icon} {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Permission summary */}
      <div className={`mx-2 rounded-lg px-3 py-2 text-[10px] ${ROLE_CONFIG[role].color} bg-current/5`}>
        <p className="font-semibold opacity-90">{permissions.description}</p>
        <p className="mt-1 opacity-60">
          Access: {permissions.tabs.length} tab{permissions.tabs.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
