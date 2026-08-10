/**
 * Recharts-based chart building blocks for the /admin/insights product
 * analytics screens (VTID-03567). Complements AnalyticsShared.tsx: KPI cards
 * and states stay there; everything that draws marks lives here.
 *
 * Palette: the 8-slot categorical order validated with the dataviz palette
 * checker against this app's real surfaces (#ffffff light / #020817 dark) —
 * adjacent-pair CVD ΔE ≥ 8.4, normal-vision ΔE ≥ 19.3, all dark slots ≥ 3:1.
 * Three light slots sit below 3:1 contrast, so every chart here keeps visible
 * labels/values beside the marks (the relief rule) — identity is never
 * color-alone.
 */

import { ReactNode, useSyncExternalStore } from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtNumber } from "@/lib/locale-format";

export const CHART_SERIES_LIGHT = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
];

export const CHART_SERIES_DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];

function subscribeToThemeClass(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function readIsDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function useChartTheme() {
  const dark = useSyncExternalStore(subscribeToThemeClass, readIsDark, () => false);
  return {
    dark,
    series: dark ? CHART_SERIES_DARK : CHART_SERIES_LIGHT,
    surface: dark ? "#020817" : "#ffffff",
    gridStroke: dark ? "#1e293b" : "#e2e8f0",
    tickFill: dark ? "#94a3b8" : "#64748b",
  };
}

export interface SeriesDef {
  key: string;
  label: string;
}

export function ChartLegend({ items }: { items: Array<{ label: string; color: string; value?: string }> }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
          {item.value !== undefined && <span className="font-medium text-foreground">{item.value}</span>}
        </span>
      ))}
    </div>
  );
}

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; stroke?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <div className="mb-1 font-medium text-popover-foreground">{label}</div>}
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-1.5 text-popover-foreground">
          <span
            className="h-2 w-2 shrink-0 rounded-sm"
            style={{ backgroundColor: entry.color ?? entry.stroke }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="ml-auto pl-3 font-medium">{fmtNumber(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Ranked horizontal bar list — label + proportional bar + visible count.
 * CSS-based so long route/feature labels truncate gracefully on mobile.
 */
export function BarListCard({
  title,
  rows,
  emptyLabel,
  maxRows = 12,
  colorIndex = 0,
  action,
}: {
  title: string;
  rows: Array<{ label: string; count: number; extra?: ReactNode }>;
  emptyLabel: string;
  maxRows?: number;
  colorIndex?: number;
  action?: ReactNode;
}) {
  const { series } = useChartTheme();
  const shown = rows.slice(0, maxRows);
  const max = Math.max(1, ...shown.map((r) => r.count));
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="max-h-[60vh] overflow-y-auto">
        {shown.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="space-y-2">
            {shown.map((row) => (
              <div key={row.label} className="grid grid-cols-[minmax(0,42%)_1fr_auto] items-center gap-2 text-sm">
                <span className="truncate font-mono text-xs" title={row.label}>
                  {row.label}
                </span>
                <span className="h-2 overflow-hidden rounded-[4px] bg-muted">
                  <span
                    className="block h-full rounded-[4px]"
                    style={{ width: `${(row.count / max) * 100}%`, backgroundColor: series[colorIndex % series.length] }}
                  />
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="min-w-[2.5rem] text-right text-xs font-medium tabular-nums">
                    {fmtNumber(row.count)}
                  </span>
                  {row.extra}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Time-series line chart. Pass preformatted x labels (e.g. via fmtDate) in
 * `xKey` so all locale formatting stays with the caller.
 */
export function TrendChartCard({
  title,
  data,
  xKey,
  series,
  emptyLabel,
  height = 260,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: SeriesDef[];
  emptyLabel: string;
  height?: number;
}) {
  const theme = useChartTheme();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">{emptyLabel}</p>
        ) : (
          <>
            <div style={{ width: "100%", height }}>
              <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={theme.gridStroke} />
                  <XAxis
                    dataKey={xKey}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme.tickFill, fontSize: 11 }}
                    minTickGap={24}
                  />
                  <YAxis
                    width={44}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme.tickFill, fontSize: 11 }}
                    tickFormatter={(v: number) => fmtNumber(v)}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltipContent />} cursor={{ stroke: theme.gridStroke }} />
                  {series.map((s, i) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.label}
                      stroke={theme.series[i % theme.series.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, stroke: theme.surface, strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {series.length > 1 && (
              <ChartLegend
                items={series.map((s, i) => ({ label: s.label, color: theme.series[i % theme.series.length] }))}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Donut for a small rate split (2-4 segments). Legend carries the visible
 * values, so the color never has to work alone.
 */
export function DonutCard({
  title,
  segments,
  centerValue,
  centerLabel,
  emptyLabel,
}: {
  title: string;
  segments: Array<{ label: string; value: number; colorIndex: number }>;
  centerValue?: string;
  centerLabel?: string;
  emptyLabel: string;
}) {
  const theme = useChartTheme();
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm italic text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative h-[140px] w-[140px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={segments}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={68}
                    stroke={theme.surface}
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {segments.map((s) => (
                      <Cell key={s.label} fill={theme.series[s.colorIndex % theme.series.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
              {centerValue && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold">{centerValue}</span>
                  {centerLabel && <span className="text-[10px] uppercase text-muted-foreground">{centerLabel}</span>}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              {segments.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: theme.series[s.colorIndex % theme.series.length] }}
                  />
                  <span className="truncate text-muted-foreground">{s.label}</span>
                  <span className="ml-auto pl-2 font-medium tabular-nums">
                    {fmtNumber(s.value)}
                    <span className="ml-1 text-muted-foreground">
                      ({total > 0 ? Math.round((s.value / total) * 100) : 0}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Horizontal stacked bars (CSS): one row per entity, segments colored by a
 * shared series definition, 2px surface gaps between segments, visible total.
 */
export function StackedBarListCard({
  title,
  rows,
  series,
  emptyLabel,
  maxRows = 12,
}: {
  title: string;
  rows: Array<{ label: string; values: number[] }>;
  series: SeriesDef[];
  emptyLabel: string;
  maxRows?: number;
}) {
  const theme = useChartTheme();
  const shown = rows.slice(0, maxRows);
  const rowTotal = (r: { values: number[] }) => r.values.reduce((sum, v) => sum + v, 0);
  const max = Math.max(1, ...shown.map(rowTotal));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[60vh] overflow-y-auto">
        {shown.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">{emptyLabel}</p>
        ) : (
          <>
            <ChartLegend
              items={series.map((s, i) => ({ label: s.label, color: theme.series[i % theme.series.length] }))}
            />
            <div className="mt-3 space-y-2">
              {shown.map((row) => {
                const total = rowTotal(row);
                return (
                  <div key={row.label} className="grid grid-cols-[minmax(0,42%)_1fr_auto] items-center gap-2 text-sm">
                    <span className="truncate font-mono text-xs" title={row.label}>
                      {row.label}
                    </span>
                    <span className="flex h-2 gap-[2px]" style={{ width: `${(total / max) * 100}%` }}>
                      {row.values.map((v, i) =>
                        v > 0 ? (
                          <span
                            key={series[i]?.key ?? i}
                            className="h-full first:rounded-l-[4px] last:rounded-r-[4px]"
                            style={{
                              flexGrow: v,
                              backgroundColor: theme.series[i % theme.series.length],
                            }}
                          />
                        ) : null,
                      )}
                    </span>
                    <span className="min-w-[2.5rem] text-right text-xs font-medium tabular-nums">
                      {fmtNumber(total)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
