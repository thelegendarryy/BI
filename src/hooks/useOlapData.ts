import { useState, useEffect } from 'react';
import type {
  OlapKpiResponse,
  OlapProductSale,
  OlapDateSale,
  OlapCustomerSale,
  OlapEmployeeSale,
  OlapPromotionSale,
  OlapBrandSale,
  OlapDataState,
  DashboardFilters,
  OlapGeographySale,
  OlapCustomerAnalysis
} from '../types/dashboard';

// Helper to construct query string from dashboard filters
function buildQueryString(filters?: DashboardFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.year && filters.year !== 'All') params.append('year', String(filters.year));
  if (filters.quarter && filters.quarter !== 'All') params.append('quarter', String(filters.quarter));
  if (filters.month && filters.month !== 'All') params.append('month', String(filters.month));
  if (filters.brand && filters.brand !== 'All') params.append('brand', String(filters.brand));
  if (filters.status && filters.status !== 'All') params.append('status', filters.status);
  const str = params.toString();
  return str ? `?${str}` : '';
}

// ---------------------------------------------------------------------------
// Generic fetcher factory — creates a hook for any API endpoint
// ---------------------------------------------------------------------------
function useOlapFetch<T>(endpoint: string): OlapDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(endpoint);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.details || body?.error || `HTTP ${res.status}: ${res.statusText}`
          );
        }

        const json = await res.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unknown fetch error';
          setError(msg);
          console.error(`[useOlapFetch] ${endpoint}:`, msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return { data, loading, error };
}

// ---------------------------------------------------------------------------
// Individual named hooks (one per API route)
// ---------------------------------------------------------------------------

/**
 * useKpis — fetches aggregate KPIs from /api/kpis
 */
export function useKpis(filters?: DashboardFilters): OlapDataState<OlapKpiResponse & { dataSource?: string }> {
  const query = buildQueryString(filters);
  return useOlapFetch<OlapKpiResponse & { dataSource?: string }>(`/api/kpis${query}`);
}

/**
 * useSalesByProduct — fetches product-level revenue from /api/sales-by-product
 */
export function useSalesByProduct(filters?: DashboardFilters): OlapDataState<OlapProductSale[]> {
  const query = buildQueryString(filters);
  return useOlapFetch<OlapProductSale[]>(`/api/sales-by-product${query}`);
}

/**
 * useSalesByDate — fetches time-series sales from /api/sales-by-date
 */
export function useSalesByDate(
  granularity: 'year' | 'quarter' | 'month' = 'year',
  filters?: DashboardFilters
): OlapDataState<OlapDateSale[]> {
  const query = buildQueryString(filters);
  const sep = query ? '&' : '?';
  return useOlapFetch<OlapDateSale[]>(`/api/sales-by-date${query}${sep}granularity=${granularity}`);
}

/**
 * useSalesByCustomer — fetches top-20 customers from /api/sales-by-customer
 */
export function useSalesByCustomer(filters?: DashboardFilters): OlapDataState<OlapCustomerSale[]> {
  const query = buildQueryString(filters);
  return useOlapFetch<OlapCustomerSale[]>(`/api/sales-by-customer${query}`);
}

/**
 * useSalesByEmployee — fetches employee leaderboard from /api/sales-by-employee
 */
export function useSalesByEmployee(filters?: DashboardFilters): OlapDataState<OlapEmployeeSale[]> {
  const query = buildQueryString(filters);
  return useOlapFetch<OlapEmployeeSale[]>(`/api/sales-by-employee${query}`);
}

/**
 * useSalesByPromotion — fetches promotion slices from /api/sales-by-promotion
 */
export function useSalesByPromotion(filters?: DashboardFilters): OlapDataState<OlapPromotionSale[]> {
  const query = buildQueryString(filters);
  return useOlapFetch<OlapPromotionSale[]>(`/api/sales-by-promotion${query}`);
}

/**
 * useSalesByBrand — fetches brand revenue from /api/sales-by-brand
 */
export function useSalesByBrand(filters?: DashboardFilters): OlapDataState<OlapBrandSale[]> {
  const query = buildQueryString(filters);
  return useOlapFetch<OlapBrandSale[]>(`/api/sales-by-brand${query}`);
}

/**
 * useSalesByGeography — fetches geography data from /api/sales-by-geography
 */
export function useSalesByGeography(
  groupBy: 'country' | 'city' = 'country',
  filters?: DashboardFilters
): OlapDataState<{ data: OlapGeographySale[]; dataSource: 'live' | 'static'; groupBy: string }> {
  const query = buildQueryString(filters);
  const sep = query ? '&' : '?';
  return useOlapFetch<{ data: OlapGeographySale[]; dataSource: 'live' | 'static'; groupBy: string }>(
    `/api/sales-by-geography${query}${sep}groupBy=${groupBy}`
  );
}

/**
 * useSalesByDiscountRate — fetches discount rate price elasticity data
 */
export function useSalesByDiscountRate(filters?: DashboardFilters): OlapDataState<{ data: any[]; dataSource: 'live' | 'static' }> {
  const query = buildQueryString(filters);
  return useOlapFetch<{ data: any[]; dataSource: 'live' | 'static' }>(`/api/sales-by-discount-rate${query}`);
}

/**
 * useCustomersAnalysis — fetches customers segments and top customer stats
 */
export function useCustomersAnalysis(filters?: DashboardFilters): OlapDataState<OlapCustomerAnalysis> {
  const query = buildQueryString(filters);
  return useOlapFetch<OlapCustomerAnalysis>(`/api/customers-analysis${query}`);
}

