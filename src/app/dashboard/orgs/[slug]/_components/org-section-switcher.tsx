"use client"

import { Check, ChevronDown } from "lucide-react"
import Link from "next/link"
import { useSelectedLayoutSegment } from "next/navigation"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { orgSections } from "../_lib/org-routes"

const getActiveKey = (segment: string | null) => orgSections.find((section) => section.segment === (segment ?? ""))?.key ?? "overview"

export const OrgSectionSwitcher = ({ slug }: { slug: string }) => {
  const segment = useSelectedLayoutSegment()
  const active = getActiveKey(segment)
  const activeSection = orgSections.find((section) => section.key === active) ?? orgSections[0]

  return (
    <>
      <nav aria-label="组织管理分区" className="hidden rounded-lg border bg-card p-1 shadow-sm md:grid md:grid-cols-5">
        {orgSections.map((section) => (
          <Link
            aria-current={section.key === active ? "page" : undefined}
            className={cn(
              "rounded-md px-4 py-2 text-center font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground",
              section.key === active && "bg-primary/10 text-primary"
            )}
            href={section.href(slug)}
            key={section.key}
          >
            {section.label}
          </Link>
        ))}
      </nav>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex w-full justify-between md:hidden" type="button" variant="outline">
            {activeSection.label}
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
          {orgSections.map((section) => (
            <DropdownMenuItem asChild key={section.key}>
              <Link className="flex items-center justify-between" href={section.href(slug)}>
                {section.label}
                {section.key === active ? <Check className="size-4" /> : null}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
