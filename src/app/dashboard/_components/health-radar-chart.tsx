import { cn } from "@/lib/utils"

type RadarPoint = {
  label: string
  value: number
}

type HealthRadarChartProps = {
  ariaLabel: string
  className?: string
  points: RadarPoint[]
}

const center = 120
const radius = 82

const clampValue = (value: number) => Math.max(0, Math.min(100, value))

const pointToCoordinate = (index: number, total: number, value: number) => {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  const distance = (clampValue(value) / 100) * radius

  return {
    x: center + Math.cos(angle) * distance,
    y: center + Math.sin(angle) * distance
  }
}

const labelCoordinate = (index: number, total: number) => {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  const distance = radius + 28

  return {
    x: center + Math.cos(angle) * distance,
    y: center + Math.sin(angle) * distance
  }
}

const polygonPoints = (points: RadarPoint[], value: number) =>
  points
    .map((_, index) => {
      const coordinate = pointToCoordinate(index, points.length, value)

      return `${coordinate.x},${coordinate.y}`
    })
    .join(" ")

export const HealthRadarChart = ({ ariaLabel, className, points }: HealthRadarChartProps) => {
  const shapePoints = points
    .map((point, index) => {
      const coordinate = pointToCoordinate(index, points.length, point.value)

      return `${coordinate.x},${coordinate.y}`
    })
    .join(" ")

  return (
    <svg aria-label={ariaLabel} className={cn("h-60 w-full max-w-80", className)} role="img" viewBox="0 0 240 240">
      <title>{ariaLabel}</title>
      {[25, 50, 75, 100].map((value) => (
        <polygon className="fill-none stroke-border" key={value} points={polygonPoints(points, value)} strokeWidth="1" />
      ))}
      {points.map((point, index) => {
        const edge = pointToCoordinate(index, points.length, 100)
        const label = labelCoordinate(index, points.length)

        return (
          <g key={point.label}>
            <line className="stroke-border" strokeWidth="1" x1={center} x2={edge.x} y1={center} y2={edge.y} />
            <text className="fill-muted-foreground text-[10px]" dominantBaseline="middle" textAnchor="middle" x={label.x} y={label.y}>
              {point.label}
            </text>
          </g>
        )
      })}
      <polygon className="fill-primary/15 stroke-primary" points={shapePoints} strokeLinejoin="round" strokeWidth="2" />
      {points.map((point, index) => {
        const coordinate = pointToCoordinate(index, points.length, point.value)

        return <circle className="fill-primary" cx={coordinate.x} cy={coordinate.y} key={point.label} r="3" />
      })}
    </svg>
  )
}
