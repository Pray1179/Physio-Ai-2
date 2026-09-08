import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts"
import type { SessionRecord } from "@/types"
import { Badge } from "@/components/ui/badge"

function formatDate(iso: string | undefined): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  } catch {
    return ""
  }
}

function chartData(sessions: SessionRecord[]) {
  return [...sessions]
    .filter((s) => s.score !== null)
    .reverse() // oldest → newest for the chart
    .map((s) => ({
      date: formatDate(s.createdAt),
      score: s.score,
      reps: s.actualReps,
      exercise: s.exercise.replace(/_/g, " "),
    }))
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload as {
    date: string
    score: number
    reps: number
    exercise: string
  }
  return (
    <div className="rounded-lg border bg-[var(--color-surface)] px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-slate-900">{data.date}</p>
      <p className="text-slate-500">{data.exercise}</p>
      <p className="mt-1 text-[var(--color-primary)]">
        Score: <span className="font-semibold">{data.score}</span> · Reps:{" "}
        {data.reps}
      </p>
    </div>
  )
}

export function SessionChart({
  sessions,
  className,
}: {
  sessions: SessionRecord[]
  className?: string
}) {
  const data = chartData(sessions)

  if (data.length === 0) return null

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#14b8a6"
            strokeWidth={2}
            fill="url(#scoreGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Compact chart + summary stats for the dashboard.
 */
export function SessionSummaryChart({
  sessions,
  className,
}: {
  sessions: SessionRecord[]
  className?: string
}) {
  const withScore = sessions.filter((s) => s.score !== null)
  const avgScore =
    withScore.length > 0
      ? Math.round(withScore.reduce((a, s) => a + (s.score ?? 0), 0) / withScore.length)
      : null
  const totalReps = sessions.reduce((a, s) => a + s.actualReps, 0)

  return (
    <div className={className}>
      {avgScore !== null && (
        <div className="mb-3 flex gap-2">
          <Badge variant="info">Avg score: {avgScore}</Badge>
          <Badge variant="secondary">Total reps: {totalReps}</Badge>
        </div>
      )}
      <SessionChart sessions={sessions} />
    </div>
  )
}