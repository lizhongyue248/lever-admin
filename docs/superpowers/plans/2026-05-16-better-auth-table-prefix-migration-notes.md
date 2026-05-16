# Better Auth Table Prefix Migration Notes

本说明只记录数据库迁移形态，不代表已经执行迁移。

## 执行规则

- 执行前必须备份数据库。
- 需要用户单独确认后再运行迁移命令。
- 优先使用 `rename` 保留已有认证、会话、组织、成员、邀请和 API Key 数据。
- 不要让自动迁移把旧表 drop 后再 create 新表。

## 表重命名

```sql
alter table if exists "system_user" rename to "auth_user";
alter table if exists "system_session" rename to "auth_session";
alter table if exists "system_account" rename to "auth_account";
alter table if exists "system_verification" rename to "auth_verification";
alter table if exists "system_organization" rename to "auth_organization";
alter table if exists "system_member" rename to "auth_member";
alter table if exists "system_invitation" rename to "auth_invitation";
alter table if exists "system_team" rename to "auth_team";
alter table if exists "system_team_member" rename to "auth_team_member";
alter table if exists "system_two_factor" rename to "auth_two_factor";
alter table if exists "system_passkey" rename to "auth_passkey";
alter table if exists "system_apikey" rename to "auth_apikey";
```

## 索引重命名

```sql
alter index if exists "system_session_user_id_idx" rename to "auth_session_user_id_idx";
alter index if exists "system_account_user_id_idx" rename to "auth_account_user_id_idx";
alter index if exists "system_verification_identifier_idx" rename to "auth_verification_identifier_idx";
alter index if exists "system_organization_slug_idx" rename to "auth_organization_slug_idx";
alter index if exists "system_organization_status_idx" rename to "auth_organization_status_idx";
alter index if exists "system_member_organization_id_idx" rename to "auth_member_organization_id_idx";
alter index if exists "system_member_user_id_idx" rename to "auth_member_user_id_idx";
alter index if exists "system_member_organization_user_idx" rename to "auth_member_organization_user_idx";
alter index if exists "system_invitation_organization_id_idx" rename to "auth_invitation_organization_id_idx";
alter index if exists "system_invitation_email_idx" rename to "auth_invitation_email_idx";
alter index if exists "system_invitation_status_idx" rename to "auth_invitation_status_idx";
alter index if exists "system_invitation_department_id_idx" rename to "auth_invitation_department_id_idx";
alter index if exists "system_invitation_team_id_idx" rename to "auth_invitation_team_id_idx";
alter index if exists "system_team_organization_id_idx" rename to "auth_team_organization_id_idx";
alter index if exists "system_team_member_team_id_idx" rename to "auth_team_member_team_id_idx";
alter index if exists "system_team_member_user_id_idx" rename to "auth_team_member_user_id_idx";
alter index if exists "system_team_member_team_user_idx" rename to "auth_team_member_team_user_idx";
alter index if exists "system_two_factor_secret_idx" rename to "auth_two_factor_secret_idx";
alter index if exists "system_two_factor_user_id_idx" rename to "auth_two_factor_user_id_idx";
alter index if exists "system_passkey_user_id_idx" rename to "auth_passkey_user_id_idx";
alter index if exists "system_passkey_credential_id_idx" rename to "auth_passkey_credential_id_idx";
alter index if exists "system_apikey_config_id_idx" rename to "auth_apikey_config_id_idx";
alter index if exists "system_apikey_reference_id_idx" rename to "auth_apikey_reference_id_idx";
alter index if exists "system_apikey_key_idx" rename to "auth_apikey_key_idx";
```

## 保持不变的产品表

这些表继续使用 `system_*` 前缀：

- `system_platform_setting`
- `system_api_key_usage_log`
- `system_request_log`
- `system_organization_department`
- `system_organization_department_member`
