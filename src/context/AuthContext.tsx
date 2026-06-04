'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole, ROLE_CONFIG, RolePermissions } from '../types/dashboard';

interface AuthContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  permissions: RolePermissions;
  canAccess: (tabId: string) => boolean;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('admin');

  const permissions = ROLE_CONFIG[role];

  const canAccess = (tabId: string): boolean => {
    return permissions.tabs.includes(tabId);
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        setRole,
        permissions,
        canAccess,
        isDemoMode: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
