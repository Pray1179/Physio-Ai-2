import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  Activity,
  Stethoscope,
  Search,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/components/ui/toast"
import {
  assignedPatientUids,
  fetchUserProfile,
  saveCareAssignment,
  getCareAssignment,
  listSessions,
  listConnectablePatients,
  searchPatientsByEmail,
  type PatientProfile,
} from "@/lib/repo"
import type { SessionRecord } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageSkeleton } from "@/components/PageSkeleton"

/** Days since the last session; null when a patient has never worked out. */
function daysSinceLast(session: SessionRecord | null): number | null {
  if (!session?.createdAt) return null
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(session.createdAt).getTime()) / 86400000)
  )
}

const INACTIVE_DAYS = 2

interface PatientRow {
  profile: PatientProfile
  sessions: SessionRecord[]
  daysSince: number | null
}

/**
 * Doctor home: assigned patients with activity flags + the demo connect flow.
 * In production patients are linked by a clinic admin; the mailto reminder is
 * the brief's inactivity-email mechanism, kept as a client-side action.
 */
export function DoctorDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [rows, setRows] = useState<PatientRow[]>([])
  const [connectable, setConnectable] = useState<PatientProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [emailQuery, setEmailQuery] = useState("")
  const [searchResult, setSearchResult] = useState<PatientProfile | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const uids = await assignedPatientUids(user.uid)
    const profiles = (
      await Promise.all(uids.map((uid) => fetchUserProfile(uid)))
    ).filter((p): p is PatientProfile => p !== null)

    const loaded = await Promise.all(
      profiles.map(async (profile) => {
        const sessions = await listSessions(profile.uid)
        return {
          profile,
          sessions,
          daysSince: daysSinceLast(sessions[0] ?? null),
        }
      })
    )
    setRows(loaded)
    setConnectable(await listConnectablePatients())
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const connect = async (profile: PatientProfile) => {
    if (!user) return
    const existing = await getCareAssignment(profile.uid)
    const doctorUids = existing
      ? [...new Set([...existing.doctorUids, user.uid])]
      : [user.uid]
    try {
      await saveCareAssignment({
        patientUid: profile.uid,
        doctorUids,
        updatedAt: new Date().toISOString(),
      })
      toast("Patient connected", {
        description: `${profile.displayName} is now on your patient list.`,
        variant: "success",
      })
      setConnectable((prev) => prev.filter((p) => p.uid !== profile.uid))
      setSearchResult(null)
      setEmailQuery("")
      await load()
    } catch {
      toast("Could not connect patient", { variant: "error" })
    }
  }

  const handleSearch = async () => {
    const q = emailQuery.trim()
    if (!q) return
    setSearching(true)
    setSearchError(null)
    setSearchResult(null)
    try {
      const found = await searchPatientsByEmail(q)
      if (!found) {
        setSearchError("No patient found with that email.")
      } else if (rows.some((r) => r.profile.uid === found.uid)) {
        setSearchError("This patient is already on your list.")
      } else {
        setSearchResult(found)
      }
    } catch {
      setSearchError("Search failed. Please try again.")
    } finally {
      setSearching(false)
    }
  }

  if (loading) return <PageSkeleton />

  const anyInactive = rows.some((r) => r.daysSince !== null && r.daysSince > INACTIVE_DAYS)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
            My Patients
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Monitor activity, review sessions and issue therapy plans.
          </p>
        </div>
        {anyInactive && (
          <Button
            variant="outline"
            asChild
          >
            <a
              href={`mailto:${rows
                .filter((r) => r.daysSince !== null && r.daysSince > INACTIVE_DAYS)
                .map((r) => r.profile.email)
                .join(",")}?subject=${encodeURIComponent(
                "We noticed you haven't worked out recently"
              )}&body=${encodeURIComponent(
                "Hi! It has been a couple of days since your last recorded exercise session. Check your therapy plan and let us know if anything is blocking you. — Your physio team"
              )}`}
            >
              <Mail className="h-4 w-4" /> Remind inactive patients
            </a>
          </Button>
        )}
      </div>

      {/* Assigned patients */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Stethoscope className="h-8 w-8 text-slate-300" />
            <div>
              <p className="font-medium text-slate-700">No patients yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Search for a patient by their account email below to link them
                and get started.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map(({ profile, sessions, daysSince }) => {
            const totalReps = sessions.reduce(
              (sum, s) => sum + (Number(s.actualReps) || 0),
              0
            )
            const inactive =
              daysSince !== null && daysSince > INACTIVE_DAYS
            return (
              <Card key={profile.uid} className={inactive ? "ring-1 ring-[color-mix(in_srgb,var(--color-warning)_25%,transparent)]" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <Link
                        to={`/doctor/patients/${profile.uid}`}
                        className="font-display text-[15px] font-semibold text-slate-900 hover:text-[var(--color-primary)]"
                      >
                        {profile.displayName}
                      </Link>
                      <p className="text-xs text-slate-500">{profile.email}</p>
                    </div>
                    {sessions.length === 0 ? (
                      <Badge variant="secondary">New</Badge>
                    ) : inactive ? (
                      <Badge variant="warning">
                        Inactive {daysSince} days
                      </Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center divide-x divide-slate-200 rounded-xl bg-[var(--color-surface-muted)]/70 text-sm">
                    <span className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-slate-600">
                      <Activity className="h-4 w-4 text-[var(--color-primary)]" />
                      {sessions.length} sessions
                    </span>
                    <span className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-slate-600">
                      <Users className="h-4 w-4 text-[var(--color-primary)]" />
                      {totalReps} reps
                    </span>
                    <span className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-slate-600">
                      <Clock className="h-4 w-4 text-[var(--color-primary)]" />
                      {daysSince === null
                        ? "never"
                        : daysSince === 0
                          ? "today"
                          : `${daysSince}d ago`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Connect a patient by email */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <UserPlus className="h-4 w-4" />
            Connect a patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-slate-400">
            Find a registered patient by the email on their account, then link
            them to see their sessions and prescribe a plan.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="patient@gmail.com"
              className="h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm outline-none placeholder:text-slate-400 focus:border-[var(--color-primary)]"
            />
            <Button
              size="sm"
              onClick={handleSearch}
              disabled={searching || !emailQuery.trim()}
            >
              <Search className="h-4 w-4" />
              {searching ? "Searching…" : "Search"}
            </Button>
          </div>

          {searchError && (
            <p className="mt-3 text-sm text-[var(--color-error)]">
              {searchError}
            </p>
          )}
          {searchResult && (
            <div className="mt-3 flex items-center justify-between rounded-lg border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {searchResult.displayName}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {searchResult.email}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => connect(searchResult)}
              >
                Connect
              </Button>
            </div>
          )}

          {connectable.length > 0 && (
            <>
              <p className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Available in this demo
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {connectable.map((p) => (
                  <div
                    key={p.uid}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {p.displayName}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {p.email}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => connect(p)}
                    >
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {rows.length === 0 && !anyInactive && (
        <p className="text-center text-xs text-slate-400">
          Tip: search for a patient email above, or register a patient account
          in this browser first.
        </p>
      )}
    </div>
  )
}

export default DoctorDashboard