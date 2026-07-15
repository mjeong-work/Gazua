// Shared recharts <Tooltip> config for the small "value on hover" price/portfolio charts
// used across the app (e.g. /my-profile, /main). Extracted so every chart's hover
// tooltip stays visually and behaviorally consistent instead of each screen
// reimplementing its own formatting.
//
// Note: recharts requires <Tooltip> to be a direct child of the chart component, so this
// can only export the shared style/formatter values (not a wrapper component) — apply them
// as props on each chart's own <Tooltip> element.

export const CHART_TOOLTIP_STYLE = { fontSize: 11, borderRadius: 8, padding: '6px 10px' };

/** Formats a raw number as a rounded dollar amount, e.g. 82345.6 -> "$82,346". */
export function formatChartCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/**
 * recharts Tooltip `formatter` — shows the dollar value, using the series `name` when the
 * chart defines one (e.g. "Actual"/"Hypothesis" on a multi-line chart), else `fallbackName`.
 */
export function chartCurrencyFormatter(fallbackName: string) {
  return (value: number, name: string) => [formatChartCurrency(value), name || fallbackName] as const;
}

/** recharts Tooltip `labelFormatter` that hides the x-axis label — for charts whose axis is a synthetic index (t0, t1...) rather than a real date. */
export function hideChartLabel() {
  return '';
}

/** recharts Tooltip `labelFormatter` that shows the x-axis label as-is — for charts whose axis is a real date/time string. */
export function showChartLabel(label: string) {
  return label;
}
