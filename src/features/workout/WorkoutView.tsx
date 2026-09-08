import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronLeft,
  Clock,
  Dumbbell,
  Film,
  Info,
  Loader,
  Minus,
  Pause,
  Play,
  Plus,
  Square,
  Zap,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useCamera } from "@/hooks/useCamera"
import { usePoseTracker } from "@/hooks/useMediaPipe"
import { useRecording } from "@/hooks/useRecording"
import {
  createWorkoutState,
  updateRepState,
  calculateSessionScore,
  SCORE_METHOD,
  formatDuration,
  type PoseSample,
} from "@/lib/exercises"
import { saveSession } from "@/lib/repo"
import { setDocData } from "@/lib/firestore"
import { uploadRecording } from "@/lib/storage"
import { persistPendingResult } from "@/lib/resultTransport"
import { isDemoMode } from "@/lib/firebase"
import { EXERCISES, EXERCISE_NAMES, type ExerciseName, type Side } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/toast"

type Phase = "setup" | "tracking"

const SIDES: Side[] = ["right", "left"]

let sessionSeq = 0
function makeSessionId(): string {
  sessionSeq += 1
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 6)
  return `s_${t}${r}_${sessionSeq}`
}

/** Draw a single camera frame + joint overlay into the visible canvas. */
function drawPoseFrame(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  sample: PoseSample | null
) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const w = video.videoWidth
  const h = video.videoHeight
  if (w === 0 || h === 0) return
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h

  // Mirrored feed (mirrors the video so the overlay aligns with sample coords).
  ctx.save()
  ctx.scale(-1, 1)
  ctx.translate(-w, 0)
  ctx.drawImage(video, 0, 0, w, h)
  ctx.restore()

  if (!sample || !sample.visible || !sample.a || !sample.b || !sample.c) return

  const pts = [sample.a, sample.b, sample.c].map((p) => ({
    x: (1 - p.x) * w,
    y: p.y * h,
  }))

  ctx.lineWidth = 6
  ctx.lineCap = "round"
  ctx.strokeStyle = "#14b8a6"
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  ctx.lineTo(pts[1].x, pts[1].y)
  ctx.lineTo(pts[2].x, pts[2].y)
  ctx.stroke()

  ctx.fillStyle = "#0ea5e9"
  for (const i of [0, 2]) {
    ctx.beginPath()
    ctx.arc(pts[i].x, pts[i].y, 7, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = "#f59e0b"
  ctx.beginPath()
  ctx.arc(pts[1].x, pts[1].y, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.8)"
  ctx.lineWidth = 2
  ctx.stroke()
}

export function WorkoutView() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [phase, setPhase] = useState<Phase>("setup")

  // Setup form
  const [exercise, setExercise] = useState<ExerciseName>("bicep_curls")
  const [side, setSide] = useState<Side>("right")
  const [targetReps, setTargetReps] = useState(10)
  const [recordingConsent, setRecordingConsent] = useState(false)

  // Tracking UI
  const [display, setDisplay] = useState({
    currentReps: 0,
    currentScore: 0,
    stage: null as string | null,
    status: "idle" as string,
    elapsedMs: 0,
  })
  const [trackerState, setTrackerState] = useState<
    "loading" | "ready" | "error"
  >("loading")
  const [trackerError, setTrackerError] = useState<string | null>(null)

  const camera = useCamera()
  const tracker = usePoseTracker()
  const videoRef = camera.videoRef
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Workout machine state lives in a ref — it's mutated per frame.
  const rsRef = useRef(createWorkoutState(null, "right", 10))
  const phaseRef = useRef<Phase>("setup")
  phaseRef.current = phase
  const rafRef = useRef<number | null>(null)
  const lastUiSyncRef = useRef(0)
  const savedRef = useRef(false)
  const pauseStartRef = useRef<number | null>(null)

  // Recording (deliberately opt-in)
  const recording = useRecording(camera.stream, recordingConsent)
  const recordingStartedRef = useRef(false)

  /* ------------------------------------------------------------------ */
  /* Tracking loop                                                        */
  /* ------------------------------------------------------------------ */

  const syncDisplay = useCallback((rs = rsRef.current) => {
    const elapsedMs = rs.startTime
      ? Math.max(0, Date.now() - rs.startTime - rs.pausedMs)
      : 0
    setDisplay({
      currentReps: rs.currentReps,
      currentScore: rs.currentScore,
      stage: rs.stage,
      status: rs.status,
      elapsedMs,
    })
  }, [])

  const finish = useCallback(
    async (status: "completed" | "stopped" | "interrupted") => {
      if (savedRef.current) return
      savedRef.current = true
      const rs = rsRef.current
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null

      const recordingUrl = recordingStartedRef.current
        ? await recording.stop()
        : null

      const durationMs = rs.startTime
        ? Math.max(0, Date.now() - rs.startTime - rs.pausedMs)
        : 0
      const score = calculateSessionScore(rs)

      const session: any = {
        sessionId: makeSessionId(),
        patientUid: user?.uid ?? "anonymous",
        exercise: rs.exercise,
        side: rs.side,
        targetReps: rs.targetReps,
        actualReps: rs.currentReps,
        score,
        scoreMethod: SCORE_METHOD,
        status,
        durationSeconds: Math.round(durationMs / 1000),
        createdAt: new Date().toISOString(),
        recordingPath: null,
        recordingState: recordingUrl ? "local" : "none",
      }

      try {
        await saveSession(session)
      } catch {
        toast("Could not save the session to the server", { variant: "error" })
      }

      persistPendingResult({ session, recordingUrl })
      navigate(`/session/${session.sessionId}/result`, { replace: true })

      // Fire-and-forget: upload recording to Firebase Storage.
      // Never blocks navigation; on failure, session is still saved locally.
      if (!isDemoMode && recordingUrl && user) {
        fetch(recordingUrl)
          .then((r) => r.blob())
          .then((blob) => uploadRecording(user.uid, session.sessionId, blob))
          .then(async (path) => {
            if (path) {
              await setDocData("sessions", session.sessionId, {
                recordingPath: path,
                recordingState: "uploaded",
              })
            }
          })
          .catch(() => {
            setDocData("sessions", session.sessionId, {
              recordingState: "failed",
            })
          })
      }
    },
    [user, navigate, toast, recording]
  )

  // The rAF loop: draw + detect + advance the rep machine.
  useEffect(() => {
    if (phase !== "tracking") return

    const loop = () => {
      if (phaseRef.current !== "tracking") return
      rafRef.current = requestAnimationFrame(loop)

      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return

      const ex = rsRef.current.exercise
      const joints = ex ? EXERCISES[ex].joints : undefined
      const sample = joints ? tracker.detect(video, joints, rsRef.current.side) : null

      drawPoseFrame(canvas, video, sample)

      // Update the machine unless suspended/paused/terminal.
      const rs = rsRef.current
      const canCount =
        ["idle", "arming", "counting"].includes(rs.status) &&
        rs.exercise !== null
      if (!canCount || sample === null) {
        // Pose lost / paused: clear live score, don't bump reps.
        const { state } = updateRepState(rs, null)
        rsRef.current = state
      } else {
        const { state, repCounted } = updateRepState(rs, sample)
        rsRef.current = state
        if (repCounted) {
          syncDisplay(state)
          lastUiSyncRef.current = Date.now()
          if (state.status === "completed") {
            finish("completed")
            return
          }
        }
      }

      // Throttle UI refresh to ~10 Hz.
      const now = Date.now()
      if (now - lastUiSyncRef.current > 100) {
        lastUiSyncRef.current = now
        syncDisplay()
      }
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [phase, videoRef, tracker, syncDisplay, finish])

  // Save as interrupted if the user leaves the page mid-workout.
  useEffect(() => {
    if (phase !== "tracking") return
    const onLeave = () => {
      if (!savedRef.current && rsRef.current.status !== "idle") {
        savedRef.current = true
        finish("interrupted")
      }
    }
    window.addEventListener("beforeunload", onLeave)
    return () => {
      window.removeEventListener("beforeunload", onLeave)
      if (!savedRef.current && rsRef.current.status !== "idle") {
        savedRef.current = true
        finish("interrupted")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  /* ------------------------------------------------------------------ */
  /* Controls                                                             */
  /* ------------------------------------------------------------------ */

  const beginWorkout = async () => {
    rsRef.current = createWorkoutState(exercise, side, targetReps)
    rsRef.current.status = "arming"
    setPhase("tracking")
    setTrackerState("loading")
    setTrackerError(null)

    const camResult = await camera.start()
    if (!camResult.ok) return

    try {
      await tracker.init()
      setTrackerState("ready")
    } catch (err: any) {
      setTrackerState("error")
      setTrackerError(
        err?.message ?? "Could not load the pose tracker. Your reps will not count."
      )
    }

    if (recordingConsent) {
      recording.start()
      recordingStartedRef.current = true
    }

    rsRef.current.startTime = Date.now()
    syncDisplay()
  }

  const togglePause = () => {
    const rs = rsRef.current
    if (rs.status === "paused") {
      if (pauseStartRef.current !== null) {
        rs.pausedMs += Date.now() - pauseStartRef.current
        pauseStartRef.current = null
      }
      rs.status = "arming" // must re-acquire the start position to resume
      rs.stage = null
    } else if (["arming", "counting"].includes(rs.status)) {
      rs.status = "paused"
      pauseStartRef.current = Date.now()
    }
    syncDisplay()
  }

  const stopWorkout = () => {
    if (window.confirm("End this workout and save your progress?")) {
      finish("stopped")
    }
  }

  const goBack = () => {
    if (phase === "tracking") {
      if (savedRef.current) {
        navigate("/patient")
        return
      }
      if (rsRef.current.currentReps > 0) {
        stopWorkout()
      } else if (window.confirm("Quit this workout?")) {
        navigate("/patient")
      }
    } else {
      navigate("/patient")
    }
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                               */
  /* ------------------------------------------------------------------ */

  const exCfg = EXERCISES[exercise]

  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-[var(--color-canvas)]">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {/* Top bar */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => navigate("/patient")}
              className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex items-center gap-2 font-display text-[15px] font-semibold text-slate-900">
              <Dumbbell className="h-4 w-4 text-[var(--color-primary)]" />
              Set up your workout
            </div>
            <span className="w-12" />
          </div>

          <div className="space-y-6">
            {/* Exercise picker */}
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-700">
                Exercise
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {EXERCISE_NAMES.map((name) => {
                  const cfg = EXERCISES[name]
                  const selected = name === exercise
                  return (
                    <button
                      key={name}
                      onClick={() => setExercise(name)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        selected
                          ? "border-[color-mix(in_srgb,var(--color-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_7%,white)] ring-1 ring-[color-mix(in_srgb,var(--color-primary)_25%,transparent)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-input-border)] hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-[var(--color-primary)]" />
                        <span className="font-semibold text-slate-900">
                          {cfg.label}
                        </span>
                        {selected && (
                          <Badge variant="success">
                            <Check className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {cfg.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Side */}
              <Card>
                <CardContent className="pt-5">
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">
                    Side
                  </h3>
                  <div className="flex gap-2">
                    {SIDES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSide(s)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                          side === s
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                            : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-600 hover:bg-[var(--color-surface-muted)]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Target reps */}
              <Card>
                <CardContent className="pt-5">
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">
                    Target repetitions
                  </h3>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setTargetReps((r) => Math.max(1, r - 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                      aria-label="Decrease reps"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-14 text-center font-display text-3xl font-semibold text-slate-900 tabular-nums">
                      {targetReps}
                    </span>
                    <button
                      onClick={() => setTargetReps((r) => Math.min(50, r + 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                      aria-label="Increase reps"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recording consent — explicit, optional, default off */}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <input
                type="checkbox"
                checked={recordingConsent}
                onChange={(e) => setRecordingConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
              />
              <span className="text-sm">
                <span className="font-semibold text-slate-900">
                  Record this session (optional)
                </span>
                <span className="block text-xs text-slate-500">
                  A video recording of this workout will be kept locally so you
                  can review your form or share it with your clinician. Your
                  results are saved with or without it.
                </span>
              </span>
            </label>

            <Button
              size="lg"
              className="w-full gap-2"
              onClick={beginWorkout}
            >
              <Zap className="h-4 w-4" />
              Start Workout
            </Button>

            <p className="flex items-start gap-2 text-xs text-slate-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Pose tracking runs entirely in your browser. Enable your camera
              and stand ~1.5–2 m away with the tracked side clearly visible.
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* ---------------------------- tracking ---------------------------- */

  const paused = display.status === "paused"
  const live = !paused && trackerState === "ready"
  const progress = Math.min(1, display.currentReps / targetReps)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4">
        {/* Top bar */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {display.currentReps > 0 ? "End & save" : "Quit"}
          </button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize bg-white/10 text-white border-white/15">
              {exCfg.label} · {side}
            </Badge>
            {recordingStartedRef.current && (
              <Badge variant="destructive">
                <Film className="mr-1 h-3 w-3" /> REC
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-slate-300 tabular-nums">
            <Clock className="h-4 w-4" />
            {formatDuration(display.elapsedMs)}
          </div>
        </div>

        {/* Camera + overlay */}
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full opacity-0"
          />
          <canvas
            ref={canvasRef}
            className="block max-h-[60vh] w-full object-contain"
          />
          {trackerState === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60">
              <Loader className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
              <p className="text-sm text-slate-300">
                Loading pose tracker…
              </p>
            </div>
          )}
          {trackerState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 p-6 text-center">
              <Camera className="h-8 w-8 text-red-400" />
              <p className="text-sm text-[#e2e8f0]">{trackerError}</p>
              <p className="text-xs text-slate-400">
                Check your camera permissions and that the model files are
                reachable, then reload.
              </p>
            </div>
          )}
          {paused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <p className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
                Paused
              </p>
            </div>
          )}
        </div>

        {/* Status strip */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {!camera.active && (
            <span className="text-amber-300 font-medium">
              Camera lost — reconnect or restart.
            </span>
          )}
          {live && display.status === "arming" && (
            <span className="text-sky-300">
              Get into the start position to begin…
            </span>
          )}
          {live && display.status === "counting" && (
            <span className="text-emerald-300">
              {display.currentReps}/{targetReps} — keep going
            </span>
          )}
          {display.status === "completed" && (
            <span className="text-emerald-300">
              Completed! Saving…
            </span>
          )}
        </div>

        {/* Bottom panel: score + reps + controls */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* Rep counter */}
          <Card className="border-white/10 bg-[#0f1923] text-white">
            <CardContent className="pt-5 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Repetitions
              </p>
              <p className="mt-1 font-display text-4xl font-semibold tabular-nums">
                {display.currentReps}
                <span className="text-lg text-slate-500">/{targetReps}</span>
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#293548]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-200"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Live score */}
          <Card className="border-white/10 bg-[#0f1923] text-white">
            <CardContent className="pt-5">
              <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-400">
                Movement score
              </p>
              <p className="mt-1 text-center font-display text-4xl font-semibold tabular-nums text-[var(--color-accent)]">
                {display.status === "counting" ? display.currentScore : "—"}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#293548]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-150"
                  style={{ width: `${display.currentScore}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <Card className="border-white/10 bg-[#0f1923] text-white">
            <CardContent className="flex h-full items-center justify-center gap-3 pt-5">
              <Button
                variant="secondary"
                className="flex-1 gap-2 bg-white/10 text-white hover:bg-white/20 border-white/15"
                onClick={togglePause}
                disabled={display.status === "completed"}
              >
                {paused ? (
                  <>
                    <Play className="h-4 w-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={stopWorkout}
                disabled={display.status === "completed"}
              >
                <Square className="h-4 w-4" />
                End
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}