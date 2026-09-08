import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Activity,
  Calendar,
  Mail,
  Video,
  UserMinus,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/components/ui/toast"
import {
  fetchUserProfile,
  listSessions,
  getLatestTherapyPlan,
  dischargePatient,
  type PatientProfile,
} from "@/lib/repo"
import { getRecordingUrl } from "@/lib/storage"
import { isDemoMode } from "@/lib/firebase"
import { EXERCISES, type SessionRecord, type TherapyPlan } from "@/types"
import { formatDuration } from "@/lib/exercises"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageSkeleton } from "@/components/PageSkeleton"
import { SessionStatusBadge } from "@/features/patient/SessionHistoryPage"
import { PrescriptionForm } from "@/features/doctor/PrescriptionForm"

function timeSince(dateStr: string | undefined): string {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return `${Math.floor(days / 7)} weeks ago`
}

function RecordingCard({ session }: { session: SessionRecord }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!session.recordingPath) return
    let active = true
    getRecordingUrl(session.recordingPath)
      .then((u) => {
        if (active) setUrl(u)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [session.recordingPath])

  if (error) return null

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-600">
        {EXERCISES[session.exercise].label} · {session.side} side ·{" "}
        {timeSince(session.createdAt).toLowerCase()}
      </p>
      {url ? (
        <video
          controls
          src={url}
          className="w-full rounded-lg border bg-black"
        />
      ) : (
        <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
      )}
    </div>
  )
}

/**
 * Doctor's view of a single patient: profile, activity stats, full session
 * history and the therapy-plan editor. Sensitive data — only reachable by
 * doctors whose care assignment lists this patient.
 */
export function PatientDetailPage() {
  const { patientUid } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [plan, setPlan] = useState<TherapyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [refetchKey, setRefetchKey] = useState(0)
  const [discharging, setDischarging] = useState(false)

  useEffect(() => {
    if (!patientUid) return
    let active = true
    Promise.all([
      fetchUserProfile(patientUid),
      listSessions(patientUid),
      getLatestTherapyPlan(patientUid),
    ]).then(([p, s, pl]) => {
      if (!active) return
      setProfile(p)
      setSessions(s)
      setPlan(pl)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [patientUid, refetchKey])

  if (loading) return <PageSkeleton />

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">Patient not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          This patient isn't linked to your account.
        </p>
        <Button className="mt-6" onClick={() => navigate("/doctor")}>
          Back to patients
        </Button>
      </div>
    )
  }

  const handleDischarge = async () => {
    if (!user) return
    if (!window.confirm(`Are you sure you want to discharge ${profile.displayName}? You will no longer have access to their records.`)) return
    setDischarging(true)
    try {
      await dischargePatient(profile.uid, user.uid)
      toast("Patient discharged", {
        description: `${profile.displayName} has been removed from your patient list.`,
        variant: "success",
      })
      navigate("/doctor")
    } catch {
      toast("Could not discharge patient", { variant: "error" })
    } finally {
      setDischarging(false)
    }
  }

  const totalReps = sessions.reduce((sum, s) => sum + (Number(s.actualReps) || 0), 0)
  const scored = sessions.filter((s) => s.score !== null)
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length)
    : null
  const last = sessions[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2 gap-1 text-slate-500"
            onClick={() => navigate("/doctor")}
          >
            <ArrowLeft className="h-4 w-4" /> Back to patients
          </Button>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">{profile.displayName}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{profile.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={`mailto:${profile.email}`}>
              <Mail className="h-4 w-4" /> Email
            </a>
          </Button>
          <Button
            variant="outline"
            className="gap-1.5 text-[var(--color-error)] hover:bg-red-50"
            onClick={handleDischarge}
            disabled={discharging}
          >
            <UserMinus className="h-4 w-4" />
            {discharging ? "Discharging…" : "Discharge"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Activity className="h-3 w-3" /> Sessions
            </div>
            <p className="mt-1 font-display text-2xl font-semibold text-slate-900">{sessions.length}</p>
            <p className="text-xs text-slate-400">
              last {last ? timeSince(last.createdAt).toLowerCase() : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="h-3 w-3" /> Total reps
            </div>
            <p className="mt-1 font-display text-2xl font-semibold text-slate-900">{totalReps}</p>
            <p className="text-xs text-slate-400">across all sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Activity className="h-3 w-3" /> Avg score
            </div>
            {avgScore === null ? (
              <p className="mt-1 font-display text-2xl font-semibold text-slate-300">—</p>
            ) : (
              <p className="mt-1 font-display text-2xl font-semibold text-slate-900">{avgScore}</p>
            )}
            <p className="text-xs text-slate-400">of 100</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Video className="h-3 w-3" /> Recordings
            </div>
            <p className="mt-1 font-display text-2xl font-semibold text-slate-900">
              {sessions.filter((s) => s.recordingState === "uploaded").length}
            </p>
            <p className="text-xs text-slate-400">uploaded</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Session history */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-500">
              Session History ({sessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-sm text-slate-500">
                No sessions recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.sessionId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-800">
                        {EXERCISES[s.exercise].label}
                      </span>
                      <span className="text-xs text-slate-400 uppercase">
                        {s.side}
                      </span>
                      {s.score !== null && (
                        <Badge
                          variant={
                            s.score >= 80
                              ? "success"
                              : s.score >= 50
                                ? "warning"
                                : "destructive"
                          }
                        >
                          {Math.round(s.score)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {timeSince(s.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {s.actualReps}/{s.targetReps} reps
                      </span>
                      <span className="hidden sm:inline">
                        {formatDuration(s.durationSeconds * 1000)}
                      </span>
                      <SessionStatusBadge status={s.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prescription */}
        <div className="lg:col-span-2">
          <PrescriptionForm
            patientUid={profile.uid}
            doctorUid={user?.uid ?? ""}
            existing={plan}
            onSaved={() => setRefetchKey((k) => k + 1)}
          />
        </div>
      </div>

      {/* Cloud recordings — only show when there are uploaded videos */}
      {!isDemoMode && sessions.some((s) => s.recordingPath) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Video className="h-4 w-4" /> Workout Recordings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessions
              .filter((s) => s.recordingPath)
              .map((s) => (
                <RecordingCard key={s.sessionId} session={s} />
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PatientDetailPage