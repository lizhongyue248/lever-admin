"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const OrgError = ({ reset }: { error: Error; reset: () => void }) => (
  <Card className="rounded-lg">
    <CardContent className="space-y-3 p-6">
      <h2 className="font-semibold text-base">页面加载失败</h2>
      <p className="text-muted-foreground text-sm">请稍后重试，或返回工作台。</p>
      <Button onClick={reset} type="button">
        重试
      </Button>
    </CardContent>
  </Card>
)

export default OrgError
