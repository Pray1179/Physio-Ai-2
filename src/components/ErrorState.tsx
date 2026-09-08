import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

/**
 * Reusable error display for failed data fetches. Shows a friendly message
 * and, when an onRetry handler is provided, a retry button that re-triggers
 * the fetch. Paired with ErrorBoundary for unexpected render errors.
 */
export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this data. Check your connection and try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-14 text-center">
      <AlertTriangle className="h-10 w-10 text-[var(--color-error)]" />
      <div>
        <h3 className="text-base font-semibold text-red-800">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-red-600">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="outline"
          className="gap-2 text-red-700 hover:bg-red-100"
          onClick={onRetry}
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  )
}
