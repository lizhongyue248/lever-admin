CREATE TABLE "auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_api_key_usage_log" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"deleted_by" text,
	"api_key_id" text,
	"config_id" text NOT NULL,
	"reference_id" text NOT NULL,
	"key_prefix" text,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"route_name" text,
	"status_code" integer NOT NULL,
	"success" boolean NOT NULL,
	"error_code" text,
	"failure_reason" text,
	"request_id" text,
	"ip_hash" text,
	"ip_country" text,
	"ip_region" text,
	"user_agent_hash" text,
	"user_agent_summary" text,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "auth_apikey" (
	"id" text PRIMARY KEY NOT NULL,
	"config_id" text DEFAULT 'user' NOT NULL,
	"name" text,
	"start" text,
	"reference_id" text NOT NULL,
	"prefix" text,
	"key" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp,
	"enabled" boolean DEFAULT true,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_time_window" integer,
	"rate_limit_max" integer,
	"request_count" integer DEFAULT 0,
	"remaining" integer,
	"last_request" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "auth_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp,
	"inviter_id" text NOT NULL,
	"department_id" text,
	"team_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "auth_organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "system_organization_department" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"deleted_by" text,
	"organization_id" text NOT NULL,
	"parent_department_id" text,
	"path" text NOT NULL,
	"depth" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"manager_user_id" text,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "system_organization_department_member" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"deleted_by" text,
	"organization_id" text NOT NULL,
	"department_id" text NOT NULL,
	"member_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"created_at" timestamp DEFAULT now(),
	"aaguid" text
);
--> statement-breakpoint
CREATE TABLE "system_platform_setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "system_request_log" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"deleted_at" timestamp,
	"deleted_by" text,
	"request_id" text NOT NULL,
	"source" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"route_name" text,
	"status_code" integer,
	"success" boolean NOT NULL,
	"error_code" text,
	"failure_reason" text,
	"duration_ms" integer,
	"user_id" text,
	"user_email" text,
	"user_name" text,
	"user_role" text,
	"organization_id" text,
	"organization_name" text,
	"session_id" text,
	"impersonated_by" text,
	"api_key_id" text,
	"request_query_summary" text,
	"request_body_summary" text,
	"request_body_status" text DEFAULT 'not_collected' NOT NULL,
	"ip_hash" text,
	"ip_address" text,
	"ip_country" text,
	"ip_region" text,
	"user_agent_hash" text,
	"user_agent_raw" text,
	"user_agent_summary" text,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"risk_reasons" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"impersonated_by" text,
	"active_organization_id" text,
	"active_team_id" text,
	"user_id" text NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_team" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "auth_team_member" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "auth_two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"two_factor_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_api_key_usage_log" ADD CONSTRAINT "api_key_usage_log_api_key_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."auth_apikey"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_invitation" ADD CONSTRAINT "auth_invitation_organization_id_auth_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."auth_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_invitation" ADD CONSTRAINT "auth_invitation_inviter_id_auth_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_invitation" ADD CONSTRAINT "invitation_department_fk" FOREIGN KEY ("department_id") REFERENCES "public"."system_organization_department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_member" ADD CONSTRAINT "auth_member_organization_id_auth_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."auth_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_member" ADD CONSTRAINT "auth_member_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_organization_department" ADD CONSTRAINT "org_department_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."auth_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_organization_department" ADD CONSTRAINT "org_department_parent_fk" FOREIGN KEY ("parent_department_id") REFERENCES "public"."system_organization_department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_organization_department" ADD CONSTRAINT "org_department_manager_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."auth_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_organization_department_member" ADD CONSTRAINT "org_department_member_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."auth_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_organization_department_member" ADD CONSTRAINT "org_department_member_department_fk" FOREIGN KEY ("department_id") REFERENCES "public"."system_organization_department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_organization_department_member" ADD CONSTRAINT "org_department_member_member_fk" FOREIGN KEY ("member_id") REFERENCES "public"."auth_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_passkey" ADD CONSTRAINT "auth_passkey_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_team" ADD CONSTRAINT "auth_team_organization_id_auth_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."auth_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_team_member" ADD CONSTRAINT "auth_team_member_team_id_auth_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."auth_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_team_member" ADD CONSTRAINT "auth_team_member_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_two_factor" ADD CONSTRAINT "auth_two_factor_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_account_user_id_idx" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "system_api_key_usage_log_api_key_created_at_idx" ON "system_api_key_usage_log" USING btree ("api_key_id","created_at");--> statement-breakpoint
CREATE INDEX "system_api_key_usage_log_config_reference_created_at_idx" ON "system_api_key_usage_log" USING btree ("config_id","reference_id","created_at");--> statement-breakpoint
CREATE INDEX "system_api_key_usage_log_created_at_idx" ON "system_api_key_usage_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "auth_apikey_config_id_idx" ON "auth_apikey" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX "auth_apikey_reference_id_idx" ON "auth_apikey" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "auth_apikey_key_idx" ON "auth_apikey" USING btree ("key");--> statement-breakpoint
CREATE INDEX "auth_invitation_organization_id_idx" ON "auth_invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "auth_invitation_email_idx" ON "auth_invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "auth_invitation_status_idx" ON "auth_invitation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "auth_invitation_department_id_idx" ON "auth_invitation" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "auth_invitation_team_id_idx" ON "auth_invitation" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "auth_member_organization_id_idx" ON "auth_member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "auth_member_user_id_idx" ON "auth_member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_member_organization_user_idx" ON "auth_member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_organization_slug_idx" ON "auth_organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "auth_organization_status_idx" ON "auth_organization" USING btree ("status");--> statement-breakpoint
CREATE INDEX "system_organization_department_org_idx" ON "system_organization_department" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "system_organization_department_parent_idx" ON "system_organization_department" USING btree ("parent_department_id");--> statement-breakpoint
CREATE INDEX "system_organization_department_path_idx" ON "system_organization_department" USING btree ("path");--> statement-breakpoint
CREATE INDEX "system_organization_department_status_idx" ON "system_organization_department" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "system_organization_department_sibling_name_idx" ON "system_organization_department" USING btree ("organization_id","parent_department_id","name") WHERE "system_organization_department"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "system_organization_department_member_org_idx" ON "system_organization_department_member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "system_organization_department_member_department_idx" ON "system_organization_department_member" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "system_organization_department_member_member_idx" ON "system_organization_department_member" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "system_organization_department_member_unique_idx" ON "system_organization_department_member" USING btree ("department_id","member_id") WHERE "system_organization_department_member"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "auth_passkey_user_id_idx" ON "auth_passkey" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_passkey_credential_id_idx" ON "auth_passkey" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "system_request_log_created_at_idx" ON "system_request_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "system_request_log_user_created_at_idx" ON "system_request_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "system_request_log_request_id_idx" ON "system_request_log" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "system_request_log_path_created_at_idx" ON "system_request_log" USING btree ("path","created_at");--> statement-breakpoint
CREATE INDEX "system_request_log_success_created_at_idx" ON "system_request_log" USING btree ("success","created_at");--> statement-breakpoint
CREATE INDEX "system_request_log_risk_created_at_idx" ON "system_request_log" USING btree ("risk_level","created_at");--> statement-breakpoint
CREATE INDEX "auth_session_user_id_idx" ON "auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_team_organization_id_idx" ON "auth_team" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "auth_team_member_team_id_idx" ON "auth_team_member" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "auth_team_member_user_id_idx" ON "auth_team_member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_team_member_team_user_idx" ON "auth_team_member" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "auth_two_factor_secret_idx" ON "auth_two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "auth_two_factor_user_id_idx" ON "auth_two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_verification_identifier_idx" ON "auth_verification" USING btree ("identifier");