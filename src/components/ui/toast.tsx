import * as React from "react"
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastVariant = "default" | "success" | "error" | "info"

interface ToastData {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (title: string, opts?: { description?: string; variant?: ToastVariant }) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within a ToastProvider")
  return ctx
}

const ICONS: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="h-4 w-4 text-slate-500" />,
  success: <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />,
  error: <AlertCircle className="h-4 w-4 text-[var(--color-error)]" />,
  info: <Info className="h-4 w-4 text-[var(--color-info)]" />,
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = React.useCallback(
    (title: string, opts?: { description?: string; variant?: ToastVariant }) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev, { id, title, description: opts?.description, variant: opts?.variant ?? "default" }])
      window.setTimeout(() => dismiss(id), 5000)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border bg-[var(--color-surface)] p-4 shadow-lg animate-in fade-in-0 slide-in-from-bottom-2",
              t.variant === "error" && "border-red-200",
              t.variant === "success" && "border-green-200",
              t.variant === "info" && "border-blue-200"
            )}
            role="status"
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.variant]}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-sm text-slate-500">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}