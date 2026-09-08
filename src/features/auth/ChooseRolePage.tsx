import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import {
  UserCircle,
  Stethoscope,
  ArrowRight,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Role } from "@/types"
import { friendlyAuthError } from "./authError"

export function ChooseRolePage() {
  const { user, finishOnboarding } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState<Role | null>(null)
  const [displayName, setDisplayName] = useState(user?.displayName ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guard: not signed in → login; onboarding already complete → home
  if (!user || !user.onboarding) {
    return null // Layout guards handle redirect
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-slate-900">
          Welcome — pick your role
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          One last step. Tell us how you&apos;ll use PhysioAI so we can set
          the right dashboard for you.
        </p>
      </div>

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
        <Label>I am a…</Label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {[
            {
              value: "patient" as Role,
              label: "Patient",
              desc: "Track my exercises and recovery",
              Icon: UserCircle,
            },
            {
              value: "doctor" as Role,
              label: "Doctor",
              desc: "Manage patients and prescriptions",
              Icon: Stethoscope,
            },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRole(opt.value)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 text-center transition-colors ${
                role === opt.value
                  ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_6%,white)] text-[var(--color-primary)]"
                  : "border-[var(--color-input-border)] bg-[var(--color-surface)] text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              <opt.Icon
                className={`h-7 w-7 ${
                  role === opt.value
                    ? "text-[var(--color-primary)]"
                    : "text-slate-400"
                }`}
              />
              <span className="text-sm font-semibold">{opt.label}</span>
              <span className="text-xs leading-snug text-slate-500">
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-error)_24%,transparent)] bg-[var(--color-error-bg)] px-3.5 py-2.5 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading || !role}
        size="lg"
        className="w-full gap-2"
      >
        {loading ? "Setting up…" : "Continue"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!role) return
    setError(null)
    setLoading(true)
    try {
      await finishOnboarding(role, displayName)
      navigate(role === "doctor" ? "/doctor" : "/patient", { replace: true })
    } catch (err: any) {
      setError(friendlyAuthError(err))
    } finally {
      setLoading(false)
    }
  }
}
