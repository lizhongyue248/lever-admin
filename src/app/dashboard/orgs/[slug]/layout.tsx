import type { ReactNode } from "react"

import { OrgSectionSwitcher } from "./_components/org-section-switcher"

const OrgSlugLayout = async ({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) => {
  const { slug } = await params

  return (
    <div className="space-y-5 text-[13px]">
      <OrgSectionSwitcher slug={slug} />
      {children}
    </div>
  )
}

export default OrgSlugLayout
