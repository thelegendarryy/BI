import { NextRequest } from 'next/server';

export interface ParsedFilters {
  year: number | 'All';
  quarter: number | 'All';
  month: number | 'All';
  brand: number | 'All';
  status: string | 'All';
}

/**
 * Parses dashboard filter query parameters from a NextRequest.
 */
export function parseFilters(req: NextRequest): ParsedFilters {
  const { searchParams } = new URL(req.url);
  const yearRaw = searchParams.get('year');
  const quarterRaw = searchParams.get('quarter');
  const monthRaw = searchParams.get('month');
  const brandRaw = searchParams.get('brand');
  const statusRaw = searchParams.get('status');

  return {
    year: yearRaw && yearRaw !== 'All' ? parseInt(yearRaw, 10) : 'All',
    quarter: quarterRaw && quarterRaw !== 'All' ? parseInt(quarterRaw, 10) : 'All',
    month: monthRaw && monthRaw !== 'All' ? parseInt(monthRaw, 10) : 'All',
    brand: brandRaw && brandRaw !== 'All' ? parseInt(brandRaw, 10) : 'All',
    status: statusRaw && statusRaw !== 'All' ? statusRaw : 'All'
  };
}

/**
 * Builds a SQL WHERE clause from parsed filters.
 * Assumes 'fs' is the alias for FactSales and 'dd' is the alias for DimDate.
 */
export function buildSqlWhere(filters: ParsedFilters, tableAlias = 'fs', dateAlias = 'dd'): string {
  const clauses: string[] = [];

  if (filters.year !== 'All') {
    clauses.push(`${dateAlias}.YearNumber = ${filters.year}`);
  }
  if (filters.quarter !== 'All') {
    clauses.push(`${dateAlias}.QuarterNumber = ${filters.quarter}`);
  }
  if (filters.month !== 'All') {
    clauses.push(`${dateAlias}.MonthNumber = ${filters.month}`);
  }
  if (filters.brand !== 'All') {
    clauses.push(`${tableAlias}.BrandID = ${filters.brand}`);
  }
  if (filters.status !== 'All') {
    clauses.push(`${tableAlias}.OrderStatus = '${filters.status.replace(/'/g, "''")}'`);
  }

  return clauses.length > 0 ? clauses.join(' AND ') : '1=1';
}

/**
 * Converts a T-SQL query to also join DimDate if filtering is needed on dates.
 * Often, queries don't join DimDate by default but need it for date filters.
 */
export function getDateJoinIfNeeded(filters: ParsedFilters, tableAlias = 'fs', dateAlias = 'dd'): string {
  if (filters.year !== 'All' || filters.quarter !== 'All' || filters.month !== 'All') {
    return `INNER JOIN DimDate ${dateAlias} ON ${tableAlias}.DateKey = ${dateAlias}.DateKey`;
  }
  return '';
}
