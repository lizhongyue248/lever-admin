import { ShieldCheck } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { RouterOutputs } from "@/trpc/react"

type SecurityScore = RouterOutputs["security"]["getOverview"]["score"]

type SecurityScoreCardProps = {
  score: SecurityScore
}

const radarPoints = (values: number[]) => {
  const center = 50
  const maxRadius = 38
  const angleOffset = -90

  return values
    .map((value, index) => {
      const angle = ((angleOffset + (360 / values.length) * index) * Math.PI) / 180
      const radius = (Math.max(0, Math.min(100, value)) / 100) * maxRadius
      const x = center + radius * Math.cos(angle)
      const y = center + radius * Math.sin(angle)

      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")
}

export const SecurityScoreCard = ({ score }: SecurityScoreCardProps) => (
  <Card className="gap-4 rounded-lg py-5">
    <CardHeader className="px-5">
      <div className="flex items-center justify-between gap-3">
        <CardTitle className="text-base">安全雷达</CardTitle>
        <span className="font-semibold text-primary text-sm">{score.total}</span>
      </div>
    </CardHeader>
    <CardContent className="space-y-4 px-5">
      <div className="relative mx-auto aspect-square w-48 max-w-full">
        <svg aria-label="账号安全雷达图" className="size-full overflow-visible" role="img" viewBox="0 0 100 100">
          <title>账号安全雷达图</title>
          <polygon className="fill-muted/30 stroke-border" points="50,12 86.14,38.26 72.33,80.74 27.67,80.74 13.86,38.26" strokeWidth="0.6" />
          <polygon
            className="fill-background stroke-border dark:fill-muted/20"
            points="50,24 74.73,42.02 65.28,71.98 34.72,71.98 25.27,42.02"
            strokeDasharray="2 2"
            strokeWidth="0.6"
          />
          <polygon
            className="fill-background stroke-border dark:fill-muted/20"
            points="50,36 63.31,45.82 58.3,62.18 41.7,62.18 36.69,45.82"
            strokeDasharray="2 2"
            strokeWidth="0.6"
          />
          {score.dimensions.map((item, index) => {
            const angle = ((-90 + (360 / score.dimensions.length) * index) * Math.PI) / 180
            const x = 50 + 43 * Math.cos(angle)
            const y = 50 + 43 * Math.sin(angle)

            return <line className="stroke-border" key={item.key} strokeWidth="0.5" x1="50" x2={x} y1="50" y2={y} />
          })}
          <polygon className="fill-primary/20 stroke-primary" points={radarPoints(score.dimensions.map((item) => item.value))} strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <ShieldCheck className="size-7 text-primary" />
        </div>
      </div>
      <div className="space-y-2">
        {score.dimensions.map((item) => (
          <div className="flex items-center justify-between gap-3" key={item.key}>
            <span className="text-muted-foreground text-xs">{item.label}</span>
            <span className="font-medium text-xs">{item.value}</span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)
