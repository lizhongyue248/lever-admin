"use client"

import { TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type SessionsErrorProps = {
  reset: () => void
}

const SessionsError = ({ reset }: SessionsErrorProps) => (
  <div className="space-y-5 text-[13px]">
    <div className="space-y-1">
      <h1 className="font-semibold text-2xl tracking-normal">我的会话</h1>
      <p className="max-w-2xl text-muted-foreground text-sm">查看当前登录设备，撤销不再使用或可疑的会话。</p>
    </div>

    <Card className="rounded-lg py-5">
      <CardContent className="space-y-4 px-5">
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" className="size-4" />
          <AlertTitle>会话信息暂时无法加载</AlertTitle>
          <AlertDescription>请稍后重试；如果问题持续存在，可以先重新登录以刷新当前会话状态。</AlertDescription>
        </Alert>
        <Button onClick={reset} type="button" variant="outline">
          重新加载
        </Button>
      </CardContent>
    </Card>
  </div>
)

export default SessionsError
