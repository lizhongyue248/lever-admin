export const orgSections = [
  { href: (slug: string) => `/dashboard/orgs/${slug}`, key: "overview", label: "概览", segment: "" },
  { href: (slug: string) => `/dashboard/orgs/${slug}/information`, key: "information", label: "组织架构", segment: "information" },
  { href: (slug: string) => `/dashboard/orgs/${slug}/invite`, key: "invite", label: "邀请", segment: "invite" },
  { href: (slug: string) => `/dashboard/orgs/${slug}/auth`, key: "auth", label: "登录情况", segment: "auth" },
  { href: (slug: string) => `/dashboard/orgs/${slug}/setting`, key: "setting", label: "设置", segment: "setting" }
] as const

export type OrgSectionKey = (typeof orgSections)[number]["key"]
