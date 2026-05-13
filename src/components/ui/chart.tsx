"use client"

import * as React from "react"
import { Tooltip, type TooltipContentProps, type TooltipPayloadEntry } from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = {
  [key: string]: {
    color?: string
    icon?: React.ComponentType
    label?: React.ReactNode
  }
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

const useChart = () => {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    children: React.ReactElement<{ height?: number; width?: number }>
    config: ChartConfig
  }
>(({ children, className, config, ...props }, ref) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [size, setSize] = React.useState({ height: 0, width: 0 })
  const chartStyle = React.useMemo(
    () => Object.fromEntries(Object.entries(config).flatMap(([key, itemConfig]) => (itemConfig.color ? [[`--color-${key}`, itemConfig.color]] : []))) as React.CSSProperties,
    [config]
  )

  React.useEffect(() => {
    const element = containerRef.current

    if (!element) {
      return
    }

    const updateReady = () => {
      const rect = element.getBoundingClientRect()

      setSize({
        height: Math.max(0, Math.floor(rect.height)),
        width: Math.max(0, Math.floor(rect.width))
      })
    }
    const observer = new ResizeObserver(updateReady)

    updateReady()
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const setRefs = (element: HTMLDivElement | null) => {
    containerRef.current = element

    if (typeof ref === "function") {
      ref(element)
      return
    }

    if (ref) {
      ref.current = element
    }
  }

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn(
          "aspect-video min-w-0 text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/70 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-surface]:outline-hidden",
          className
        )}
        ref={setRefs}
        style={{
          ...chartStyle,
          ...props.style
        }}
        {...props}
      >
        {size.width > 0 && size.height > 0 ? React.cloneElement(children, { height: size.height, width: size.width }) : null}
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = Tooltip

const getPayloadLabel = (config: ChartConfig, item: TooltipPayloadEntry) => {
  const key = String(item.dataKey ?? item.name ?? "value")

  return config[key]?.label ?? item.name ?? key
}

const formatTooltipValue = (value: TooltipPayloadEntry["value"]) => {
  if (typeof value === "number") {
    return value.toLocaleString()
  }

  if (Array.isArray(value)) {
    return value.join(" - ")
  }

  return value ?? ""
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  Partial<TooltipContentProps> &
    React.ComponentProps<"div"> & {
      hideIndicator?: boolean
      hideLabel?: boolean
      indicator?: "dashed" | "dot" | "line"
    }
>(({ active, className, hideIndicator = false, hideLabel = false, indicator = "dot", label, payload }, ref) => {
  const { config } = useChart()

  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className={cn("grid min-w-32 items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl", className)} ref={ref}>
      {!hideLabel && label ? <div className="font-medium">{label}</div> : null}
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const itemLabel = getPayloadLabel(config, item)
          const indicatorColor = item.color || config[String(item.dataKey ?? item.name ?? "value")]?.color || "var(--chart-1)"

          return (
            <div
              className={cn("flex w-full items-center gap-2", indicator === "line" && "items-stretch")}
              key={`${String(item.dataKey ?? item.name ?? "value")}-${String(item.value ?? "")}`}
            >
              {!hideIndicator ? (
                <div
                  className={cn("shrink-0 rounded-[2px]", {
                    "h-2.5 w-2.5": indicator === "dot",
                    "w-1": indicator === "line",
                    "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed"
                  })}
                  style={{
                    backgroundColor: indicator === "dashed" ? "transparent" : indicatorColor,
                    borderColor: indicatorColor
                  }}
                />
              ) : null}
              <span className="text-muted-foreground">{itemLabel}</span>
              <span className="ml-auto font-medium font-mono text-foreground tabular-nums">{formatTooltipValue(item.value)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

export { ChartContainer, ChartTooltip, ChartTooltipContent }
