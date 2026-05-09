import type { ChangeEvent, ReactNode } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const FormField = ({
  autoComplete,
  autoFocus,
  children,
  disabled,
  error,
  id,
  inputMode,
  label,
  onBlur,
  onChange,
  placeholder,
  type = "text",
  value
}: {
  autoComplete?: string
  autoFocus?: boolean
  children?: ReactNode
  disabled?: boolean
  error?: string
  id: string
  inputMode?: "decimal" | "email" | "none" | "numeric" | "search" | "tel" | "text" | "url"
  label: string
  onBlur: () => void
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  value: string
}) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {children}
      </div>
      <Input
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className="h-10 bg-background dark:bg-background/50"
        disabled={disabled}
        id={id}
        inputMode={inputMode}
        onBlur={onBlur}
        onChange={handleChange}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  )
}
