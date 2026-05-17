import type { SimpleIcon } from "simple-icons"

export const SimpleIconMark = ({ className = "size-4", icon }: { className?: string; icon: SimpleIcon }) => (
  <svg aria-hidden className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d={icon.path} />
  </svg>
)
