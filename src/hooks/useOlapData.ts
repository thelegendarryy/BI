'use client';

/**
 * useOlapData.ts — Client-side React hooks for fetching OLAP API data
 *
 * Rules:
 * - These hooks ONLY call Next.js API routes (/api/*). They never talk
 *   directly to SQL Server or SSAS — that happens exclusively on the server.
 * - Each hook follows the same pattern: { data, loading, error } state.
 * - Credentials are never exposed — they stay in .env.local on the server.
 *
 * Usage example:
 *   const { data: kpis, loading, error } = useKpis();
 */

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
} from '../types/dashboard';

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
        const res = await fetch(endpoint, {
          // Cache for 60 seconds before re-fetching (adjust as needed)
          next: { revalidate: 60 },
        } as RequestInit);

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

    // Cleanup: ignore response if component unmounts before fetch completes
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
 *
 * Returns: { totalSales, totalQuantity, totalTax, totalDiscount }
 * Powers: KPI cards in ExecutiveOverview
 */
export function useKpis(): OlapDataState<OlapKpiResponse> {
  return useOlapFetch<OlapKpiResponse>('/api/kpis');
}

/**
 * useSalesByProduct — fetches product-level revenue from /api/sales-by-product
 *
 * Returns: [{ name, lineTotal }]
 * Powers: Product bar chart in SalesPerformance
 */
export function useSalesByProduct(): OlapDataState<OlapProductSale[]> {
  return useOlapFetch<OlapProductSale[]>('/api/sales-by-product');
}

/**
 * useSalesByDate — fetches time-series sales from /api/sales-by-date
 *
 * Returns: [{ period, lineTotal }]
 * Powers: Sales trend area chart in ExecutiveOverview
 *
 * @param granularity 'year' | 'quarter' | 'month' (default 'year')
 */
export function useSalesByDate(
  granularity: 'year' | 'quarter' | 'month' = 'year'
): OlapDataState<OlapDateSale[]> {
  return useOlapFetch<OlapDateSale[]>(`/api/sales-by-date?granularity=${granularity}`);
}

/**
 * useSalesByCustomer — fetches top-20 customers from /api/sales-by-customer
 *
 * Returns: [{ customer, lineTotal }]
 * Powers: Customer breakdown panel
 */
export function useSalesByCustomer(): OlapDataState<OlapCustomerSale[]> {
  return useOlapFetch<OlapCustomerSale[]>('/api/sales-by-customer');
}

/**
 * useSalesByEmployee — fetches employee leaderboard from /api/sales-by-employee
 *
 * Returns: [{ employee, lineTotal, quantity, orderLines }]
 * Powers: EmployeeLeaderboard component
 */
export function useSalesByEmployee(): OlapDataState<OlapEmployeeSale[]> {
  return useOlapFetch<OlapEmployeeSale[]>('/api/sales-by-employee');
}

/**
 * useSalesByPromotion — fetches promotion slices from /api/sales-by-promotion
 *
 * Returns: [{ promotionType, lineTotal, discountAmount, quantity, avgDiscountPercent }]
 * Powers: PromotionsDeepDive component
 */
export function useSalesByPromotion(): OlapDataState<OlapPromotionSale[]> {
  return useOlapFetch<OlapPromotionSale[]>('/api/sales-by-promotion');
}

/**
 * useSalesByBrand — fetches brand revenue from /api/sales-by-brand
 *
 * Returns: [{ brand, lineTotal, quantity }]
 * Powers: Brand bar chart in SalesPerformance
 */
export function useSalesByBrand(): OlapDataState<OlapBrandSale[]> {
  return useOlapFetch<OlapBrandSale[]>('/api/sales-by-brand');
}
