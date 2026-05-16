import { relations } from "drizzle-orm"
import { boolean, foreignKey, index, integer, pgTableCreator, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

import { API_KEY_OWNER_USER, INVITATION_STATUS_PENDING, ORGANIZATION_ROLE_MEMBER, ORGANIZATION_STATUS_ACTIVE, RISK_LEVEL_LOW } from "@/lib/const"

export const createSystemTable = pgTableCreator((name) => `system_${name}`)

export const user = createSystemTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
})

export const session = createSystemTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    impersonatedBy: text("impersonated_by"),
    activeOrganizationId: text("active_organization_id"),
    activeTeamId: text("active_team_id"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
  },
  (table) => [index("system_session_user_id_idx").on(table.userId)]
)

export const account = createSystemTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [index("system_account_user_id_idx").on(table.userId)]
)

export const verification = createSystemTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [index("system_verification_identifier_idx").on(table.identifier)]
)

export const organization = createSystemTable(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    metadata: text("metadata"),
    status: text("status").default(ORGANIZATION_STATUS_ACTIVE).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [uniqueIndex("system_organization_slug_idx").on(table.slug), index("system_organization_status_idx").on(table.status)]
)

export const organizationDepartment = createSystemTable(
  "organization_department",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    parentDepartmentId: text("parent_department_id"),
    name: text("name").notNull(),
    path: text("path").notNull(),
    depth: integer("depth").default(0).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    status: text("status").default(ORGANIZATION_STATUS_ACTIVE).notNull(),
    managerUserId: text("manager_user_id"),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "org_department_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.parentDepartmentId],
      foreignColumns: [table.id],
      name: "org_department_parent_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.managerUserId],
      foreignColumns: [user.id],
      name: "org_department_manager_fk"
    }).onDelete("set null"),
    index("system_organization_department_org_idx").on(table.organizationId),
    index("system_organization_department_parent_idx").on(table.parentDepartmentId),
    index("system_organization_department_path_idx").on(table.path),
    index("system_organization_department_status_idx").on(table.status),
    uniqueIndex("system_organization_department_sibling_name_idx").on(table.organizationId, table.parentDepartmentId, table.name)
  ]
)

export const member = createSystemTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default(ORGANIZATION_ROLE_MEMBER).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [
    index("system_member_organization_id_idx").on(table.organizationId),
    index("system_member_user_id_idx").on(table.userId),
    uniqueIndex("system_member_organization_user_idx").on(table.organizationId, table.userId)
  ]
)

export const organizationDepartmentMember = createSystemTable(
  "organization_department_member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull(),
    departmentId: text("department_id").notNull(),
    memberId: text("member_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "org_department_member_org_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [organizationDepartment.id],
      name: "org_department_member_department_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.memberId],
      foreignColumns: [member.id],
      name: "org_department_member_member_fk"
    }).onDelete("cascade"),
    index("system_organization_department_member_org_idx").on(table.organizationId),
    index("system_organization_department_member_department_idx").on(table.departmentId),
    index("system_organization_department_member_member_idx").on(table.memberId),
    uniqueIndex("system_organization_department_member_unique_idx").on(table.departmentId, table.memberId)
  ]
)

export const invitation = createSystemTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull(),
    status: text("status").default(INVITATION_STATUS_PENDING).notNull(),
    expiresAt: timestamp("expires_at"),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    departmentId: text("department_id"),
    teamId: text("team_id"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [organizationDepartment.id],
      name: "invitation_department_fk"
    }).onDelete("set null"),
    index("system_invitation_organization_id_idx").on(table.organizationId),
    index("system_invitation_email_idx").on(table.email),
    index("system_invitation_status_idx").on(table.status),
    index("system_invitation_department_id_idx").on(table.departmentId),
    index("system_invitation_team_id_idx").on(table.teamId)
  ]
)

export const team = createSystemTable(
  "team",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => /* @__PURE__ */ new Date())
  },
  (table) => [index("system_team_organization_id_idx").on(table.organizationId)]
)

export const teamMember = createSystemTable(
  "team_member",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow()
  },
  (table) => [
    index("system_team_member_team_id_idx").on(table.teamId),
    index("system_team_member_user_id_idx").on(table.userId),
    uniqueIndex("system_team_member_team_user_idx").on(table.teamId, table.userId)
  ]
)

export const twoFactor = createSystemTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(true)
  },
  (table) => [index("system_two_factor_secret_idx").on(table.secret), index("system_two_factor_user_id_idx").on(table.userId)]
)

export const passkey = createSystemTable(
  "passkey",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    credentialID: text("credential_id").notNull(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: boolean("backed_up").notNull(),
    transports: text("transports"),
    createdAt: timestamp("created_at").defaultNow(),
    aaguid: text("aaguid")
  },
  (table) => [index("system_passkey_user_id_idx").on(table.userId), index("system_passkey_credential_id_idx").on(table.credentialID)]
)

export const platformSetting = createSystemTable("platform_setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull()
})

export const apikey = createSystemTable(
  "apikey",
  {
    id: text("id").primaryKey(),
    configId: text("config_id").default(API_KEY_OWNER_USER).notNull(),
    name: text("name"),
    start: text("start"),
    referenceId: text("reference_id").notNull(),
    prefix: text("prefix"),
    key: text("key").notNull(),
    refillInterval: integer("refill_interval"),
    refillAmount: integer("refill_amount"),
    lastRefillAt: timestamp("last_refill_at"),
    enabled: boolean("enabled").default(true),
    rateLimitEnabled: boolean("rate_limit_enabled").default(true),
    rateLimitTimeWindow: integer("rate_limit_time_window"),
    rateLimitMax: integer("rate_limit_max"),
    requestCount: integer("request_count").default(0),
    remaining: integer("remaining"),
    lastRequest: timestamp("last_request"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    permissions: text("permissions"),
    metadata: text("metadata")
  },
  (table) => [index("system_apikey_config_id_idx").on(table.configId), index("system_apikey_reference_id_idx").on(table.referenceId), index("system_apikey_key_idx").on(table.key)]
)

export const apiKeyUsageLog = createSystemTable(
  "api_key_usage_log",
  {
    id: text("id").primaryKey(),
    apiKeyId: text("api_key_id"),
    configId: text("config_id").notNull(),
    referenceId: text("reference_id").notNull(),
    keyPrefix: text("key_prefix"),
    method: text("method").notNull(),
    path: text("path").notNull(),
    routeName: text("route_name"),
    statusCode: integer("status_code").notNull(),
    success: boolean("success").notNull(),
    errorCode: text("error_code"),
    failureReason: text("failure_reason"),
    requestId: text("request_id"),
    ipHash: text("ip_hash"),
    ipCountry: text("ip_country"),
    ipRegion: text("ip_region"),
    userAgentHash: text("user_agent_hash"),
    userAgentSummary: text("user_agent_summary"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [
    index("system_api_key_usage_log_api_key_created_at_idx").on(table.apiKeyId, table.createdAt),
    index("system_api_key_usage_log_config_reference_created_at_idx").on(table.configId, table.referenceId, table.createdAt),
    index("system_api_key_usage_log_created_at_idx").on(table.createdAt),
    foreignKey({
      columns: [table.apiKeyId],
      foreignColumns: [apikey.id],
      name: "api_key_usage_log_api_key_fk"
    }).onDelete("set null")
  ]
)

export const requestLog = createSystemTable(
  "request_log",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull(),
    source: text("source").notNull(),
    method: text("method").notNull(),
    path: text("path").notNull(),
    routeName: text("route_name"),
    statusCode: integer("status_code"),
    success: boolean("success").notNull(),
    errorCode: text("error_code"),
    failureReason: text("failure_reason"),
    durationMs: integer("duration_ms"),
    userId: text("user_id"),
    userEmail: text("user_email"),
    userName: text("user_name"),
    userRole: text("user_role"),
    organizationId: text("organization_id"),
    organizationName: text("organization_name"),
    sessionId: text("session_id"),
    impersonatedBy: text("impersonated_by"),
    apiKeyId: text("api_key_id"),
    requestQuerySummary: text("request_query_summary"),
    requestBodySummary: text("request_body_summary"),
    requestBodyStatus: text("request_body_status").default("not_collected").notNull(),
    ipHash: text("ip_hash"),
    ipAddress: text("ip_address"),
    ipCountry: text("ip_country"),
    ipRegion: text("ip_region"),
    userAgentHash: text("user_agent_hash"),
    userAgentRaw: text("user_agent_raw"),
    userAgentSummary: text("user_agent_summary"),
    riskLevel: text("risk_level").default(RISK_LEVEL_LOW).notNull(),
    riskReasons: text("risk_reasons"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => [
    index("system_request_log_created_at_idx").on(table.createdAt),
    index("system_request_log_user_created_at_idx").on(table.userId, table.createdAt),
    uniqueIndex("system_request_log_request_id_idx").on(table.requestId),
    index("system_request_log_path_created_at_idx").on(table.path, table.createdAt),
    index("system_request_log_success_created_at_idx").on(table.success, table.createdAt),
    index("system_request_log_risk_created_at_idx").on(table.riskLevel, table.createdAt)
  ]
)

export const apiKeyRelations = relations(apikey, ({ many }) => ({
  usageLogs: many(apiKeyUsageLog)
}))

export const apiKeyUsageLogRelations = relations(apiKeyUsageLog, ({ one }) => ({
  apiKey: one(apikey, {
    fields: [apiKeyUsageLog.apiKeyId],
    references: [apikey.id]
  })
}))

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  memberships: many(member),
  invitations: many(invitation),
  managedDepartments: many(organizationDepartment),
  teams: many(teamMember),
  twoFactors: many(twoFactor),
  passkeys: many(passkey)
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id]
  })
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id]
  })
}))

export const organizationRelations = relations(organization, ({ many }) => ({
  departments: many(organizationDepartment),
  members: many(member),
  invitations: many(invitation),
  teams: many(team)
}))

export const organizationDepartmentRelations = relations(organizationDepartment, ({ many, one }) => ({
  organization: one(organization, {
    fields: [organizationDepartment.organizationId],
    references: [organization.id]
  }),
  manager: one(user, {
    fields: [organizationDepartment.managerUserId],
    references: [user.id]
  }),
  memberships: many(organizationDepartmentMember),
  parentDepartment: one(organizationDepartment, {
    fields: [organizationDepartment.parentDepartmentId],
    references: [organizationDepartment.id],
    relationName: "organizationDepartmentParent"
  })
}))

export const memberRelations = relations(member, ({ many, one }) => ({
  departmentMemberships: many(organizationDepartmentMember),
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id]
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id]
  })
}))

export const invitationRelations = relations(invitation, ({ one }) => ({
  department: one(organizationDepartment, {
    fields: [invitation.departmentId],
    references: [organizationDepartment.id]
  }),
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id]
  }),
  inviter: one(user, {
    fields: [invitation.inviterId],
    references: [user.id]
  })
}))

export const organizationDepartmentMemberRelations = relations(organizationDepartmentMember, ({ one }) => ({
  department: one(organizationDepartment, {
    fields: [organizationDepartmentMember.departmentId],
    references: [organizationDepartment.id]
  }),
  member: one(member, {
    fields: [organizationDepartmentMember.memberId],
    references: [member.id]
  }),
  organization: one(organization, {
    fields: [organizationDepartmentMember.organizationId],
    references: [organization.id]
  })
}))

export const teamRelations = relations(team, ({ many, one }) => ({
  organization: one(organization, {
    fields: [team.organizationId],
    references: [organization.id]
  }),
  members: many(teamMember)
}))

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, {
    fields: [teamMember.teamId],
    references: [team.id]
  }),
  user: one(user, {
    fields: [teamMember.userId],
    references: [user.id]
  })
}))

export const twoFactorRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id]
  })
}))

export const passkeyRelations = relations(passkey, ({ one }) => ({
  user: one(user, {
    fields: [passkey.userId],
    references: [user.id]
  })
}))
