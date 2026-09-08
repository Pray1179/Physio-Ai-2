import { useRef, useState, useEffect, useCallback } from "react"

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  stream: MediaStream | null
  active: boolean
  error: string | null
  facingMode: "user" | "environment"
  start: () => Promise<{ ok: boolean; error?: string }>
  stop: () => void
  flip: () => void
}

/**
 * Thin wrapper around getUserMedia that manages the video element lifecycle.
 * Calls stop() automatically on unmount.
 */
export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const streamRef = useRef<MediaStream | null>(null)

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setStream(null)
    setActive(false)
  }, [])

  const start = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    cleanup()
    setError(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      streamRef.current = mediaStream
      setStream(mediaStream)
      setActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
      }
      return { ok: true }
    } catch (err: any) {
      setError(err?.message ?? "Camera permission denied")
      setActive(false)
      return { ok: false, error: err?.message ?? "Camera permission denied" }
    }
  }, [facingMode, cleanup])

  const stop = useCallback(() => {
    cleanup()
  }, [cleanup])

  const flip = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }, [])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return { videoRef, stream, active, error, facingMode, start, stop, flip }
}