import type { CareAssignment, SessionRecord, TherapyPlan } from "@/types";

/**
 * Demo-mode data layer.
 *
 * Mirrors the Firestore collections in localStorage so the app works
 * end-to-end without a Firebase project. It only persists data the user
 * actually creates — it never seeds fabricated patients, sessions or
 * sensors. Every screen shows the "Demo mode" badge so no-one mistakes
 * local-only data for a live backend.
 */

const KEY = {
  sessions: "physioai_sessions",
  plans: "physioai_therapy_plans",
  assignments: "physioai_care_assignments",
} as const;

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, rows: T[]) {
  localStorage.setItem(key, JSON.stringify(rows));
}

/* --- Sessions --------------------------------------------------------- */

export async function demoAddSession(session: SessionRecord): Promise<void> {
  const rows = read<SessionRecord>(KEY.sessions);
  const existingIndex = rows.findIndex((r) => r.sessionId === session.sessionId);
  if (existingIndex >= 0) rows[existingIndex] = session;
  else rows.unshift(session); // newest first
  write(KEY.sessions, rows);
}

export async function demoListSessions(patientUid?: string): Promise<SessionRecord[]> {
  const rows = read<SessionRecord>(KEY.sessions);
  const filtered = patientUid
    ? rows.filter((r) => r.patientUid === patientUid)
    : rows;
  return [...filtered].sort((a, b) =>
    String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))
  ).reverse();
}

export async function demoGetSession(sessionId: string): Promise<SessionRecord | null> {
  const rows = read<SessionRecord>(KEY.sessions);
  return rows.find((r) => r.sessionId === sessionId) ?? null;
}

/* --- Therapy plans ---------------------------------------------------- */

export async function demoAddTherapyPlan(plan: TherapyPlan): Promise<void> {
  const rows = read<TherapyPlan>(KEY.plans);
  const existingIndex = rows.findIndex((r) => r.planId === plan.planId);
  if (existingIndex >= 0) rows[existingIndex] = plan;
  else rows.push(plan);
  write(KEY.plans, rows);
}

/** Latest therapy plan for a patient (most recently updated wins). */
export async function demoLatestTherapyPlan(patientUid: string): Promise<TherapyPlan | null> {
  const rows = read<TherapyPlan>(KEY.plans).filter((p) => p.patientUid === patientUid);
  if (rows.length === 0) return null;
  return rows.sort((a, b) =>
    String(b.updatedAt ?? b.createdAt ?? "").localeCompare(
      String(a.updatedAt ?? a.createdAt ?? "")
    )
  )[0];
}

/* --- Care assignments -------------------------------------------------- */

export async function demoGetAssignment(patientUid: string): Promise<CareAssignment | null> {
  const rows = read<CareAssignment>(KEY.assignments);
  return rows.find((r) => r.patientUid === patientUid) ?? null;
}

export async function demoSetAssignment(assignment: CareAssignment): Promise<void> {
  const rows = read<CareAssignment>(KEY.assignments);
  const existingIndex = rows.findIndex((r) => r.patientUid === assignment.patientUid);
  if (existingIndex >= 0) rows[existingIndex] = assignment;
  else rows.push(assignment);
  write(KEY.assignments, rows);
}

/** Patients assigned to a doctor (list of patientUids). */
export async function demoAssignedPatientUids(doctorUid: string): Promise<string[]> {
  const rows = read<CareAssignment>(KEY.assignments);
  return rows.filter((r) => r.doctorUids.includes(doctorUid)).map((r) => r.patientUid);
}

/** Remove a doctor from a patient's care assignment (demo mode). */
export function demoDischargePatient(patientUid: string, doctorUid: string): void {
  const rows = read<CareAssignment>(KEY.assignments);
  const idx = rows.findIndex((r) => r.patientUid === patientUid);
  if (idx < 0) return;
  const remaining = rows[idx].doctorUids.filter((uid) => uid !== doctorUid);
  if (remaining.length === 0) {
    rows.splice(idx, 1);
  } else {
    rows[idx].doctorUids = remaining;
  }
  write(KEY.assignments, rows);
}

/** All care assignments (demo doctor dashboard uses this to offer connections). */
export async function demoAllAssignments(): Promise<CareAssignment[]> {
  return read<CareAssignment>(KEY.assignments);
}

/* --- Users (shared with useAuth) --------------------------------------- */

/** Canonical localStorage key for demo users. Shared with useAuth. */
export const DEMO_USERS_KEY = "physioai_demo_users";

export interface DemoUserRecord {
  uid: string;
  displayName: string;
  email: string;
  role: "patient" | "doctor";
  password: string;
  /** Patient-editable profile fields (see UserProfile) */
  phoneNumber?: string;
  condition?: string;
  createdAt?: string;
}

export function demoAllUsers(): DemoUserRecord[] {
  try {
    const raw = localStorage.getItem(DEMO_USERS_KEY);
    if (!raw) return [];
    return Object.values(JSON.parse(raw) as Record<string, DemoUserRecord>);
  } catch {
    return [];
  }
}

export function demoUserByUid(uid: string): DemoUserRecord | null {
  return demoAllUsers().find((u) => u.uid === uid) ?? null;
}

export function demoUserByEmail(email: string): DemoUserRecord | null {
  return (
    demoAllUsers().find((u) => u.email.toLowerCase() === email.toLowerCase()) ??
    null
  );
}

export function demoUpsertUser(rec: DemoUserRecord): void {
  try {
    const raw = localStorage.getItem(DEMO_USERS_KEY);
    const users = raw ? (JSON.parse(raw) as Record<string, DemoUserRecord>) : {};
    users[rec.email.toLowerCase()] = rec;
    localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
  } catch {
    // storage full or JSON error — ignore in demo mode
  }
}

/**
 * Merge a partial update into an existing demo user, looked up by uid.
 * Safe no-op when the user doesn't exist yet.
 */
export function demoUpdateUser(
  uid: string,
  patch: Partial<Pick<DemoUserRecord, "displayName" | "phoneNumber" | "condition">>
): void {
  try {
    const raw = localStorage.getItem(DEMO_USERS_KEY);
    const users = raw ? (JSON.parse(raw) as Record<string, DemoUserRecord>) : {};
    const entry = Object.values(users).find((u) => u.uid === uid);
    if (!entry) return;
    if (patch.displayName !== undefined) entry.displayName = patch.displayName;
    if (patch.phoneNumber !== undefined) entry.phoneNumber = patch.phoneNumber;
    if (patch.condition !== undefined) entry.condition = patch.condition;
    users[entry.email.toLowerCase()] = entry;
    localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
  } catch {
    // ignore in demo mode
  }
}