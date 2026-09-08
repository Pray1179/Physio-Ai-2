import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage, isDemoMode } from "@/lib/firebase"

/**
 * Upload a recording blob to Firebase Storage.
 * Path: recordings/{patientUid}/{sessionId}.webm
 * Returns the storage path on success, or null in demo mode / on failure.
 */
export async function uploadRecording(
  patientUid: string,
  sessionId: string,
  blob: Blob
): Promise<string | null> {
  if (isDemoMode || !storage) return null
  const path = `recordings/${patientUid}/${sessionId}.webm`
  const r = ref(storage, path)
  await uploadBytes(r, blob)
  return path
}

/**
 * Fetch a signed download URL for a stored recording (valid ~15 min).
 * Returns null in demo mode.
 */
export async function getRecordingUrl(path: string): Promise<string | null> {
  if (isDemoMode || !storage) return null
  const r = ref(storage, path)
  return getDownloadURL(r)
}
