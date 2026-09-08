import { Outlet, Link } from "react-router-dom"
import { Dumbbell, Activity, TrendingUp, HeartPulse, ShieldAlert } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

/**
 * Split-screen auth: a calm navy story panel carries the brand's promise
 * (the one memorable moment), and the form sits bare on the paper ground.
 * On small screens the story collapses and the form leads.
 */
function StoryPanel() {
  const notes = [
    {
      icon: Activity,
      title: "Live pose guidance",
      text: "Real-time tracking watches your form as you work.",
    },
    {
      icon: TrendingUp,
      title: "Progress that sticks",
      text: "Scores, history, and therapy plans in one place.",
    },
    {
      icon: HeartPulse,
      title: "Care that connects",
      text: "Patients and clinicians see the same picture.",
    },
  ]

  return (
    <div className="relative hidden overflow-hidden lg:block">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(90rem 48rem at 88% -10%, rgba(20,184,166,0.28), transparent 55%), radial-gradient(60rem 36rem at -10% 110%, rgba(14,141,125,0.22), transparent 60%), #0d1f2b",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1.3px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="relative flex h-full flex-col justify-between p-12">
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] text-white shadow-[0_2px_10px_rgba(20,184,166,0.4)]">
              <Dumbbell className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-white">
              PhysioAI
            </span>
          </Link>
        </div>

        <div className="max-w-md">
          <h1 className="text-[2.5rem] font-semibold leading-[1.1] tracking-tight text-white">
            Rediscover what your body can do.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            PhysioAI watches your form, counts each rep, and shows your
            progress — so rehab stays on track between clinic visits.
          </p>

          <ul className="mt-10 space-y-5">
            {notes.map((note) => (
              <li key={note.title} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[var(--color-accent)]">
                  <note.icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{note.title}</p>
                  <p className="mt-0.5 text-sm text-slate-400">{note.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-500">
          Rehabilitation tracking prototype — not a validated clinical tool.
        </p>
      </div>
    </div>
  )
}

function FormPanel() {
  const { demoMode } = useAuth()

  return (
    <div className="relative flex items-center justify-center px-4 py-12 sm:px-8 lg:py-16">
      <div className="w-full max-w-sm">
        {/* Demo-mode banner */}
        {demoMode && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-warning)_28%,transparent)] bg-[var(--color-warning-bg)] px-4 py-3 text-sm text-[var(--color-warning)]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="font-semibold">Demo mode.</span> No cloud is
              configured, so your data is stored locally in this browser only.
            </span>
          </div>
        )}

        <Outlet />
      </div>
    </div>
  )
}

export function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-[var(--color-canvas)] lg:grid-cols-[1.05fr_1fr]">
      <StoryPanel />
      <FormPanel />
    </div>
  )
}