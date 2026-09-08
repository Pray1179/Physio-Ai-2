import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  serverTimestamp,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CareAssignment } from "@/types";

/**
 * Guard: all Firestore helpers require Firebase to be configured.
 * Returns null when in demo mode — the demo layer handles those cases.
 */
/**
 * Get a document by path (null if missing)
 */
export async function getDocData(path: string, id: string) {
  if (!db) return null;
  const ref = doc(db, path, id);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/**
 * Set a document (merge by default)
 */
export async function setDocData(
  path: string,
  id: string,
  data: DocumentData
) {
  if (!db) return;
  const ref = doc(db, path, id);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Add a document under an auto-generated ID, returns the ID
 */
export async function addDocData(path: string, data: DocumentData) {
  if (!db) throw new Error("Firebase not configured");
  const ref = collection(db, path);
  return addDoc(ref, { ...data, createdAt: serverTimestamp() });
}

/**
 * Update a document (merge)
 */
export async function updateDocData(path: string, id: string, data: DocumentData) {
  if (!db) return;
  const ref = doc(db, path, id);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
}

/**
 * Delete a document
 */
export async function deleteDocData(path: string, id: string) {
  if (!db) return;
  const ref = doc(db, path, id);
  await deleteDoc(ref);
}

/**
 * Query a collection with constraints. Returns array of { id, ...data }.
 */
export async function queryCollection(
  path: string,
  ...constraints: QueryConstraint[]
) {
  if (!db) return [];
  const ref = collection(db, path);
  const snap = await getDocs(query(ref, ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get all documents in a collection
 */
export async function getCollection(path: string, maxLimit = 100) {
  return queryCollection(path, limit(maxLimit));
}

/**
 * Primary error path used by views — wraps any Firestore call and returns
 * a typed result so the UI can distinguish "no data" from "broken".
 */
export async function safeQuery<T extends DocumentData>(
  loader: () => Promise<T[]>
): Promise<{ data: T[]; error: string | null }> {
  try {
    const data = await loader();
    return { data, error: null };
  } catch (e) {
    return { data: [], error: e instanceof Error ? e.message : "Query failed" };
  }
}

// --- Convenience helpers for the app's collections ---------------------------

/** users/{uid} profile */
export const getUserProfile = (uid: string) => getDocData("users", uid);

/** careAssignments/{patientUid} */
export const getCareAssignment = (patientUid: string) =>
  getDocData("careAssignments", patientUid) as Promise<CareAssignment | null>;

/** sessions/{sessionId} */
export const getSession = (sessionId: string) => getDocData("sessions", sessionId);

/** therapyPlans/{planId} */
export const getTherapyPlan = (planId: string) => getDocData("therapyPlans", planId);

/**
 * Find a user by exact email (case-insensitive via lowercase-normalised field).
 * Returns the first match or null.
 */
export async function findUserByEmail(email: string) {
  const results = await queryCollection(
    "users",
    where("email", "==", email.toLowerCase().trim())
  );
  return results.length > 0 ? results[0] : null;
}