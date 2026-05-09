import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export const AuthBackButton = ({ href = "/sign-in", label = "返回登录" }: { href?: string; label?: string }) => {
  return (
    <Button aria-label={label} asChild className="fixed top-6 left-6 z-20 bg-background/85 shadow-sm backdrop-blur lg:left-[544px]" size="icon-lg" variant="outline">
      <Link href={href} title={label}>
        <ArrowLeft className="size-4" />
        <span className="sr-only">{label}</span>
      </Link>
    </Button>
  )
}
