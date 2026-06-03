'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Filter, RotateCcw, Database } from 'lucide-react';

export const FiltersBar: React.FC = () => {
  const { 
    filters, 
    setFilters, 
    availableYears, 
    availableBrands, 
    availableStatuses,
    filteredSales
  } = useDashboard();

  const handleFilterChange = (key: keyof typeof filters, value: string | number) => {
    setFilters(prev => {
      const updated = { ...prev, [key]: value };
      
      // If year is set to 'All', reset Quarter as well to prevent logic conflicts,
      // though quarters are year-independent in raw values, it makes sense visually.
      if (key === 'year' && value === 'All') {
        updated.quarter = 'All';
      }
      return updated;
    });
  };

  const resetFilters = () => {
    setFilters({
      year: 'All',
      quarter: 'All',
      brand: 'All',
      status: 'All'
    });
  };

  const isFiltered = filters.year !== 'All' || filters.quarter !== 'All' || filters.brand !== 'All' || filters.status !== 'All';

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Title & Filter Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl text-primary">
          <Filter className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold leading-none text-foreground">Global Filters</h3>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Database className="w-3 h-3 text-muted-foreground" />
            FactSales Cube ({filteredSales.length.toLocaleString()} rows selected)
          </p>
        </div>
      </div>

      {/* Select Controls Grid */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Year Select */}
        <div className="flex flex-col gap-1.5 min-w-[100px]">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Year</span>
          <select
            value={filters.year}
            onChange={(e) => {
              const val = e.target.value;
              handleFilterChange('year', val === 'All' ? 'All' : parseInt(val, 10));
            }}
            className="w-full bg-secondary/50 hover:bg-secondary text-foreground text-xs font-medium border border-border/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-xl p-2.5 transition-colors cursor-pointer outline-none"
          >
            <option value="All">All Years</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Quarter Select */}
        <div className="flex flex-col gap-1.5 min-w-[100px]">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Quarter</span>
          <select
            value={filters.quarter}
            onChange={(e) => {
              const val = e.target.value;
              handleFilterChange('quarter', val === 'All' ? 'All' : parseInt(val, 10));
            }}
            className="w-full bg-secondary/50 hover:bg-secondary text-foreground text-xs font-medium border border-border/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-xl p-2.5 transition-colors cursor-pointer outline-none disabled:opacity-50"
            disabled={filters.year === 'All'}
          >
            <option value="All">All Quarters</option>
            <option value="1">Q1 (Jan-Mar)</option>
            <option value="2">Q2 (Apr-Jun)</option>
            <option value="3">Q3 (Jul-Sep)</option>
            <option value="4">Q4 (Oct-Dec)</option>
          </select>
        </div>

        {/* Brand Select */}
        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Brand</span>
          <select
            value={filters.brand}
            onChange={(e) => {
              const val = e.target.value;
              handleFilterChange('brand', val === 'All' ? 'All' : parseInt(val, 10));
            }}
            className="w-full bg-secondary/50 hover:bg-secondary text-foreground text-xs font-medium border border-border/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-xl p-2.5 transition-colors cursor-pointer outline-none"
          >
            <option value="All">All Brands</option>
            {availableBrands.map(brand => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
        </div>

        {/* Order Status Select */}
        <div className="flex flex-col gap-1.5 min-w-[120px]">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Order Status</span>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full bg-secondary/50 hover:bg-secondary text-foreground text-xs font-medium border border-border/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-xl p-2.5 transition-colors cursor-pointer outline-none"
          >
            <option value="All">All Statuses</option>
            {availableStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {/* Reset Button */}
        {isFiltered && (
          <button
            onClick={resetFilters}
            className="mt-5 flex items-center justify-center gap-1.5 px-3 py-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground font-semibold rounded-xl text-xs transition-colors cursor-pointer border border-destructive/20"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
};
