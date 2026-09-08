export type Role = 'patient' | 'doctor';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  /** Patient-editable fields (set on profile page; null for doctors) */
  phoneNumber?: string;
  condition?: string;
  createdAt?: any;
}

export type Side = 'left' | 'right';

export type ExerciseName =
  | 'bicep_curls'
  | 'squats'
  | 'shoulder_press'
  | 'lateral_raises';

export type SessionStatus =
  | 'completed'
  | 'stopped'
  | 'interrupted'
  | 'error';

export interface SessionRecord {
  sessionId: string;
  patientUid: string;
  exercise: ExerciseName;
  side: Side;
  targetReps: number;
  actualReps: number;
  score: number | null;
  scoreMethod: string;
  status: SessionStatus;
  durationSeconds: number;
  createdAt?: any;
  recordingPath: string | null;
  recordingState: 'none' | 'local' | 'uploading' | 'uploaded' | 'failed';
}

export interface TherapyPlan {
  planId: string;
  patientUid: string;
  doctorUid: string;
  /** Free-text legacy / fallback — generated from structured fields when present. */
  planText: string;
  notes: string;
  /** Structured prescription fields (all optional for backward compat). */
  exercise?: ExerciseName;
  targetReps?: number;
  sets?: number;
  /** Times per day the patient should do the exercise. */
  frequencyPerDay?: number;
  /** Side to exercise, or 'both'. */
  side?: Side | 'both';
  createdAt?: any;
  updatedAt?: any;
}

export interface CareAssignment {
  patientUid: string;
  doctorUids: string[];
  updatedAt?: any;
}

export interface ExerciseConfig {
  name: ExerciseName;
  label: string;
  description: string;
  joints: [string, string, string]; // [a, vertex(b), c]
  scoreFormula: 'elbow' | 'knee' | 'shoulder' | 'hip';
  /** Clamp range for the /100 movement-score mapping */
  range: [number, number];
  /**
   * Threshold that "arms" the cycle.
   * - armBelow=false (flexion): arm when angle >= armAngle (extended/standing)
   * - armBelow=true  (raising): arm when score <= armAngle (relaxed position)
   */
  armAngle: number;
  /** score that marks the rep peak */
  countScore: number;
  /** score required to "return"/reset into the valley before the next rep */
  resetScore: number;
  /** true = score increases as angle increases (raising); false = score increases as angle decreases (flexion) */
  armBelow: boolean;
  /**
   * true = the peak additionally requires a positional gate beyond the score
   * (e.g. shoulder press checks the wrist is raised above the shoulder).
   */
  overheadGate?: boolean;
}

/** Persistent workout state machine record (see lib/exercises.ts) */
export interface WorkoutState {
  exercise: ExerciseName | null;
  side: Side;
  targetReps: number;
  currentReps: number;
  /** Rounded live movement score (cleared when tracking is lost/paused) */
  currentScore: number;
  status: WorkoutStatus;
  /** Phase within a count: 'down' valley → 'up' peak → return */
  stage: 'down' | 'up' | null;
  /** Raw movement scores captured at each counted rep peak */
  scoreHistory: number[];
  /** epoch ms when the workout started (first Start), null before */
  startTime: number | null;
  /** accumulated paused milliseconds */
  pausedMs: number;
}

export type WorkoutStatus =
  | 'idle'
  | 'arming'
  | 'counting'
  | 'paused'
  | 'completed'
  | 'stopped'
  | 'interrupted';

export const EXERCISE_NAMES: ExerciseName[] = [
  "bicep_curls",
  "squats",
  "shoulder_press",
  "lateral_raises",
];

export const EXERCISES: Record<ExerciseName, ExerciseConfig> = {
  bicep_curls: {
    name: 'bicep_curls',
    label: 'Bicep Curls',
    description: 'Curl the weight from full extension to a flexed elbow.',
    joints: ['shoulder', 'elbow', 'wrist'],
    scoreFormula: 'elbow',
    range: [30, 160],
    armAngle: 150,
    countScore: 90,
    resetScore: 150,
    armBelow: false,
  },
  squats: {
    name: 'squats',
    label: 'Squats',
    description: 'Bend your knees into a squat and return to standing.',
    joints: ['hip', 'knee', 'ankle'],
    scoreFormula: 'knee',
    range: [90, 170],
    armAngle: 160,
    countScore: 90,
    resetScore: 160,
    armBelow: false,
  },
  shoulder_press: {
    name: 'shoulder_press',
    label: 'Shoulder Press',
    description: 'Press the weight overhead from shoulder height.',
    joints: ['shoulder', 'elbow', 'wrist'],
    scoreFormula: 'elbow',
    range: [90, 170],
    armAngle: 15,
    countScore: 90,
    resetScore: 50,
    armBelow: true,
    overheadGate: true,
  },
  lateral_raises: {
    name: 'lateral_raises',
    label: 'Lateral Raises',
    description: 'Raise your arms out to the sides to shoulder height.',
    joints: ['hip', 'shoulder', 'elbow'],
    scoreFormula: 'shoulder',
    range: [10, 90],
    armAngle: 15,
    countScore: 90,
    resetScore: 50,
    armBelow: true,
  },
};
