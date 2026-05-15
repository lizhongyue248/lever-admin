"use client"

import { Button } from "@/components/ui/button"

const RequestLogsError = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => (
  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5" role="alert">
    <h2 className="font-semibold text-destructive text-sm">系统请求日志加载失败</h2>
    <p className="mt-2 text-muted-foreground text-xs">{error.message || "请稍后重试，或确认当前账号具备平台管理员权限。"}</p>
    <Button className="mt-4" onClick={reset} size="sm" type="button" variant="outline">
      重试
    </Button>
  </div>
)

export default RequestLogsError
