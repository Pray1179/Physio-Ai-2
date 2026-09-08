import { useEffect, useState, type FormEvent } from "react"
import { Save, UserCircle, Phone, Activity, Mail } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { fetchUserProfile } from "@/lib/repo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { useToast } from "@/components/ui/toast"
import { Badge } from "@/components/ui/badge"
import { PageSkeleton } from "@/components/PageSkeleton"

export function PatientProfilePage() {
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()

  const [displayName, setDisplayName] = useState(user?.displayName ?? "")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [condition, setCondition] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hydrate the form from the persisted profile (phone/condition aren't on
  // the lean auth user object).
  useEffect(() => {
    if (!user) return
    let active = true
    fetchUserProfile(user.uid).then((profile) => {
      if (!active) return
      if (profile) {
        setDisplayName(profile.displayName)
        setPhoneNumber(profile.phoneNumber ?? "")
        setCondition(profile.condition ?? "")
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [user])

  if (loading) return <PageSkeleton />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        condition: condition.trim() || undefined,
      })
      toast("Profile updated!", { variant: "success" })
    } catch (err: any) {
      setError(err?.message ?? "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">
          Your profile
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Update your details — your doctor sees your name and condition.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-[var(--color-primary)]" />
            Account
          </CardTitle>
          <CardDescription>
            Sign-in details. These are set at registration and can&apos;t be
            changed here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] text-lg font-semibold text-[var(--color-primary)]">
              {user?.displayName.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="font-medium text-slate-900">{user?.displayName}</p>
              <p className="flex items-center gap-1 text-sm text-slate-500">
                <Mail className="h-3.5 w-3.5" />
                {user?.email}
              </p>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-500">Role</span>
            <div className="mt-1">
              <Badge
                variant="secondary"
                className="capitalize text-[var(--color-primary)]"
              >
                {user?.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[var(--color-primary)]" />
            Details
          </CardTitle>
          <CardDescription>
            Edit the fields below and save. Changes are reflected for your
            doctor immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                placeholder="Your name"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone number</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="phoneNumber"
                  className="pl-9"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  autoComplete="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Input
                id="condition"
                placeholder="e.g. Shoulder rehab, ACL recovery"
                autoComplete="off"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-error)_24%,transparent)] bg-[var(--color-error-bg)] px-3.5 py-2.5 text-sm text-[var(--color-error)]">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !user} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
