"use client"

import type * as React from "react"

import { cn } from "@/lib/utils"

const Skeleton = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("animate-pulse rounded-md bg-primary/10", className)} data-slot="skeleton" {...props} />
)

export { Skeleton }
