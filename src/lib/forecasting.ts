/**
 * Forecasting Math Library for SalesCube BI Dashboard
 * Implements: Moving Average, Weighted Moving Average, Linear Regression
 */

export interface TimeSeriesPoint {
  period: string;    // e.g. "2025-01", "2025 Q1"
  value: number;
}

export interface ForecastResult {
  period: string;
  actual: number | null;
  forecast: number | null;
  movingAvg: number | null;
  isForecasted: boolean;
}

export interface ForecastSummary {
  data: ForecastResult[];
  nextMonthForecast: number;
  nextQuarterForecast: number;
  rSquared: number;
  method: string;
  confidence: number;
}

/**
 * Calculate a simple moving average for a time series.
 * @param series - Array of {period, value} sorted chronologically
 * @param window - Number of periods to average
 */
export function movingAverage(series: TimeSeriesPoint[], window: number): (number | null)[] {
  return series.map((_, i) => {
    if (i < window - 1) return null;
    const slice = series.slice(i - window + 1, i + 1);
    const avg = slice.reduce((sum, p) => sum + p.value, 0) / window;
    return Math.round(avg * 100) / 100;
  });
}

/**
 * Compute a weighted moving average (more recent periods weighted higher).
 */
export function weightedMovingAverage(series: TimeSeriesPoint[], window: number): (number | null)[] {
  const weights: number[] = [];
  for (let i = 1; i <= window; i++) weights.push(i);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  return series.map((_, i) => {
    if (i < window - 1) return null;
    const slice = series.slice(i - window + 1, i + 1);
    const weighted = slice.reduce((sum, p, j) => sum + p.value * weights[j], 0) / weightSum;
    return Math.round(weighted * 100) / 100;
  });
}

/**
 * Linear regression on a numeric series.
 * Returns slope, intercept, and R² (coefficient of determination).
 */
export function linearRegression(values: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
  predict: (x: number) => number;
} {
  const n = values.length;
  if (n < 2) {
    return { slope: 0, intercept: values[0] ?? 0, rSquared: 0, predict: () => values[0] ?? 0 };
  }

  const xs = values.map((_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  const ssxx = xs.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0);
  const ssxy = xs.reduce((sum, x, i) => sum + (x - xMean) * (values[i] - yMean), 0);
  const ssyy = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);

  const slope = ssxx === 0 ? 0 : ssxy / ssxx;
  const intercept = yMean - slope * xMean;
  const rSquared = ssyy === 0 ? 1 : Math.pow(ssxy, 2) / (ssxx * ssyy);

  return {
    slope,
    intercept,
    rSquared: Math.round(rSquared * 10000) / 10000,
    predict: (x: number) => slope * x + intercept,
  };
}

/**
 * Generate the next N period labels (monthly) from the last known period.
 * @param lastPeriod - e.g. "2025-11"
 * @param count - number of future months to generate
 */
export function nextPeriods(lastPeriod: string, count: number): string[] {
  const parts = lastPeriod.split('-');
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);

  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    month++;
    if (month > 12) { month = 1; year++; }
    result.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  return result;
}

/**
 * Full forecast pipeline: takes a time series and produces a complete
 * ForecastSummary with historical + projected points.
 *
 * @param series - Chronological monthly revenue data
 * @param forecastMonths - How many months ahead to project (default: 3)
 * @param maWindow - Moving average window (default: 3)
 */
export function generateForecast(
  series: TimeSeriesPoint[],
  forecastMonths = 3,
  maWindow = 3
): ForecastSummary {
  if (series.length === 0) {
    return {
      data: [],
      nextMonthForecast: 0,
      nextQuarterForecast: 0,
      rSquared: 0,
      method: 'N/A',
      confidence: 0,
    };
  }

  const values = series.map(p => p.value);
  const regression = linearRegression(values);
  const maValues = movingAverage(series, maWindow);

  // Build historical results
  const historical: ForecastResult[] = series.map((p, i) => ({
    period: p.period,
    actual: p.value,
    forecast: Math.max(0, Math.round(regression.predict(i) * 100) / 100),
    movingAvg: maValues[i],
    isForecasted: false,
  }));

  // Project future periods
  const lastPeriod = series[series.length - 1].period;
  const futurePeriods = nextPeriods(lastPeriod, forecastMonths);
  const lastMA = (maValues.filter(v => v !== null) as number[]).slice(-maWindow);
  const maBase = lastMA.length > 0 ? lastMA.reduce((a, b) => a + b, 0) / lastMA.length : values[values.length - 1];

  const projected: ForecastResult[] = futurePeriods.map((period, i) => {
    const regressionForecast = Math.max(0, regression.predict(values.length + i));
    // Blend linear regression (60%) with moving average (40%) for better accuracy
    const blended = regressionForecast * 0.6 + maBase * 0.4;
    return {
      period,
      actual: null,
      forecast: Math.round(blended * 100) / 100,
      movingAvg: null,
      isForecasted: true,
    };
  });

  const nextMonthForecast = projected[0]?.forecast ?? 0;
  const nextQuarterForecast = projected.reduce((sum, p) => sum + (p.forecast ?? 0), 0);

  // Confidence: 0–100 based on R² and data length (more data = more confidence)
  const dataBonus = Math.min(series.length / 24, 1); // max bonus at 24+ months
  const confidence = Math.round((regression.rSquared * 0.7 + dataBonus * 0.3) * 100);

  return {
    data: [...historical, ...projected],
    nextMonthForecast,
    nextQuarterForecast,
    rSquared: regression.rSquared,
    method: `Linear Regression + ${maWindow}-Month Moving Average Blend`,
    confidence,
  };
}

/**
 * Group HydratedSalesRecord-like data into monthly time series.
 * @param records - Array with OrderDate and LineTotal fields
 * @param maxMonths - Limit history to last N months (default 24)
 */
export function buildMonthlySeries(
  records: { OrderDate: string; LineTotal: number }[],
  maxMonths = 24
): TimeSeriesPoint[] {
  const monthMap = new Map<string, number>();

  for (const r of records) {
    const parts = r.OrderDate.split('-');
    const key = `${parts[0]}-${parts[1]}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + r.LineTotal);
  }

  const sorted = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-maxMonths);

  return sorted.map(([period, value]) => ({ period, value: Math.round(value * 100) / 100 }));
}
