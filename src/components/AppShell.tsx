import { useState } from "react"
import { NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  History,
  Users,
  LogOut,
  Dumbbell,
  Menu,
  X,
  ShieldAlert,
  UserCircle,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"
import { cn } from "@/lib/utils"

function NavItems() {
  const { user } = useAuth()
  if (!user) return null

  const items =
    user.role === "doctor"
      ? [{ to: "/doctor", label: "Patients", icon: Users }]
      : [
          { to: "/patient", label: "Dashboard", icon: LayoutDashboard, end: true },
          { to: "/patient/history", label: "History", icon: History },
          { to: "/patient/profile", label: "Profile", icon: UserCircle },
        ]

  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={"end" in item ? item.end : undefined}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-[var(--color-surface)] text-slate-900 shadow-[0_1px_2px_rgba(19,43,58,0.08)]"
                : "text-slate-500 hover:bg-[var(--color-surface)] hover:text-slate-900"
            )
          }
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </>
  )
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] text-white shadow-[0_2px_6px_rgba(14,141,125,0.35)]">
        <Dumbbell className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="hidden text-lg font-semibold tracking-tight text-slate-900 sm:block font-display">
        PhysioAI
      </span>
    </Link>
  )
}

function UserMenu() {
  const { user, signOut, demoMode } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  return (
    <div className="flex items-center gap-3">
      {demoMode && (
        <span className="hidden items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-warning)_28%,transparent)] bg-[var(--color-warning-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-warning)] sm:inline-flex">
          <ShieldAlert className="h-3 w-3" />
          Demo mode
        </span>
      )}
      <div className="hidden flex-col items-end sm:flex">
        <span className="text-sm font-medium text-slate-900">{user.displayName}</span>
        <span className="text-xs text-slate-400">{user.email}</span>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] text-sm font-semibold text-[var(--color-primary)]">
        {user.displayName.charAt(0).toUpperCase()}
      </div>
      <ThemeToggle />
      <Button
        variant="ghost"
        size="icon"
        onClick={async () => {
          await signOut()
          navigate("/login")
        }}
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}

/**
 * Shared app layout: frosted top bar with a segmented nav on desktop, a
 * slide-over on mobile. Content sits on the paper ground; the header stays
 * quiet so each screen's one teal moment reads clearly.
 */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-[var(--color-canvas)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Brand />
          </div>
          <nav className="hidden items-center gap-0.5 rounded-xl bg-slate-100/70 p-1 lg:flex">
            <NavItems />
          </nav>
          <UserMenu />
        </div>
      </header>

      {/* Mobile slide-over */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-68 max-w-[85vw] flex-col gap-2 border-r border-slate-200 bg-[var(--color-canvas)] p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <Brand />
              <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)} aria-label="Close navigation">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div onClick={() => setMenuOpen(false)} className="flex flex-col gap-1">
              <NavItems />
            </div>
          </div>
        </div>
      )}

      <main key={pathname} className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}