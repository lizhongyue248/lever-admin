import Image from "next/image"

import { cn } from "@/lib/utils"

export const BrandLogo = ({ className }: { className?: string }) => {
  return (
    <span aria-label="Lever Admin" className={cn("relative inline-flex shrink-0", className)} role="img">
      <Image alt="" aria-hidden className="size-full dark:hidden" height={136} src="/logo-light.svg" unoptimized width={136} />
      <Image alt="" aria-hidden className="hidden size-full dark:block" height={136} src="/logo-dark.svg" unoptimized width={136} />
    </span>
  )
}
