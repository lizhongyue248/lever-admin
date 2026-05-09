import { AlertCircle, CheckCircle2, Info } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

type MessageTone = "info" | "success" | "error"

const icons = {
  error: AlertCircle,
  info: Info,
  success: CheckCircle2
}

export const AuthMessage = ({ className, message, title, tone = "info" }: { className?: string; message: string; title: string; tone?: MessageTone }) => {
  const Icon = icons[tone]

  return (
    <Alert
      className={cn(
        "grid-cols-[auto_1fr] rounded-md",
        tone === "info" && "border-primary/40 bg-accent text-accent-foreground",
        tone === "success" && "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
        tone === "error" && "border-destructive/40 bg-destructive/10 text-destructive",
        className
      )}
    >
      <Icon className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
