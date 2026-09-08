import type { SessionRecord } from "@/types";

export interface PendingResult {
  session: SessionRecord;
  /** Object URL of an optional local recording; null when none. */
  recordingUrl: string | null;
}

const KEY = "physio.pendingResult";

/**
 * Hand off the just-finished workout from WorkoutView to the SessionResult
 * page without Firebase round-trips, and survive a refresh. sessionStorage
 * holds the JSON payload; the recording object URL lives only for the
 * session, which is enough for a download.
 */
export function persistPendingResult(result: PendingResult): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(result));
  } catch {
    /* sessionStorage unavailable — the result page falls back to router state */
  }
}

/** Read and consume the pending result. */
export function readPendingResult(): PendingResult | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as PendingResult;
  } catch {
    return null;
  }
}

export function clearPendingResult(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}