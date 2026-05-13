export const PLATFORM_ROLE_USER = "user"
export const PLATFORM_ROLE_SUPPORT = "support"
export const PLATFORM_ROLE_ADMIN = "admin"
export const PLATFORM_ROLE_SUPER_ADMIN = "super_admin"

export const PLATFORM_ADMIN_ROLES = [PLATFORM_ROLE_ADMIN, PLATFORM_ROLE_SUPER_ADMIN] as const

export const ORGANIZATION_ROLE_OWNER = "owner"
export const ORGANIZATION_ROLE_ADMIN = "admin"
export const ORGANIZATION_ROLE_MEMBER = "member"

export const ORGANIZATION_ROLES = [ORGANIZATION_ROLE_OWNER, ORGANIZATION_ROLE_ADMIN, ORGANIZATION_ROLE_MEMBER] as const
export const ORGANIZATION_ADMIN_ROLES = [ORGANIZATION_ROLE_OWNER, ORGANIZATION_ROLE_ADMIN] as const

export type PlatformAdminRole = (typeof PLATFORM_ADMIN_ROLES)[number]
export type PlatformRole = typeof PLATFORM_ROLE_USER | typeof PLATFORM_ROLE_SUPPORT | PlatformAdminRole
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number]
