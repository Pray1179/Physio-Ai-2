import type {
  ExerciseName,
  WorkoutState,
  Side,
} from "@/types";
import { EXERCISES } from "@/types";

/* ------------------------------------------------------------------ */
/* Geometry & scoring                                                    */
/* ------------------------------------------------------------------ */

export type Vec2 = { x: number; y: number };

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Angle at vertex `b` between the segments b→a and b→c, in degrees [0, 180].
 * Use pixel-space coordinates (rounded, mirrored as needed) so a rectangular
 * video does not distort the measurement.
 */
export function calculateAngle(a: Vec2, b: Vec2, c: Vec2): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const magAb = Math.hypot(abx, aby);
  const magCb = Math.hypot(cbx, cby);
  if (magAb === 0 || magCb === 0) return 0;
  const cosAngle = clamp(
    (abx * cbx + aby * cby) / (magAb * magCb),
    -1,
    1
  );
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

/** True when all three landmarks pass the visibility gate. */
export function landmarksReliable(
  a: Vec2 | undefined,
  b: Vec2 | undefined,
  c: Vec2 | undefined,
  visibilities: (boolean | undefined)[] = []
): boolean {
  if (!a || !b || !c) return false;
  return visibilities.every((v) => v !== false);
}

/**
 * Movement score (range-of-motion estimate, prototype heuristic — NOT a
 * validated form score). Mapping is 0–100 against each exercise's clamped
 * angle range:
 * - armBelow (raising): score rises as the angle opens
 * - armBelow=false (flexion): score rises as the angle closes
 */
export function scoreFor(name: ExerciseName, angle: number): number {
  const ex = EXERCISES[name];
  const [min, max] = ex.range;
  const span = max - min;
  if (span <= 0) return 0;
  const score = ex.armBelow
    ? 100 * ((angle - min) / span)
    : 100 * ((max - angle) / span);
  return clamp(score, 0, 100);
}

export function getExercise(name: ExerciseName) {
  return EXERCISES[name];
}

/* ------------------------------------------------------------------ */
/* Workout state machine                                                */
/* ------------------------------------------------------------------ */

export function createWorkoutState(
  exercise: ExerciseName | null,
  side: Side,
  targetReps: number
): WorkoutState {
  return {
    exercise,
    side,
    targetReps,
    currentReps: 0,
    currentScore: 0,
    status: "idle",
    stage: null,
    scoreHistory: [],
    startTime: null,
    pausedMs: 0,
  };
}

/**
 * A single frame's input to the state machine. angle is in degrees;
 * the a/b/c landmark positions are normalized (0..1, y down) and are
 * only used for positional gates (e.g. the shoulder-press overhead check).
 */
export interface PoseSample {
  /** Vertex angle in degrees, or null when not computable */
  angle: number | null;
  /** All three tracking joints are reliably visible */
  visible: boolean;
  a?: Vec2;
  b?: Vec2;
  c?: Vec2;
}

export interface RepUpdate {
  state: WorkoutState;
  /** true when a rep was counted on this frame */
  repCounted: boolean;
}

/** Wrist/endpoint raised above the shoulder (y grows downward). */
function wristOverhead(sample: PoseSample): boolean {
  if (!sample.a || !sample.c) return false;
  return sample.c.y < sample.a.y;
}

/**
 * Advance the rep-counting state machine one frame.
 *
 * Hysteresis / peak conventions ported from the Python source with the
 * brief's corrections:
 * - Suspended tracking (pose lost, paused, camera loss) clears live score
 *   and cannot add reps; an unfinished cycle must reacquire the start
 *   position before it counts again.
 * - Shoulder press uses the elbow angle AND requires the wrist raised
 *   above the shoulder at the peak (overhead gate).
 * - Lateral raises measure hip→shoulder→elbow (upper-arm endpoint).
 */
export function updateRepState(
  state: WorkoutState,
  sample: PoseSample | null
): RepUpdate {
  // Pose lost, paused, or explicit suspension — no counting, clear feedback.
  if (!sample || !sample.visible || sample.angle === null || state.status === "paused") {
    return { state: { ...state, currentScore: 0 }, repCounted: false };
  }

  const name = state.exercise;
  if (!name) return { state, repCounted: false };

  const ex = getExercise(name);
  const angle = sample.angle;
  const score = scoreFor(name, angle);
  const next: WorkoutState = { ...state, currentScore: Math.round(score) };
  let repCounted = false;

  switch (state.status) {
    case "idle":
    case "completed":
    case "stopped":
    case "interrupted":
      // Terminal or not-yet-started: consume frames silently.
      break;

    case "arming": {
      // Arm the cycle once the subject is back in the start position.
      const armed = ex.armBelow
        ? score <= ex.armAngle
        : angle >= ex.armAngle;
      if (armed) {
        next.status = "counting";
        next.stage = "down";
      }
      break;
    }

    case "counting": {
      // Peak detection depends on direction.
      if (state.stage === "down") {
        // Reaching the peak score marks the top of the rep.
        const peakIt =
          score >= ex.countScore &&
          (!ex.overheadGate || wristOverhead(sample));
        if (peakIt) {
          next.stage = "up";
          next.currentReps = state.currentReps + 1;
          next.scoreHistory = [...state.scoreHistory, Math.round(score)];
          repCounted = true;
          if (next.currentReps >= state.targetReps) {
            next.status = "completed";
            break;
          }
        }
      } else {
        // Returning from the peak: the subject must reacquire the start
        // position before the next rep can count (stable-return rule).
        const returned = ex.armBelow
          ? score <= ex.resetScore
          : angle >= ex.resetScore;
        if (returned) {
          next.stage = "down";
        }
      }
      break;
    }
  }

  return { state: next, repCounted };
}

/**
 * Session movement score = mean of the movement scores at each counted
 * rep peak. null (not 0) when no valid rep was counted.
 */
export function calculateSessionScore(state: WorkoutState): number | null {
  if (state.scoreHistory.length === 0) return null;
  const sum = state.scoreHistory.reduce((a, b) => a + b, 0);
  return Math.round(sum / state.scoreHistory.length);
}

export const SCORE_METHOD = "mean_score_at_counted_peaks";

/** Format an epoch-ms duration (excluding paused time) as M:SS. */
export function formatDuration(totalMs: number): string {
  const totalSec = Math.max(0, Math.round(totalMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}