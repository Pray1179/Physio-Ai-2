import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  CheckCircle2,
  Clock,
  Download,
  Dumbbell,
  Play,
  RotateCcw,
  Target,
  Video,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import {
  readPendingResult,
  clearPendingResult,
  type PendingResult,
} from "@/lib/resultTransport"
import { getSession } from "@/lib/repo"
import { getRecordingUrl } from "@/lib/storage"
import { formatDuration } from "@/lib/exercises"
import { EXERCISES, type SessionRecord } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageSkeleton } from "@/components/PageSkeleton"
import { SessionStatusBadge } from "@/features/patient/SessionHistoryPage"

/**
 * Post-workout summary. Reads the just-finished session from sessionStorage
 * (handed off by WorkoutView); if that is gone — e.g. after a refresh — it
 * falls back to loading the session from the data layer by id. The recording,
 * if any, is a local object URL valid only for this page visit, which is all
 * it takes for playback + download.
 */
export function SessionResultPage() {
  const { sessionId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pending] = useState<PendingResult | null>(() => readPendingResult())
  const [session, setSession] = useState<SessionRecord | null>(
    pending?.session ?? null
  )
  const [recordingUrl] = useState<string | null>(pending?.recordingUrl ?? null)
  const [cloudUrl, setCloudUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(!pending)

  /* Fallback: fetch from the data layer when no handoff payload exists. */
  useEffect(() => {
    if (pending || !sessionId) return
    let active = true
    getSession(sessionId).then((s) => {
      if (!active) return
      setSession(s)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [pending, sessionId])

  /* If the session has a cloud recording path, fetch its signed URL. */
  useEffect(() => {
    const path = session?.recordingPath
    if (!path || recordingUrl) return // local blob takes priority
    let active = true
    getRecordingUrl(path).then((url) => {
      if (active) setCloudUrl(url)
    })
    return () => {
      active = false
    }
  }, [session?.recordingPath, recordingUrl])

  useEffect(() => () => clearPendingResult(), [])

  if (loading) return <PageSkeleton />

  if (!session) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">Session not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          We couldn't find this workout. It may not have been saved.
        </p>
        <Button className="mt-6" onClick={() => navigate("/patient")}>
          Back to dashboard
        </Button>
      </div>
    )
  }

  const score = session.score

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-10">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] text-white shadow-[0_4px_12px_rgba(14,141,125,0.35)]">
          {session.status === "completed" ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : (
            <Dumbbell className="h-7 w-7" />
          )}
        </div>
        <h1 className="mt-4 font-display text-[1.6rem] font-semibold tracking-tight text-slate-900">
          {session.status === "completed"
            ? "Workout complete"
            : session.status === "stopped"
              ? "Workout stopped"
              : "Workout interrupted"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {EXERCISES[session.exercise].label} · {session.side} side
        </p>
        <div className="mt-3 flex justify-center">
          <SessionStatusBadge status={session.status} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-500">
            Session Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Target className="h-3 w-3" /> Target
              </div>
              <p className="mt-1 font-display text-xl font-semibold text-slate-900">
                {session.targetReps}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Dumbbell className="h-3 w-3" /> Performed
              </div>
              <p className="mt-1 font-display text-xl font-semibold text-slate-900">
                {session.actualReps}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3 w-3" /> Duration
              </div>
              <p className="mt-1 font-display text-xl font-semibold text-slate-900">
                {formatDuration(session.durationSeconds * 1000)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <CheckCircle2 className="h-3 w-3" /> Movement score
              </div>
              {score === null ? (
                <p className="mt-1 font-display text-xl font-semibold text-slate-400">—</p>
              ) : (
                <Badge
                  variant={
                    score >= 80
                      ? "success"
                      : score >= 50
                        ? "warning"
                        : "destructive"
                  }
                  className="mt-1 text-lg"
                >
                  {Math.round(score)}
                </Badge>
              )}
            </div>
          </div>

          <p className="mt-4 border-t pt-4 text-xs text-slate-400">
            Movement score is the mean of the scores captured at each counted
            rep peak ({session.scoreMethod ?? "peak scoring"}).
          </p>
        </CardContent>
      </Card>

      {(recordingUrl ?? cloudUrl) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Video className="h-4 w-4" /> Recording
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <video
              controls
              src={(recordingUrl ?? cloudUrl) ?? undefined}
              className="w-full rounded-lg border bg-black"
            />
            <div className="flex justify-end">
              <Button asChild variant="secondary">
                <a
                  href={(recordingUrl ?? cloudUrl) ?? undefined}
                  download={recordingUrl ? "physio-workout.webm" : undefined}
                >
                  <Download className="h-4 w-4" />
                  {recordingUrl ? "Download" : "Open"}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1 gap-2"
          onClick={() => navigate("/workout")}
        >
          <Play className="h-4 w-4" /> Start another workout
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => navigate("/patient")}
        >
          <RotateCcw className="h-4 w-4" /> Back to dashboard
        </Button>
      </div>

      {user?.role === "doctor" && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => navigate("/doctor/patients/" + session.patientUid)}
        >
          View patient detail
        </Button>
      )}
    </div>
  )
}

export default SessionResultPage