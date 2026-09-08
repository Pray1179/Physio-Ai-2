import { useEffect, useState, type FormEvent } from "react"
import { FileText, Send, Plus, Dumbbell } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { saveTherapyPlan } from "@/lib/repo"
import type { TherapyPlan, ExerciseName, Side } from "@/types"
import { EXERCISES, EXERCISE_NAMES } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

function timeSince(dateStr: string | undefined): string {
  if (!dateStr) return "Never"
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  return `${days} days ago`
}

/** Generate a human-readable planText from structured fields. */
function buildPlanText(
  exercise: ExerciseName | "",
  side: Side | "both",
  targetReps: number,
  sets: number,
  frequencyPerDay: number
): string {
  if (!exercise) return ""
  const label = EXERCISES[exercise].label
  const sideStr = side === "both" ? "both sides" : `${side} side`
  const reps = targetReps * sets
  return `${label} (${sideStr}) — ${sets} sets × ${targetReps} reps = ${reps} total reps, ${frequencyPerDay}× per day`
}

interface PrescriptionFormProps {
  patientUid: string
  doctorUid: string
  existing?: TherapyPlan | null
  onSaved?: () => void
}

/**
 * Structured therapy-plan editor. Lets the doctor pick an exercise, reps,
 * sets, frequency and notes. A readable planText is generated automatically.
 * A "New prescription" button at the top resets the form for a fresh plan.
 */
export function PrescriptionForm({
  patientUid,
  doctorUid,
  existing,
  onSaved,
}: PrescriptionFormProps) {
  const { toast } = useToast()
  const [exercise, setExercise] = useState<ExerciseName | "">(
    existing?.exercise ?? ""
  )
  const [side, setSide] = useState<Side | "both">(existing?.side ?? "both")
  const [targetReps, setTargetReps] = useState(existing?.targetReps ?? 10)
  const [sets, setSets] = useState(existing?.sets ?? 3)
  const [frequencyPerDay, setFrequencyPerDay] = useState(existing?.frequencyPerDay ?? 2)
  const [notes, setNotes] = useState(existing?.notes ?? "")
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    setExercise(existing?.exercise ?? "")
    setSide(existing?.side ?? "both")
    setTargetReps(existing?.targetReps ?? 10)
    setSets(existing?.sets ?? 3)
    setFrequencyPerDay(existing?.frequencyPerDay ?? 2)
    setNotes(existing?.notes ?? "")
    setIsNew(false)
  }, [existing])

  const resetForm = () => {
    setExercise("")
    setSide("both")
    setTargetReps(10)
    setSets(3)
    setFrequencyPerDay(2)
    setNotes("")
    setIsNew(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!exercise) {
      toast("Please select an exercise", { variant: "error" })
      return
    }
    setSaving(true)
    const planText = buildPlanText(exercise, side, targetReps, sets, frequencyPerDay)
    const plan: TherapyPlan = {
      planId: isNew ? `plan_${Date.now().toString(36)}` : (existing?.planId ?? `plan_${Date.now().toString(36)}`),
      patientUid,
      doctorUid,
      planText,
      notes: notes.trim(),
      exercise: exercise as ExerciseName,
      targetReps,
      sets,
      frequencyPerDay,
      side,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    try {
      await saveTherapyPlan(plan)
      toast("Therapy plan saved", {
        description: "The patient will see it on their dashboard.",
        variant: "success",
      })
      setIsNew(false)
      onSaved?.()
    } catch {
      toast("Could not save the plan", { variant: "error" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--color-primary)]" />
            {existing && !isNew ? "Current Plan" : "New Prescription"}
          </CardTitle>
          {existing && !isNew && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-[var(--color-primary)]"
              onClick={resetForm}
            >
              <Plus className="h-3.5 w-3.5" /> New prescription
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {existing && !isNew && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-[var(--color-surface-muted)] p-4 text-sm leading-relaxed text-slate-700">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <Dumbbell className="h-4 w-4 text-[var(--color-primary)]" />
              {existing.exercise
                ? `${EXERCISES[existing.exercise].label} (${existing.side === "both" ? "both sides" : existing.side})`
                : "—"}
            </div>
            <p className="mt-1 text-slate-600">{existing.planText}</p>
            {existing.notes && (
              <p className="mt-2 text-xs text-slate-500">
                <span className="font-medium">Notes:</span> {existing.notes}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Updated {timeSince(existing.updatedAt)}
            </p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {/* Exercise picker */}
          <div className="space-y-1.5">
            <Label>Exercise</Label>
            <div className="grid grid-cols-2 gap-2">
              {EXERCISE_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setExercise(name)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                    exercise === name
                      ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_7%,white)] text-[var(--color-primary)]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {EXERCISES[name].label}
                </button>
              ))}
            </div>
          </div>

          {/* Side */}
          <div className="space-y-1.5">
            <Label>Side</Label>
            <div className="flex gap-2">
              {(["left", "right", "both"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    side === s
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Reps / Sets / Frequency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Reps / set</Label>
              <input
                type="number"
                min={1}
                max={50}
                value={targetReps}
                onChange={(e) => setTargetReps(Number(e.target.value) || 1)}
                className="h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 text-center text-sm font-medium outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sets</Label>
              <input
                type="number"
                min={1}
                max={10}
                value={sets}
                onChange={(e) => setSets(Number(e.target.value) || 1)}
                className="h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 text-center text-sm font-medium outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Times / day</Label>
              <input
                type="number"
                min={1}
                max={10}
                value={frequencyPerDay}
                onChange={(e) =>
                  setFrequencyPerDay(Number(e.target.value) || 1)
                }
                className="h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 text-center text-sm font-medium outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* Live preview */}
          {exercise && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              {buildPlanText(exercise, side, targetReps, sets, frequencyPerDay)}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="plan-notes">Clinician notes</Label>
            <Textarea
              id="plan-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Progress notes, precautions, follow-up date…"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            {isNew && existing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsNew(false)}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={saving} className="gap-2">
              <Send className="h-4 w-4" />
              {saving ? "Saving…" : isNew ? "Issue prescription" : "Update plan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
