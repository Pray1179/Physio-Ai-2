import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Calendar,
  Dumbbell,
  TrendingUp,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { listSessions } from "@/lib/repo"
import { formatDuration } from "@/lib/exercises"
import { EXERCISES, EXERCISE_NAMES, type SessionRecord } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageSkeleton } from "@/components/PageSkeleton"
import { EmptyState } from "@/components/EmptyState"
import { SessionChart } from "@/components/SessionChart"
import { cn } from "@/lib/utils"

export function SessionStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <Badge variant="success">Done</Badge>
    case "stopped":
      return <Badge variant="warning">Stopped</Badge>
    case "interrupted":
      return <Badge variant="destructive">Interrupted</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export function SessionHistoryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")

  useEffect(() => {
    if (!user) return
    listSessions(user.uid).then((s) => {
      setSessions(s)
      setLoading(false)
    })
  }, [user])

  if (loading) return <PageSkeleton />

  const filtered =
    filter === "all"
      ? sessions
      : sessions.filter((s) => s.exercise === filter)

  const filteredWithScore = filtered.filter((s) => s.score !== null)
  const avgScore =
    filteredWithScore.length > 0
      ? Math.round(
          filteredWithScore.reduce((a, s) => a + (s.score ?? 0), 0) /
            filteredWithScore.length
        )
      : null
  const totalReps = filtered.reduce((a, s) => a + s.actualReps, 0)
  const completedCount = filtered.filter(
    (s) => s.status === "completed"
  ).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
            Session History
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <Button
          size="lg"
          className="gap-2 shrink-0"
          onClick={() => navigate("/workout")}
        >
          <Dumbbell className="h-4 w-4" />
          New Workout
        </Button>
      </div>

      {/* Exercise filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
            filter === "all"
              ? "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-900 shadow-sm"
              : "border-transparent bg-[var(--color-surface-muted)] text-slate-500 hover:bg-[var(--color-surface-muted)]/80"
          )}
        >
          All exercises
        </button>
        {EXERCISE_NAMES.map((name) => (
          <button
            key={name}
            onClick={() => setFilter(name)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === name
                ? "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-900 shadow-sm"
                : "border-transparent bg-[var(--color-surface-muted)] text-slate-500 hover:bg-[var(--color-surface-muted)]/80"
            )}
          >
            {EXERCISES[name].label}
          </button>
        ))}
      </div>

      {/* Stats cards */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-3">
            <div className="text-xs text-slate-500">Sessions</div>
            <div className="mt-1 font-display text-2xl font-semibold text-slate-900">
              {filtered.length}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-slate-500">Avg Score</div>
            <div className="mt-1 font-display text-2xl font-semibold text-[var(--color-primary)]">
              {avgScore !== null ? avgScore : "—"}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-slate-500">Total Reps</div>
            <div className="mt-1 font-display text-2xl font-semibold text-slate-900">
              {totalReps}
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-slate-500">Completed</div>
            <div className="mt-1 font-display text-2xl font-semibold text-[var(--color-success)]">
              {completedCount}
            </div>
          </Card>
        </div>
      )}

      {/* Chart */}
      {filteredWithScore.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <TrendingUp className="h-4 w-4" />
              Movement Scores Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SessionChart sessions={filtered} />
          </CardContent>
        </Card>
      )}

      {/* Session list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="No sessions yet"
          description={
            filter === "all"
              ? "Start your first workout to begin tracking your progress."
              : `No ${filter.replace(/_/g, " ")} sessions recorded yet.`
          }
          action={
            <Button onClick={() => navigate("/workout")} className="gap-2">
              <Dumbbell className="h-4 w-4" />
              Start Workout
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div
              key={s.sessionId}
              className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_10%,white)]">
                  <Dumbbell className="h-5 w-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {EXERCISES[s.exercise].label}
                    </span>
                    <span className="text-xs text-slate-400 uppercase">
                      {s.side}
                    </span>
                    <SessionStatusBadge status={s.status} />
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {new Date(s.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {s.durationSeconds > 0 && (
                      <> · {formatDuration(s.durationSeconds)}</>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <div className="text-xs text-slate-500">Reps</div>
                  <div className="font-medium text-slate-900">
                    {s.actualReps}/{s.targetReps}
                  </div>
                </div>
                {s.score !== null && (
                  <div>
                    <div className="text-xs text-slate-500">Score</div>
                    <div className="font-semibold text-[var(--color-primary)]">
                      {s.score}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}