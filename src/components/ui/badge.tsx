import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/*
 * Quiet, tinted-dot chips. Status variants read as soft wash + ink of the
 * same hue; the border borrows the hue at low alpha so badges sit on any
 * surface without a hard grey outline.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
        secondary: "bg-[var(--color-surface-muted)] text-slate-600",
        success:
          "bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[color-mix(in_srgb,var(--color-success)_22%,transparent)]",
        warning:
          "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[color-mix(in_srgb,var(--color-warning)_26%,transparent)]",
        destructive:
          "bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[color-mix(in_srgb,var(--color-error)_24%,transparent)]",
        info: "bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[color-mix(in_srgb,var(--color-info)_24%,transparent)]",
        outline: "border border-[var(--color-input-border)] bg-[var(--color-surface)] text-slate-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }