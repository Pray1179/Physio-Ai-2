import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { UserPlus } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast"
import type { Role } from "@/types"

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("patient")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError(null)
    setLoading(true)
    try {
      await signUp(email.trim(), password, displayName.trim() || "User", role)
      toast("Account created!", { variant: "success" })
      navigate(role === "doctor" ? "/doctor" : "/patient")
    } catch (err: any) {
      setError(err?.message ?? "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-slate-900">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Start tracking your rehabilitation today.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            placeholder="Your name"
            required
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
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
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 6 characters"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <Label>Account type</Label>
          <div className="mt-1.5 flex gap-2">
            {(["patient", "doctor"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  role === r
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-[var(--color-input-border)] bg-[var(--color-surface)] text-slate-600 hover:bg-[var(--color-surface-muted)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-error)_24%,transparent)] bg-[var(--color-error-bg)] px-3.5 py-2.5 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} size="lg" className="w-full gap-2">
        <UserPlus className="h-4 w-4" />
        {loading ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-[var(--color-primary)] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}