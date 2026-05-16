// Roles
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

// Pagination and filters
export const FILTER_ALL = "all"

export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 10
export const DENSE_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 50
export const ADMIN_ORG_DEFAULT_PAGE_SIZE = 12
export const NOTIFICATION_MAX_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

export const USER_STATUS_ACTIVE = "active"
export const USER_STATUS_BANNED = "banned"
export const USER_STATUS_FILTERS = [FILTER_ALL, USER_STATUS_ACTIVE, USER_STATUS_BANNED] as const
export type UserStatusFilter = (typeof USER_STATUS_FILTERS)[number]

export const ORGANIZATION_STATUS_ACTIVE = "active"
export const ORGANIZATION_STATUS_DISABLED = "disabled"
export const ORGANIZATION_STATUS_FILTERS = [FILTER_ALL, ORGANIZATION_STATUS_ACTIVE, ORGANIZATION_STATUS_DISABLED] as const
export type OrganizationStatusFilter = (typeof ORGANIZATION_STATUS_FILTERS)[number]

export const INVITATION_STATUS_PENDING = "pending"
export const INVITATION_STATUS_ACCEPTED = "accepted"
export const INVITATION_STATUS_REJECTED = "rejected"
export const INVITATION_STATUS_EXPIRED = "expired"
export const INVITATION_STATUS_CANCELED = "canceled"
export const INVITATION_STATUSES = [
  INVITATION_STATUS_ACCEPTED,
  INVITATION_STATUS_CANCELED,
  INVITATION_STATUS_EXPIRED,
  INVITATION_STATUS_PENDING,
  INVITATION_STATUS_REJECTED
] as const
export type InvitationStatus = (typeof INVITATION_STATUSES)[number]

export const NOTIFICATION_TYPE_INVITATION = "invitation"
export const NOTIFICATION_TYPE_SECURITY = "security"
export const NOTIFICATION_TYPE_SYSTEM = "system"
export const NOTIFICATION_TYPE_FILTERS = [FILTER_ALL, NOTIFICATION_TYPE_INVITATION, NOTIFICATION_TYPE_SECURITY, NOTIFICATION_TYPE_SYSTEM] as const
export type NotificationTypeFilter = (typeof NOTIFICATION_TYPE_FILTERS)[number]

export const EMAIL_VERIFICATION_STATUS_PENDING = "pending"
export const EMAIL_VERIFICATION_STATUS_SUCCESS = "success"
export const EMAIL_VERIFICATION_STATUS_FAILED = "failed"

// API keys
export const API_KEY_STATUS_ENABLED = "enabled"
export const API_KEY_STATUS_DISABLED = "disabled"
export const API_KEY_STATUS_EXPIRING = "expiring"
export const API_KEY_STATUS_EXPIRED = "expired"
export const API_KEY_STATUS_RISKY = "risky"
export const API_KEY_DISPLAY_STATUSES = [API_KEY_STATUS_ENABLED, API_KEY_STATUS_DISABLED, API_KEY_STATUS_EXPIRED, API_KEY_STATUS_EXPIRING] as const
export const API_KEY_STATUS_FILTERS = [FILTER_ALL, API_KEY_STATUS_ENABLED, API_KEY_STATUS_DISABLED, API_KEY_STATUS_EXPIRING, API_KEY_STATUS_RISKY] as const
export type ApiKeyDisplayStatus = (typeof API_KEY_DISPLAY_STATUSES)[number]
export type ApiKeyStatusFilter = (typeof API_KEY_STATUS_FILTERS)[number]

export const API_KEY_OWNER_USER = "user"
export const API_KEY_OWNER_ORGANIZATION = "organization"
export const API_KEY_OWNER_TYPES = [API_KEY_OWNER_USER, API_KEY_OWNER_ORGANIZATION] as const
export type ApiKeyOwnerType = (typeof API_KEY_OWNER_TYPES)[number]

export const API_KEY_EXPIRING_SOON_DAYS = 30
export const API_KEY_FAILURE_RATE_RISK_THRESHOLD = 0.1
export const API_KEY_STALE_REQUEST_DAYS = 90
export const MASKED_API_KEY_VISIBLE_LENGTH = 12
export const API_KEY_USAGE_RECENT_DAYS = 7

export const RISK_LEVEL_LOW = "low"
export const RISK_LEVEL_MEDIUM = "medium"
export const RISK_LEVEL_HIGH = "high"
export const RISK_LEVELS = [RISK_LEVEL_LOW, RISK_LEVEL_MEDIUM, RISK_LEVEL_HIGH] as const
export type RiskSeverity = (typeof RISK_LEVELS)[number]

export const SESSION_RISK_NORMAL = "normal"
export const SESSION_RISK_RISK = "risk"
export const SESSION_RISK_LEVELS = [SESSION_RISK_NORMAL, SESSION_RISK_RISK] as const
export const SESSION_RISK_WINDOW_DAYS = 30
export const SESSION_RISK_MAX_ACTIVE_SESSIONS_PER_USER = 5
export type SessionRiskLevel = (typeof SESSION_RISK_LEVELS)[number]

export const REQUEST_LOG_SOURCE_API_KEY = "api_key"
export const REQUEST_LOG_SOURCE_AUTH = "auth"
export const REQUEST_LOG_SOURCE_DASHBOARD = "dashboard"
export const REQUEST_LOG_SOURCE_ROUTE_HANDLER = "route_handler"
export const REQUEST_LOG_SOURCE_SYSTEM = "system"
export const REQUEST_LOG_SOURCE_TRPC = "trpc"
export const REQUEST_LOG_SOURCE_FILTERS = [
  FILTER_ALL,
  REQUEST_LOG_SOURCE_API_KEY,
  REQUEST_LOG_SOURCE_AUTH,
  REQUEST_LOG_SOURCE_DASHBOARD,
  REQUEST_LOG_SOURCE_ROUTE_HANDLER,
  REQUEST_LOG_SOURCE_SYSTEM,
  REQUEST_LOG_SOURCE_TRPC
] as const
export type RequestLogSourceFilter = (typeof REQUEST_LOG_SOURCE_FILTERS)[number]
export type RequestLogSource = Exclude<RequestLogSourceFilter, typeof FILTER_ALL>

export const REQUEST_LOG_METHOD_DELETE = "DELETE"
export const REQUEST_LOG_METHOD_GET = "GET"
export const REQUEST_LOG_METHOD_PATCH = "PATCH"
export const REQUEST_LOG_METHOD_POST = "POST"
export const REQUEST_LOG_METHOD_PUT = "PUT"
export const REQUEST_LOG_METHOD_FILTERS = [
  FILTER_ALL,
  REQUEST_LOG_METHOD_DELETE,
  REQUEST_LOG_METHOD_GET,
  REQUEST_LOG_METHOD_PATCH,
  REQUEST_LOG_METHOD_POST,
  REQUEST_LOG_METHOD_PUT
] as const
export type RequestLogMethodFilter = (typeof REQUEST_LOG_METHOD_FILTERS)[number]
export type RequestLogMethod = Exclude<RequestLogMethodFilter, typeof FILTER_ALL>

export const REQUEST_LOG_RESULT_FAILED = "failed"
export const REQUEST_LOG_RESULT_SUCCESS = "success"
export const REQUEST_LOG_RESULT_FILTERS = [FILTER_ALL, REQUEST_LOG_RESULT_FAILED, REQUEST_LOG_RESULT_SUCCESS] as const
export type RequestLogResultFilter = (typeof REQUEST_LOG_RESULT_FILTERS)[number]
export type RequestLogResult = Exclude<RequestLogResultFilter, typeof FILTER_ALL>

export const REQUEST_LOG_RISK_FILTERS = [FILTER_ALL, RISK_LEVEL_HIGH, RISK_LEVEL_LOW, RISK_LEVEL_MEDIUM] as const
export type RequestLogRiskFilter = (typeof REQUEST_LOG_RISK_FILTERS)[number]
export type RequestLogRisk = Exclude<RequestLogRiskFilter, typeof FILTER_ALL>

export const REQUEST_LOG_TIME_RANGE_1H = "1h"
export const REQUEST_LOG_TIME_RANGE_24H = "24h"
export const REQUEST_LOG_TIME_RANGE_7D = "7d"
export const REQUEST_LOG_TIME_RANGE_30D = "30d"
export const REQUEST_LOG_TIME_RANGE_FILTERS = [REQUEST_LOG_TIME_RANGE_1H, REQUEST_LOG_TIME_RANGE_24H, REQUEST_LOG_TIME_RANGE_7D, REQUEST_LOG_TIME_RANGE_30D, FILTER_ALL] as const
export type RequestLogTimeRangeFilter = (typeof REQUEST_LOG_TIME_RANGE_FILTERS)[number]
export type RequestLogTimeRange = Exclude<RequestLogTimeRangeFilter, typeof FILTER_ALL>

export const REQUEST_LOG_DEFAULT_TIME_RANGE = REQUEST_LOG_TIME_RANGE_24H
export const REQUEST_LOG_SLOW_MS = 2000
export const REQUEST_LOG_HIGH_RISK_SLOW_MS = 10_000
export const REQUEST_LOG_EXPORT_LIMIT = 10_000
export const REQUEST_LOG_EXPORT_QUERY_LIMIT = REQUEST_LOG_EXPORT_LIMIT + 1
export const REQUEST_LOG_MAX_BODY_BYTES = 16 * 1024
export const REQUEST_LOG_REDACTED_VALUE = "[REDACTED]"

export const DASHBOARD_RECENT_WINDOW_DAYS = 30

// Platform settings
export const EMAIL_PROVIDER_CONSOLE = "console"
export const EMAIL_PROVIDER_RESEND = "resend"
export const EMAIL_PROVIDER_SMTP = "smtp"
export const EMAIL_PROVIDERS = [EMAIL_PROVIDER_CONSOLE, EMAIL_PROVIDER_RESEND, EMAIL_PROVIDER_SMTP] as const
export type PlatformEmailProviderName = (typeof EMAIL_PROVIDERS)[number]

export const EMAIL_SETTING_KEY_FROM = "email.from"
export const EMAIL_SETTING_KEY_PROVIDER = "email.provider"
export const EMAIL_SETTING_KEY_RESEND_API_KEY = "email.resend.apiKey"
export const EMAIL_SETTING_KEY_SMTP_HOST = "email.smtp.host"
export const EMAIL_SETTING_KEY_SMTP_PASSWORD = "email.smtp.password"
export const EMAIL_SETTING_KEY_SMTP_PORT = "email.smtp.port"
export const EMAIL_SETTING_KEY_SMTP_SECURE = "email.smtp.secure"
export const EMAIL_SETTING_KEY_SMTP_USER = "email.smtp.user"
export const EMAIL_SETTING_KEYS = [
  EMAIL_SETTING_KEY_FROM,
  EMAIL_SETTING_KEY_PROVIDER,
  EMAIL_SETTING_KEY_RESEND_API_KEY,
  EMAIL_SETTING_KEY_SMTP_HOST,
  EMAIL_SETTING_KEY_SMTP_PASSWORD,
  EMAIL_SETTING_KEY_SMTP_PORT,
  EMAIL_SETTING_KEY_SMTP_SECURE,
  EMAIL_SETTING_KEY_SMTP_USER
] as const
export const EMAIL_SETTING_SENSITIVE_KEYS = [EMAIL_SETTING_KEY_RESEND_API_KEY, EMAIL_SETTING_KEY_SMTP_PASSWORD] as const

export const STORAGE_PROVIDER_LOCAL = "local"
export const STORAGE_PROVIDER_S3 = "s3"
export const STORAGE_PROVIDERS = [STORAGE_PROVIDER_LOCAL, STORAGE_PROVIDER_S3] as const
export type PlatformStorageProviderName = (typeof STORAGE_PROVIDERS)[number]

export const STORAGE_SETTING_KEY_PROVIDER = "storage.provider"
export const STORAGE_SETTING_KEY_LOCAL_PATH = "storage.local.path"
export const STORAGE_SETTING_KEY_PUBLIC_BASE_URL = "storage.publicBaseUrl"
export const STORAGE_SETTING_KEY_S3_ENDPOINT = "storage.s3.endpoint"
export const STORAGE_SETTING_KEY_S3_REGION = "storage.s3.region"
export const STORAGE_SETTING_KEY_S3_BUCKET = "storage.s3.bucket"
export const STORAGE_SETTING_KEY_S3_ACCESS_KEY_ID = "storage.s3.accessKeyId"
export const STORAGE_SETTING_KEY_S3_SECRET_ACCESS_KEY = "storage.s3.secretAccessKey"
export const STORAGE_SETTING_KEY_S3_FORCE_PATH_STYLE = "storage.s3.forcePathStyle"
export const STORAGE_SETTING_KEYS = [
  STORAGE_SETTING_KEY_PROVIDER,
  STORAGE_SETTING_KEY_LOCAL_PATH,
  STORAGE_SETTING_KEY_PUBLIC_BASE_URL,
  STORAGE_SETTING_KEY_S3_ENDPOINT,
  STORAGE_SETTING_KEY_S3_REGION,
  STORAGE_SETTING_KEY_S3_BUCKET,
  STORAGE_SETTING_KEY_S3_ACCESS_KEY_ID,
  STORAGE_SETTING_KEY_S3_SECRET_ACCESS_KEY,
  STORAGE_SETTING_KEY_S3_FORCE_PATH_STYLE
] as const
export const STORAGE_SETTING_SENSITIVE_KEYS = [STORAGE_SETTING_KEY_S3_ACCESS_KEY_ID, STORAGE_SETTING_KEY_S3_SECRET_ACCESS_KEY] as const

export const DEFAULT_LOCAL_UPLOAD_PATH = "./uploads"
export const UPLOAD_MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const UPLOAD_MAX_MULTIPART_BYTES = UPLOAD_MAX_IMAGE_BYTES + 512 * 1024
export const UPLOAD_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const
export type UploadImageMimeType = (typeof UPLOAD_IMAGE_MIME_TYPES)[number]
export const UPLOAD_PURPOSE_AVATAR = "avatars"
export const UPLOAD_PURPOSE_ORG_LOGO = "organization-logos"
export const UPLOAD_PURPOSE_PLATFORM_TEST = "platform-settings"
export const UPLOAD_PURPOSES = [UPLOAD_PURPOSE_AVATAR, UPLOAD_PURPOSE_ORG_LOGO, UPLOAD_PURPOSE_PLATFORM_TEST] as const
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number]
export const ROUTE_API_UPLOAD_AVATAR = "/api/uploads/avatar"
export const ROUTE_API_UPLOAD_ORG_LOGO = "/api/uploads/org-logo"

export const OAUTH_PROVIDER_GITHUB = "github"
export const OAUTH_PROVIDER_GOOGLE = "google"
export const OAUTH_PROVIDERS = [OAUTH_PROVIDER_GITHUB, OAUTH_PROVIDER_GOOGLE] as const
export type AuthOAuthProviderId = (typeof OAUTH_PROVIDERS)[number]

export const RECENT_LOGIN_STATUS_ACTIVE = "active"
export const RECENT_LOGIN_STATUS_AVAILABLE = "available"
export const RECENT_LOGIN_STATUS_UNCONFIGURED = "unconfigured"
export const RECENT_LOGIN_STATUSES = [RECENT_LOGIN_STATUS_ACTIVE, RECENT_LOGIN_STATUS_AVAILABLE, RECENT_LOGIN_STATUS_UNCONFIGURED] as const
export type RecentLoginStatus = (typeof RECENT_LOGIN_STATUSES)[number]

// Routes
export const ROUTE_SIGN_IN = "/sign-in"
export const ROUTE_SIGN_IN_2FA = "/sign-in/2fa"
export const ROUTE_SIGN_UP = "/sign-up"
export const ROUTE_DASHBOARD = "/dashboard"
export const ROUTE_VERIFY_EMAIL = "/verify-email"
export const ROUTE_DASHBOARD_ADMIN_USERS = "/dashboard/admin/users"
export const ROUTE_DASHBOARD_ADMIN_ORGS = "/dashboard/admin/orgs"
export const ROUTE_DASHBOARD_ADMIN_API_KEYS = "/dashboard/admin/api-keys"
export const ROUTE_DASHBOARD_ADMIN_REQUEST_LOGS = "/dashboard/admin/request-logs"
export const ROUTE_DASHBOARD_ADMIN_SETTINGS = "/dashboard/admin/settings"
export const ROUTE_DASHBOARD_SETTINGS_PROFILE = "/dashboard/settings/profile"
export const ROUTE_DASHBOARD_SETTINGS_SECURITY = "/dashboard/settings/security"
export const ROUTE_DASHBOARD_SETTINGS_SESSIONS = "/dashboard/settings/sessions"
export const ROUTE_DASHBOARD_SETTINGS_API_KEYS = "/dashboard/settings/api-keys"

export const getEmailVerificationPendingRoute = (email?: string) => {
  const params = new URLSearchParams({ status: EMAIL_VERIFICATION_STATUS_PENDING })

  if (email) {
    params.set("email", email)
  }

  return `${ROUTE_VERIFY_EMAIL}?${params.toString()}`
}
