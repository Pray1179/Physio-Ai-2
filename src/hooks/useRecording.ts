import { useCallback, useEffect, useRef, useState } from "react"

const SUPPORTED_MIME_TYPES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4",
]

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined
  return SUPPORTED_MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m))
}

/**
 * MediaRecorder wrapper. Recording is fully optional and only started when the
 * user explicitly opts in (`enabled`). Failing to record must never destroy a
 * session's results — `stop()` returns null on any failure and callers treat
 * that as "no recording".
 */
export function useRecording(stream: MediaStream | null, enabled: boolean) {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(() => {
    if (!stream || !enabled) return
    if (typeof MediaRecorder === "undefined") {
      setError("Recording isn't supported in this browser")
      return
    }
    try {
      const mime = pickMimeType()
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.start()
      recorderRef.current = rec
    } catch {
      setError("Could not start recording")
    }
  }, [stream, enabled])

  const stop = useCallback(async (): Promise<string | null> => {
    const rec = recorderRef.current
    if (!rec || rec.state === "inactive") return null
    try {
      const blob = await new Promise<Blob>((resolve) => {
        rec.onstop = () =>
          resolve(
            new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" })
          )
        rec.stop()
      })
      const url = URL.createObjectURL(blob)
      setRecordedUrl(url)
      return url
    } catch {
      return null
    }
  }, [])

  // Never leave a running recorder behind.
  useEffect(() => {
    const rec = recorderRef.current
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
    }
  }, [stream])

  return { start, stop, recordedUrl, error }
}