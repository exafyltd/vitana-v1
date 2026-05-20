import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

import { fmtNumber } from '@/lib/locale-format';
interface FunnelData {
  started: number;
  email_sent: number;
  verified: number;
  profile_created: number;
  onboarded: number;
  abandoned: number;
}

interface SignupFunnelChartProps {
  data: FunnelData;
  loading?: boolean;
}

const STAGE_CONFIG: {
  key: keyof FunnelData;
  label: string;
  color: string;
}[] = [
  { key: "started", label: "Started", color: "#a78bfa" },
  { key: "email_sent", label: "Email Sent", color: "#8b5cf6" },
  { key: "verified", label: "Verified", color: "#7c3aed" },
  { key: "profile_created", label: "Profile Created", color: "#6d28d9" },
  { key: "onboarded", label: "Onboarded", color: "#5b21b6" },
  { key: "abandoned", label: "Abandoned", color: "#ef4444" },
];

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-5 w-48" />
      <div className="flex items-end gap-3 h-[250px] pt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${80 - i * 10}%` }}
          />
        ))}
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { label: string; count: number; percentage: string } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{item.label}</p>
      <p className="text-muted-foreground">
        {fmtNumber(item.count)} ({item.percentage})
      </p>
    </div>
  );
}

export function SignupFunnelChart({ data, loading = false }: SignupFunnelChartProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  const total = data.started || 1;

  const chartData = STAGE_CONFIG.map(({ key, label, color }) => ({
    label,
    count: data[key],
    percentage: `${((data[key] / total) * 100).toFixed(1)}%`,
    color,
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="horizontal"
          margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            maxBarSize={60}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {chartData.map((entry) => (
          <div key={entry.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            {entry.label}: {fmtNumber(entry.count)} ({entry.percentage})
          </div>
        ))}
      </div>
    </div>
  );
}
