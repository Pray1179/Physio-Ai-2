import { useCallback, useEffect, useRef, useState } from "react"
import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision"
import { calculateAngle } from "@/lib/exercises"
import type { PoseSample } from "@/lib/exercises"
import type { Side } from "@/types"

/* ------------------------------------------------------------------ */
/* Resources (local-first, CDN fallback)                                */
/* ------------------------------------------------------------------ */

const MEDIAPIPE_VERSION = "0.10.14"

/** Bundled WASM runtime (copied by `npm run setup:assets`). */
const WASM_DIR = `${import.meta.env.BASE_URL}mediapipe`
/** Model file (copied by `npm run setup:assets`). */
const MODEL_PATH = `${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`

const WASM_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
const MODEL_CDN =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"

/* ------------------------------------------------------------------ */
/* Landmark index mapping (33-keypoint COCO-ish human pose model)       */
/* ------------------------------------------------------------------ */

const JOINT_INDEX: Record<string, Record<Side, number>> = {
  shoulder: { left: 11, right: 12 },
  elbow: { left: 13, right: 14 },
  wrist: { left: 15, right: 16 },
  hip: { left: 23, right: 24 },
  knee: { left: 25, right: 26 },
  ankle: { left: 27, right: 28 },
}

const VISIBILITY_THRESHOLD = 0.5

export type PoseTrackerStatus = "idle" | "loading" | "ready" | "error"

/**
 * Loads the Pose Landmarker once, lazily, and exposes a `detect()` that turns
 * a single video frame into the PoseSample the rep-counting state machine
 * consumes. Tries the locally-copied WASM + model first, then falls back to
 * the CDN copies so the app works even before `npm run setup:assets` is run.
 */
export function usePoseTracker() {
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const [status, setStatus] = useState<PoseTrackerStatus>("idle")
  const [error, setError] = useState<string | null>(null)

  const init = useCallback(async () => {
    if (landmarkerRef.current) {
      setStatus("ready")
      return
    }
    setStatus("loading")
    setError(null)

    let vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | null =
      null
    let catchErr: unknown = null

    // Local WASM first, then CDN.
    for (const wasmUrl of [WASM_DIR, WASM_CDN]) {
      try {
        vision = await FilesetResolver.forVisionTasks(wasmUrl)
        break
      } catch (err) {
        catchErr = err
      }
    }
    if (!vision) throw catchErr

    // Local model first, then CDN.
    const modelSource = await pickModelSource()
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelSource,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    })
    landmarkerRef.current = landmarker
    setStatus("ready")
  }, [])

  useEffect(() => {
    return () => {
      landmarkerRef.current?.close()
      landmarkerRef.current = null
    }
  }, [])

  const detect = useCallback(
    (video: HTMLVideoElement, joints: string[], side: Side): PoseSample | null => {
      const landmarker = landmarkerRef.current
      if (!landmarker || !video.videoWidth) return null
      try {
        const result = landmarker.detectForVideo(video, performance.now())
        const pose = result.landmarks?.[0]
        if (!pose || pose.length === 0) return null

        const w = video.videoWidth
        const h = video.videoHeight

        const get = (name: string): NormalizedLandmark | undefined => {
          const idx = JOINT_INDEX[name]?.[side]
          return idx === undefined ? undefined : pose[idx]
        }

        const [ja, jb, jc] = joints
        const a = get(ja)
        const b = get(jb)
        const c = get(jc)
        if (!a || !b || !c) return null

        // Real pixel-space geometry (mirred coords handled by the overlay).
        const pa = { x: a.x * w, y: a.y * h }
        const pb = { x: b.x * w, y: b.y * h }
        const pc = { x: c.x * w, y: c.y * h }

        const visibilities = [a, b, c].map((lm) => {
          const v = lm.visibility ?? 0
          return v >= VISIBILITY_THRESHOLD
        })

        const normA = { x: a.x, y: a.y }
        const normB = { x: b.x, y: b.y }
        const normC = { x: c.x, y: c.y }

        return {
          angle: calculateAngle(pa, pb, pc),
          visible: visibilities.every(Boolean),
          a: normA,
          b: normB,
          c: normC,
        }
      } catch {
        return null
      }
    },
    []
  )

  return { status, error, init, detect }
}

/** Prefer the locally-copied model; fall back to the CDN model. */
async function pickModelSource(): Promise<string> {
  try {
    const res = await fetch(MODEL_PATH, { method: "HEAD" })
    if (res.ok) return MODEL_PATH
  } catch {
    /* fall through */
  }
  return MODEL_CDN
}