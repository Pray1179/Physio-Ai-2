import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { Mail } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"

export function ResetPasswordPage() {
  const { resetPassword, demoMode } = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await resetPassword(email.trim())
      setSent(true)
      toast(
        demoMode
          ? "Account verified (demo mode — no email sent)"
          : "Password reset email sent",
        { variant: "success" }
      )
    } catch (err: any) {
      setError(err?.message ?? "Could not send reset email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-slate-900">
          Reset password
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          {sent
            ? "Check your inbox for a password reset link."
            : "Enter your email address and we'll send a reset link."}
        </p>
      </div>

      {!sent && (
        <>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-error)_24%,transparent)] bg-[var(--color-error-bg)] px-3.5 py-2.5 text-sm text-[var(--color-error)]">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading} size="lg" className="w-full gap-2">
            <Mail className="h-4 w-4" />
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </>
      )}

      <p className="text-center text-sm text-slate-500">
        <Link
          to="/login"
          className="font-medium text-[var(--color-primary)] hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  )
}