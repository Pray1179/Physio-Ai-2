import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  FileText,
  Play,
  TrendingUp,
  Calendar,
  Dumbbell,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { listSessions, getLatestTherapyPlan } from "@/lib/repo"
import { EXERCISES, type SessionRecord, type TherapyPlan } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageSkeleton } from "@/components/PageSkeleton"
import { SessionSummaryChart } from "@/components/SessionChart"
import { SessionStatusBadge } from "@/features/patient/SessionHistoryPage"

function timeSince(dateStr: string | undefined): string {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return `${Math.floor(days / 7)} weeks ago`
}

export function PatientDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [plan, setPlan] = useState<TherapyPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true
    Promise.all([listSessions(user.uid), getLatestTherapyPlan(user.uid)]).then(
      ([s, p]) => {
        if (!active) return
        setSessions(s)
        setPlan(p)
        setLoading(false)
      }
    )
    return () => {
      active = false
    }
  }, [user])

  if (loading) return <PageSkeleton />

  const recentSessions = sessions.slice(0, 10)
  const lastSession = sessions[0]

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
            Welcome back, {user?.displayName?.split(" ")[0] ?? "there"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {lastSession
              ? `Last workout ${timeSince(lastSession.createdAt)}`
              : "Start your first workout to begin tracking"}
          </p>
        </div>
        <Button
          size="lg"
          className="gap-2 shrink-0"
          onClick={() => navigate("/workout")}
        >
          <Play className="h-4 w-4" />
          Start Workout
        </Button>
      </div>

      {/* Chart + stats */}
      {recentSessions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <TrendingUp className="h-4 w-4" />
              Recent Movement Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SessionSummaryChart sessions={recentSessions} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Therapy plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[var(--color-primary)]" />
              Latest Therapy Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {plan ? (
              <div className="space-y-3">
                {plan.exercise ? (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <Dumbbell className="h-4 w-4 text-[var(--color-primary)]" />
                      {EXERCISES[plan.exercise].label}
                      {plan.side && (
                        <span className="text-xs font-normal text-slate-500">
                          · {plan.side === "both" ? "both sides" : plan.side}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                      <span>
                        <span className="font-medium text-slate-800">{plan.targetReps}</span> reps
                      </span>
                      <span>
                        <span className="font-medium text-slate-800">{plan.sets}</span> sets
                      </span>
                      <span>
                        <span className="font-medium text-slate-800">{plan.frequencyPerDay}×</span>/day
                      </span>
                    </div>
                    {plan.notes && (
                      <p className="mt-2 text-xs text-slate-500">
                        <span className="font-medium">Notes:</span> {plan.notes}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-[var(--color-surface-muted)] p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {plan.planText}
                  </div>
                )}
                <div className="text-xs text-slate-400">
                  Updated {timeSince(plan.updatedAt)}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Your clinician hasn't shared a plan with you yet. It will
                appear here as soon as they do.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[var(--color-primary)]" />
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <p className="text-sm text-slate-500">
                No sessions yet. When you finish a workout it will show up
                here.
              </p>
            ) : (
              <div className="space-y-2">
                {recentSessions.slice(0, 5).map((s) => (
                  <div
                    key={s.sessionId}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-800">
                        {EXERCISES[s.exercise].label}
                      </span>
                      <span className="text-xs text-slate-400 uppercase">
                        {s.side}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.score !== null && (
                        <Badge variant={s.score >= 80 ? "success" : s.score >= 50 ? "warning" : "destructive"}>
                          {s.score}
                        </Badge>
                      )}
                      <span className="text-xs text-slate-400">
                        {s.actualReps}/{s.targetReps} reps
                      </span>
                      <SessionStatusBadge status={s.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}