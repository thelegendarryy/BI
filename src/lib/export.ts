/**
 * Export Utilities for SalesCube BI Dashboard
 * Provides CSV download functionality for all dashboard tables.
 */

/**
 * Convert an array of objects into a downloadable CSV file.
 * Keys of the first object are used as column headers.
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): void {
  if (!data || data.length === 0) {
    console.warn('[Export] No data to export.');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Header row
  csvRows.push(headers.map(h => `"${h}"`).join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""'); // escape quotes
      return `"${str}"`;
    });
    csvRows.push(values.join(','));
  }

  downloadCSV(csvRows.join('\n'), filename);
}

/**
 * Export with explicit headers and row arrays.
 * Useful for chart data where you want custom column names.
 */
export function exportTableToCSV(
  headers: string[],
  rows: (string | number | null | undefined)[][],
  filename: string
): void {
  if (!rows || rows.length === 0) {
    console.warn('[Export] No rows to export.');
    return;
  }

  const csvRows: string[] = [];

  csvRows.push(headers.map(h => `"${h}"`).join(','));

  for (const row of rows) {
    const values = row.map(val => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    csvRows.push(values.join(','));
  }

  downloadCSV(csvRows.join('\n'), filename);
}

/**
 * Triggers a browser download of a CSV string.
 */
function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format a number as a currency string (e.g. $1,234.56)
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number as a compact string (e.g. 1.23M, 456K)
 */
export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

/**
 * Format a percentage (e.g. 0.1567 → "+15.67%")
 */
export function formatPercent(value: number, showSign = true): string {
  const pct = (value * 100).toFixed(1);
  if (showSign && value > 0) return `+${pct}%`;
  return `${pct}%`;
}

/**
 * Format a date string for display (e.g. "2025-06-04" → "Jun 2025")
 */
export function formatPeriod(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 2) return dateStr;
  const year = parts[0];
  const month = parseInt(parts[1], 10) - 1;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${monthNames[month] ?? '?'} ${year}`;
}
