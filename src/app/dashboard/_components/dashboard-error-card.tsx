"use client"

import { useEffect } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const getDashboardErrorMessage = (error: Error | undefined, fallback: string) => {
  const message = error?.message?.trim()

  return message || fallback
}

export const DashboardErrorCard = ({
  actionLabel = "重试",
  description = "请稍后重试，或返回上一级页面。",
  error,
  reset,
  title
}: {
  actionLabel?: string
  description?: string
  error?: Error
  reset: () => void
  title: string
}) => {
  const message = getDashboardErrorMessage(error, description)

  useEffect(() => {
    toast.error(message, {
      id: `dashboard-error-${message}`
    })
  }, [message])

  return (
    <Card className="rounded-lg" role="alert">
      <CardContent className="space-y-4 p-6">
        <div className="space-y-2">
          <h2 className="font-semibold text-base">{title}</h2>
          <p className="text-destructive text-sm">{message}</p>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <Button onClick={reset} type="button">
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}
