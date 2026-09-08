import { Component, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error)
  }

  render() {
    if (!this.state.error) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <div>
          <h3 className="text-base font-semibold text-red-800">Something went wrong</h3>
          <p className="mt-1 text-sm text-red-600">
            {this.state.error.message || "An unexpected error occurred."}
          </p>
        </div>
        <button
          onClick={() => this.setState({ error: null })}
          className="rounded-lg border border-red-300 bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          Try again
        </button>
      </div>
    )
  }
}