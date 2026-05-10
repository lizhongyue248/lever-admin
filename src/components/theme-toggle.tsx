"use client"

import { type HTMLMotionProps, motion, useReducedMotion } from "framer-motion"
import { useTheme } from "next-themes"
import { useCallback, useEffect, useState } from "react"

import { cn } from "@/lib/utils"

export type AnimationVariant = "circle" | "circle-blur" | "gif" | "polygon" | "rectangle"
export type AnimationStart =
  | "bottom-center"
  | "bottom-left"
  | "bottom-right"
  | "bottom-up"
  | "center"
  | "left-right"
  | "right-left"
  | "top-center"
  | "top-down"
  | "top-left"
  | "top-right"

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => void
}

type Animation = {
  css: string
  name: string
}

type UseThemeToggleOptions = {
  blur?: boolean
  gifUrl?: string
  start?: AnimationStart
  variant?: AnimationVariant
}

type ThemeToggleProps = Omit<HTMLMotionProps<"button">, "children" | "onClick" | "type"> & UseThemeToggleOptions

const styleId = "theme-transition-styles"
const defaultGifUrl = "https://media.giphy.com/media/KBbr4hHl9DSahKvInO/giphy.gif?cid=790b76112m5eeeydoe7et0cr3j3ekb1erunxozyshuhxx2vl&ep=v1_stickers_search&rid=giphy.gif&ct=s"

const updateStyles = (css: string) => {
  if (typeof window === "undefined") {
    return
  }

  let styleElement = document.getElementById(styleId) as HTMLStyleElement | null

  if (!styleElement) {
    styleElement = document.createElement("style")
    styleElement.id = styleId
    document.head.appendChild(styleElement)
  }

  styleElement.textContent = css
}

const switchWithViewTransition = (switchTheme: () => void) => {
  if (typeof document === "undefined") {
    return
  }

  const startViewTransition = (document as ViewTransitionDocument).startViewTransition

  if (!startViewTransition) {
    switchTheme()
    return
  }

  startViewTransition.call(document, switchTheme)
}

const getPositionCoords = (position: AnimationStart) => {
  switch (position) {
    case "top-left":
      return { cx: "0", cy: "0" }
    case "top-right":
      return { cx: "40", cy: "0" }
    case "bottom-left":
      return { cx: "0", cy: "40" }
    case "bottom-right":
      return { cx: "40", cy: "40" }
    case "top-center":
      return { cx: "20", cy: "0" }
    case "bottom-center":
      return { cx: "20", cy: "40" }
    default:
      return { cx: "20", cy: "20" }
  }
}

const getTransformOrigin = (start: AnimationStart) => {
  switch (start) {
    case "top-left":
      return "top left"
    case "top-right":
      return "top right"
    case "bottom-left":
      return "bottom left"
    case "bottom-right":
      return "bottom right"
    case "top-center":
      return "top center"
    case "bottom-center":
      return "bottom center"
    default:
      return "center"
  }
}

const generateSvg = (variant: AnimationVariant, start: AnimationStart) => {
  if (variant === "rectangle") {
    return ""
  }

  const { cx, cy } = getPositionCoords(start)

  if (variant === "circle-blur") {
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><filter id="blur"><feGaussianBlur stdDeviation="2"/></filter></defs><circle cx="${start === "center" ? "20" : cx}" cy="${start === "center" ? "20" : cy}" r="18" fill="white" filter="url(%23blur)"/></svg>`
  }

  if (variant === "circle") {
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="${cx}" cy="${cy}" r="20" fill="white"/></svg>`
  }

  return ""
}

const getRectangleClipPath = (start: AnimationStart) => {
  switch (start) {
    case "top-down":
      return { from: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }
    case "left-right":
      return { from: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }
    case "right-left":
      return { from: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }
    case "top-left":
      return { from: "polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }
    case "top-right":
      return { from: "polygon(100% 0%, 100% 0%, 100% 0%, 100% 0%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }
    case "bottom-left":
      return { from: "polygon(0% 100%, 0% 100%, 0% 100%, 0% 100%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }
    case "bottom-right":
      return { from: "polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }
    default:
      return { from: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }
  }
}

const getCirclePosition = (start: AnimationStart) => {
  switch (start) {
    case "top-left":
      return "0% 0%"
    case "top-right":
      return "100% 0%"
    case "bottom-left":
      return "0% 100%"
    case "bottom-right":
      return "100% 100%"
    case "top-center":
      return "50% 0%"
    case "bottom-center":
      return "50% 100%"
    default:
      return "50% 50%"
  }
}

const getPolygonClipPaths = (start: AnimationStart) => {
  if (start === "top-right") {
    return {
      darkFrom: "polygon(150% -71%, 250% 71%, 250% 71%, 150% -71%)",
      darkTo: "polygon(150% -71%, 250% 71%, 50% 171%, -71% 50%)",
      lightFrom: "polygon(-71% 50%, 50% 171%, 50% 171%, -71% 50%)",
      lightTo: "polygon(-71% 50%, 50% 171%, 250% 71%, 150% -71%)"
    }
  }

  return {
    darkFrom: "polygon(50% -71%, -50% 71%, -50% 71%, 50% -71%)",
    darkTo: "polygon(50% -71%, -50% 71%, 50% 171%, 171% 50%)",
    lightFrom: "polygon(171% 50%, 50% 171%, 50% 171%, 171% 50%)",
    lightTo: "polygon(171% 50%, 50% 171%, -50% 71%, 50% -71%)"
  }
}

const buildRevealCss = ({
  blur,
  darkFrom,
  darkTo,
  duration,
  lightFrom,
  lightTo,
  name
}: {
  blur: boolean
  darkFrom: string
  darkTo: string
  duration: string
  lightFrom: string
  lightTo: string
  name: string
}) => `
::view-transition-group(root) {
  animation-duration: ${duration};
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

::view-transition-new(root) {
  animation-name: reveal-light-${name};
  ${blur ? "filter: blur(2px);" : ""}
}

::view-transition-old(root),
.dark::view-transition-old(root) {
  animation: none;
  z-index: -1;
}

.dark::view-transition-new(root) {
  animation-name: reveal-dark-${name};
  ${blur ? "filter: blur(2px);" : ""}
}

@keyframes reveal-dark-${name} {
  from {
    clip-path: ${darkFrom};
    ${blur ? "filter: blur(8px);" : ""}
  }
  ${blur ? "50% { filter: blur(4px); }" : ""}
  to {
    clip-path: ${darkTo};
    ${blur ? "filter: blur(0px);" : ""}
  }
}

@keyframes reveal-light-${name} {
  from {
    clip-path: ${lightFrom};
    ${blur ? "filter: blur(8px);" : ""}
  }
  ${blur ? "50% { filter: blur(4px); }" : ""}
  to {
    clip-path: ${lightTo};
    ${blur ? "filter: blur(0px);" : ""}
  }
}
`

export const createAnimation = (variant: AnimationVariant, start: AnimationStart = "top-right", blur = false, url = defaultGifUrl): Animation => {
  const name = `${variant}-${start}${blur ? "-blur" : ""}`

  if (variant === "rectangle") {
    const clipPath = getRectangleClipPath(start)

    return {
      css: buildRevealCss({
        blur,
        darkFrom: clipPath.from,
        darkTo: clipPath.to,
        duration: "0.7s",
        lightFrom: clipPath.from,
        lightTo: clipPath.to,
        name
      }),
      name
    }
  }

  if (variant === "polygon") {
    const clipPaths = getPolygonClipPaths(start)

    return {
      css: buildRevealCss({
        blur,
        darkFrom: clipPaths.darkFrom,
        darkTo: clipPaths.darkTo,
        duration: "0.7s",
        lightFrom: clipPaths.lightFrom,
        lightTo: clipPaths.lightTo,
        name
      }),
      name
    }
  }

  if (variant === "gif") {
    return {
      css: `
::view-transition-group(root) {
  animation-timing-function: cubic-bezier(0.7, 0, 0.84, 0);
}

::view-transition-new(root) {
  animation: theme-toggle-mask-scale 3s;
  mask: url('${url}') center / 0 no-repeat;
}

::view-transition-old(root),
.dark::view-transition-old(root) {
  animation: theme-toggle-mask-scale 3s;
}

@keyframes theme-toggle-mask-scale {
  0% { mask-size: 0; }
  10% { mask-size: 50vmax; }
  90% { mask-size: 50vmax; }
  100% { mask-size: 2000vmax; }
}
`,
      name
    }
  }

  if (variant === "circle") {
    const clipPosition = getCirclePosition(start)
    const toSize = start === "center" ? "100%" : "150%"

    return {
      css: buildRevealCss({
        blur,
        darkFrom: `circle(0% at ${clipPosition})`,
        darkTo: `circle(${toSize} at ${clipPosition})`,
        duration: start === "center" ? "0.7s" : "1s",
        lightFrom: `circle(0% at ${clipPosition})`,
        lightTo: `circle(${toSize} at ${clipPosition})`,
        name
      }),
      name
    }
  }

  const svg = generateSvg(variant, start)
  const transformOrigin = getTransformOrigin(start)
  const maskPosition = start === "center" ? "center" : start.replace("-", " ")

  return {
    css: `
::view-transition-group(root) {
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

::view-transition-new(root) {
  animation: theme-toggle-mask-scale-${name} 1s;
  mask: url('${svg}') ${maskPosition} / 0 no-repeat;
  mask-origin: content-box;
  transform-origin: ${transformOrigin};
}

::view-transition-old(root),
.dark::view-transition-old(root) {
  animation: theme-toggle-mask-scale-${name} 1s;
  transform-origin: ${transformOrigin};
  z-index: -1;
}

@keyframes theme-toggle-mask-scale-${name} {
  to { mask-size: 350vmax; }
}
`,
    name
  }
}

export const useThemeToggle = ({ blur = false, gifUrl = defaultGifUrl, start = "top-right", variant = "circle" }: UseThemeToggleOptions = {}) => {
  const { resolvedTheme, setTheme } = useTheme()
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(resolvedTheme === "dark")
  }, [resolvedTheme])

  const setAnimatedTheme = useCallback(
    (nextTheme: "dark" | "light" | "system") => {
      const animation = createAnimation(variant, start, blur, gifUrl)
      updateStyles(animation.css)

      setIsDark(nextTheme === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches : nextTheme === "dark")
      switchWithViewTransition(() => setTheme(nextTheme))
    },
    [blur, gifUrl, setTheme, start, variant]
  )

  const toggleTheme = useCallback(() => {
    setAnimatedTheme(isDark ? "light" : "dark")
  }, [isDark, setAnimatedTheme])

  return {
    isDark,
    setCrazyDarkTheme: () => setAnimatedTheme("dark"),
    setCrazyLightTheme: () => setAnimatedTheme("light"),
    setCrazySystemTheme: () => setAnimatedTheme("system"),
    toggleTheme
  }
}

export const ThemeToggle = ({ blur = false, className, disabled, gifUrl = defaultGifUrl, start = "top-right", variant = "circle", ...props }: ThemeToggleProps) => {
  const [mounted, setMounted] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const { isDark, toggleTheme } = useThemeToggle({
    blur: prefersReducedMotion ? false : blur,
    gifUrl,
    start,
    variant: prefersReducedMotion ? "circle" : variant
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const duration = prefersReducedMotion ? 0 : 0.5

  return (
    <motion.button
      aria-label="切换主题"
      aria-pressed={mounted ? isDark : undefined}
      className={cn(
        "inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-border bg-background/85 p-0 text-foreground shadow-sm outline-none backdrop-blur transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      disabled={disabled}
      onClick={toggleTheme}
      type="button"
      whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
      {...props}
    >
      <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
        <motion.g animate={{ rotate: isDark ? -180 : 0 }} transition={{ duration, ease: "easeInOut" }}>
          <path d="M120 67.5C149.25 67.5 172.5 90.75 172.5 120C172.5 149.25 149.25 172.5 120 172.5" fill="currentColor" />
          <path d="M120 67.5C90.75 67.5 67.5 90.75 67.5 120C67.5 149.25 90.75 172.5 120 172.5" fill="transparent" />
        </motion.g>
        <motion.path
          animate={{ rotate: isDark ? 180 : 0 }}
          d="M120 3.75C55.5 3.75 3.75 55.5 3.75 120C3.75 184.5 55.5 236.25 120 236.25C184.5 236.25 236.25 184.5 236.25 120C236.25 55.5 184.5 3.75 120 3.75ZM120 214.5V172.5C90.75 172.5 67.5 149.25 67.5 120C67.5 90.75 90.75 67.5 120 67.5V25.5C172.5 25.5 214.5 67.5 214.5 120C214.5 172.5 172.5 214.5 120 214.5Z"
          fill="currentColor"
          transition={{ duration, ease: "easeInOut" }}
        />
      </svg>
      <span className="sr-only">切换主题</span>
    </motion.button>
  )
}
