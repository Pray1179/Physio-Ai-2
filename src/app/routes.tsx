import { lazy, Suspense } from "react"
import { Routes, Route, Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { PageSkeleton } from "@/components/PageSkeleton"
import { AuthLayout } from "@/features/auth/AuthLayout"
import { LoginPage } from "@/features/auth/LoginPage"
import { ChooseRolePage } from "@/features/auth/ChooseRolePage"
import { RegisterPage } from "@/features/auth/RegisterPage"
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage"
import { PatientDashboard } from "@/features/patient/PatientDashboard"
import { AppShell } from "@/components/AppShell"

/**
 * Split heavy routes (camera + MediaPipe, charts) out of the initial bundle.
 * They load only when the user actually navigates to them.
 */
const SessionHistoryPage = lazy(() =>
  import("@/features/patient/SessionHistoryPage").then((m) => ({
    default: m.SessionHistoryPage,
  }))
)
const WorkoutView = lazy(() =>
  import("@/features/workout/WorkoutView").then((m) => ({
    default: m.WorkoutView,
  }))
)
const SessionResultPage = lazy(() =>
  import("@/features/session/SessionResultPage").then((m) => ({
    default: m.SessionResultPage,
  }))
)
const DoctorDashboard = lazy(() =>
  import("@/features/doctor/DoctorDashboard").then((m) => ({
    default: m.DoctorDashboard,
  }))
)
const PatientDetailPage = lazy(() =>
  import("@/features/doctor/PatientDetailPage").then((m) => ({
    default: m.PatientDetailPage,
  }))
)
const PatientProfilePage = lazy(() =>
  import("@/features/patient/PatientProfilePage").then((m) => ({
    default: m.PatientProfilePage,
  }))
)

/**
 * Redirect signed-in users away from auth pages.
 */
function GuestRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user?.onboarding) return <Navigate to="/choose-role" replace />
  if (user) return <Navigate to={user.role === "doctor" ? "/doctor" : "/patient"} replace />
  return <Outlet />
}

/**
 * Require an authenticated user before rendering children.
 */
function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <PageSkeleton />
  if (!user) return <Navigate to="/login" replace />
  if (user.onboarding) return <Navigate to="/choose-role" replace />
  return <Outlet />
}

/**
 * Require a doctor role.
 */
function DoctorRoute() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== "doctor") return <Navigate to="/patient" replace />
  return <Outlet />
}

/**
 * Require a patient role. Blocks doctors from the patient-facing routes
 * (dashboard, history, profile) even when they navigate there directly.
 */
function PatientRoute() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === "doctor") return <Navigate to="/doctor" replace />
  return <Outlet />
}

function OnboardingRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!user.onboarding) return <Navigate to={user.role === "doctor" ? "/doctor" : "/patient"} replace />
  return <Outlet />
}

function RoleHome() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.onboarding) return <Navigate to="/choose-role" replace />
  return <Navigate to={user.role === "doctor" ? "/doctor" : "/patient"} replace />
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        {/* Auth */}
        <Route element={<GuestRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>
        </Route>

        {/* Onboarding — user signed in but has no profile doc yet */}
        <Route element={<AuthLayout />}>
          <Route element={<OnboardingRoute />}>
            <Route path="/choose-role" element={<ChooseRolePage />} />
          </Route>
        </Route>

        {/* Landing / role home */}
        <Route path="/" element={<RoleHome />} />

        {/* Protected app shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route element={<PatientRoute />}>
              <Route path="/patient" element={<PatientDashboard />} />
              <Route path="/patient/history" element={<SessionHistoryPage />} />
              <Route path="/patient/profile" element={<PatientProfilePage />} />
            </Route>

            <Route element={<DoctorRoute />}>
              <Route path="/doctor" element={<DoctorDashboard />} />
              <Route path="/doctor/patients/:patientUid" element={<PatientDetailPage />} />
            </Route>
          </Route>

          {/* Full-screen workout (no shell chrome) */}
          <Route path="/workout" element={<WorkoutView />} />
          <Route path="/session/:sessionId/result" element={<SessionResultPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}