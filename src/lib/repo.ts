import { isDemoMode } from "@/lib/firebase";
import type { CareAssignment, Role, SessionRecord, TherapyPlan } from "@/types";
import {
  demoAddSession,
  demoListSessions,
  demoGetSession,
  demoAddTherapyPlan,
  demoLatestTherapyPlan,
  demoGetAssignment,
  demoSetAssignment,
  demoAssignedPatientUids,
  demoDischargePatient,
  demoAllAssignments,
  demoUserByUid,
  demoUpdateUser,
  demoAllUsers,
  type DemoUserRecord,
} from "@/lib/demo";
import {
  queryCollection,
  getDocData,
  findUserByEmail,
} from "@/lib/firestore";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ------------------------------------------------------------------ */
/* Uniform API                                                           */
/* ------------------------------------------------------------------ */

/** Save or update a session. */
export async function saveSession(session: SessionRecord): Promise<void> {
  if (isDemoMode) return demoAddSession(session);
  if (!db) return;
  await setDoc(
    doc(db, "sessions", session.sessionId),
    { ...session, createdAt: session.createdAt ?? serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** List sessions, optionally filtered by patient. */
export async function listSessions(patientUid?: string): Promise<SessionRecord[]> {
  if (isDemoMode) return demoListSessions(patientUid);

  try {
    const { where, limit } = await import("firebase/firestore");
    // NOTE: orderBy is done client-side to avoid requiring a Firestore
    // composite index (where + orderBy on different fields needs one).
    const constraints: any[] = [limit(200)];
    if (patientUid) constraints.unshift(where("patientUid", "==", patientUid));
    const rows = (await queryCollection("sessions", ...constraints)) as unknown as SessionRecord[];
    // Sort newest-first client-side
    return rows.sort((a, b) =>
      String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
    );
  } catch (err) {
    console.error("[repo.listSessions]", err);
    return [];
  }
}

/** Get a single session by id. */
export async function getSession(sessionId: string): Promise<SessionRecord | null> {
  if (isDemoMode) return demoGetSession(sessionId);
  const data = await getDocData("sessions", sessionId);
  return (data as SessionRecord) ?? null;
}

/** Save or update a therapy plan. */
export async function saveTherapyPlan(plan: TherapyPlan): Promise<void> {
  if (isDemoMode) return demoAddTherapyPlan(plan);
  if (!db) return;
  await setDoc(
    doc(db, "therapyPlans", plan.planId),
    { ...plan, createdAt: plan.createdAt ?? serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** Get the latest therapy plan for a patient. */
export async function getLatestTherapyPlan(
  patientUid: string
): Promise<TherapyPlan | null> {
  if (isDemoMode) return demoLatestTherapyPlan(patientUid);

  try {
    const { where } = await import("firebase/firestore");
    const plans = (await queryCollection(
      "therapyPlans",
      where("patientUid", "==", patientUid),
    )) as unknown as TherapyPlan[];
    // Sort newest-first client-side (avoids composite-index requirement)
    plans.sort((a, b) =>
      String(b.updatedAt ?? b.createdAt ?? "").localeCompare(
        String(a.updatedAt ?? a.createdAt ?? "")
      )
    );
    return plans[0] ?? null;
  } catch (err) {
    console.error("[repo.getLatestTherapyPlan]", err);
    return null;
  }
}

/** Get the care-assignment link for a patient. */
export async function getCareAssignment(
  patientUid: string
): Promise<CareAssignment | null> {
  if (isDemoMode) return demoGetAssignment(patientUid);
  const data = await getDocData("careAssignments", patientUid);
  return (data as CareAssignment) ?? null;
}

/** Create or update a care-assignment (doctor/admin action). */
export async function saveCareAssignment(assignment: CareAssignment): Promise<void> {
  if (isDemoMode) return demoSetAssignment(assignment);
  if (!db) return;
  await setDoc(
    doc(db, "careAssignments", assignment.patientUid),
    { ...assignment, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** Remove a doctor from a patient's care assignment (discharge). */
export async function dischargePatient(
  patientUid: string,
  doctorUid: string
): Promise<void> {
  if (isDemoMode) {
    demoDischargePatient(patientUid, doctorUid);
    return;
  }
  if (!db) return;
  const existing = await getCareAssignment(patientUid);
  if (!existing) return;
  const remaining = existing.doctorUids.filter((uid) => uid !== doctorUid);
  if (remaining.length === 0) {
    // Last doctor removed — delete the assignment entirely
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "careAssignments", patientUid));
  } else {
    await saveCareAssignment({
      patientUid,
      doctorUids: remaining,
      updatedAt: new Date().toISOString(),
    });
  }
}

/** Get patient UIDs assigned to a given doctor. */
export async function assignedPatientUids(doctorUid: string): Promise<string[]> {
  if (isDemoMode) return demoAssignedPatientUids(doctorUid);

  try {
    const { where } = await import("firebase/firestore");
    const assignments = (await queryCollection(
      "careAssignments",
      where("doctorUids", "array-contains", doctorUid)
    )) as unknown as CareAssignment[];
    return assignments.map((a) => a.patientUid);
  } catch (err) {
    console.error("[repo.assignedPatientUids]", err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* User profiles                                                        */
/* ------------------------------------------------------------------ */

export interface PatientProfile {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  phoneNumber?: string;
  condition?: string;
  createdAt?: string;
}

/** Patchable profile fields (what the patient-editing UI can change). */
export interface ProfilePatch {
  displayName?: string;
  phoneNumber?: string;
  condition?: string;
}

/** Uniform profile lookup across demo + Firestore. */
export async function fetchUserProfile(uid: string): Promise<PatientProfile | null> {
  if (isDemoMode) {
    const rec = demoUserByUid(uid);
    return rec ? recordToProfile(rec) : null;
  }
  const data = await getDocData("users", uid);
  if (!data) return null;
  const d = data as unknown as PatientProfile;
  if (!d.displayName) return null;
  return d;
}

/** Merge a partial update into a user profile (demo localStorage or Firestore). */
export async function updateUserProfile(uid: string, patch: ProfilePatch): Promise<void> {
  if (isDemoMode) {
    demoUpdateUser(uid, patch);
    return;
  }
  if (!db) return;
  await setDoc(
    doc(db, "users", uid),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** All care assignments (demo dashboard offers a connect flow). */
export async function allCareAssignments(): Promise<CareAssignment[]> {
  if (isDemoMode) return demoAllAssignments();
  try {
    return (await queryCollection("careAssignments")) as unknown as CareAssignment[];
  } catch (err) {
    console.error("[repo.allCareAssignments]", err);
    return [];
  }
}

function recordToProfile(rec: DemoUserRecord): PatientProfile {
  return {
    uid: rec.uid,
    displayName: rec.displayName,
    email: rec.email,
    role: rec.role,
    phoneNumber: rec.phoneNumber,
    condition: rec.condition,
    createdAt: rec.createdAt,
  };
}

/**
 * Patient-role users the doctor may connect with. In demo mode this is every
 * registered patient who isn't already linked to a doctor, so the demo can be
 * exercised end-to-end. In production patients are provisioned by a clinic
 * admin via careAssignments — this returns [] so no self-service admission.
 */
export async function listConnectablePatients(): Promise<PatientProfile[]> {
  if (!isDemoMode) return [];

  const uids = new Set(
    (await demoAllAssignments()).map((a) => a.patientUid)
  );
  return demoAllUsers()
    .filter((u) => u.role === "patient" && !uids.has(u.uid))
    .map(recordToProfile);
}

/**
 * Search for a patient by exact email. Returns the profile if found and
 * the user is a patient, otherwise null.
 */
export async function searchPatientsByEmail(
  email: string
): Promise<PatientProfile | null> {
  if (isDemoMode) {
    const rec = demoAllUsers().find(
      (u) => u.email === email.toLowerCase().trim() && u.role === "patient"
    );
    return rec ? recordToProfile(rec) : null;
  }
  const data = await findUserByEmail(email);
  if (!data || (data as any).role !== "patient") return null;
  return data as unknown as PatientProfile;
}