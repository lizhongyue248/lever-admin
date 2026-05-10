import { AppWindow, CircleDot, Compass, Flame, Laptop, type LucideIcon, Monitor, MonitorSmartphone, Orbit, Smartphone, Tablet } from "lucide-react"

import { cn } from "@/lib/utils"
import type { RouterOutputs } from "@/trpc/react"

type Browser = RouterOutputs["session"]["listMine"]["sessions"][number]["browser"]

type SessionDeviceIconProps = {
  browser: Browser
  current?: boolean
  deviceLabel: string
}

const browserIcons: Record<Browser, LucideIcon> = {
  chrome: CircleDot,
  edge: Orbit,
  firefox: Flame,
  safari: Compass,
  unknown: AppWindow
}

const getSystemIcon = (deviceLabel: string): LucideIcon => {
  const value = deviceLabel.toLowerCase()

  if (value.includes("iphone") || value.includes("android")) {
    return Smartphone
  }

  if (value.includes("ipad")) {
    return Tablet
  }

  if (value.includes("windows")) {
    return Monitor
  }

  if (value.includes("mac")) {
    return Laptop
  }

  return MonitorSmartphone
}

export const SessionDeviceIcon = ({ browser, current = false, deviceLabel }: SessionDeviceIconProps) => {
  const BrowserIcon = browserIcons[browser]
  const SystemIcon = getSystemIcon(deviceLabel)

  return (
    <span
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground", current && "bg-primary/10 text-primary")}
      data-testid="session-device-icon"
    >
      <span className="flex items-center gap-0.5">
        <SystemIcon aria-hidden="true" className="size-4" data-testid="session-device-system-icon" />
        <BrowserIcon aria-hidden="true" className="size-3.5" data-testid="session-device-browser-icon" />
      </span>
    </span>
  )
}
