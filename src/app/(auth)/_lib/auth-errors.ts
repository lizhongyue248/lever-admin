export interface AuthErrorLike {
  code?: string
  message?: string
  status?: number
  statusText?: string
}

const knownErrorMessages: Record<string, string> = {
  EMAIL_NOT_VERIFIED: "邮箱尚未验证，请先完成邮箱验证。",
  INVALID_EMAIL_OR_PASSWORD: "邮箱或密码不正确。",
  INVALID_TOKEN: "验证链接无效或已过期，请重新发送验证邮件。",
  INVALID_BACKUP_CODE: "备用恢复码无效或已被使用。",
  INVALID_PASSWORD: "邮箱或密码不正确。",
  INVALID_TWO_FACTOR_CODE: "验证码无效，请检查认证器应用中的 6 位验证码。",
  TOKEN_EXPIRED: "验证链接已过期，请重新发送验证邮件。",
  TWO_FACTOR_COOKIE_EXPIRED: "二次验证会话已过期，请重新登录。",
  TWO_FACTOR_COOKIE_NOT_FOUND: "二次验证会话已过期，请重新登录。",
  USER_ALREADY_EXISTS: "注册请求未完成，请检查填写信息后重试。",
  USER_BANNED: "当前账号暂时无法登录，请联系管理员。"
}

export const getAuthErrorMessage = (error: AuthErrorLike | null | undefined, fallback = "操作失败，请稍后重试。"): string => {
  if (!error) {
    return fallback
  }

  const knownMessage = error.code ? knownErrorMessages[error.code] : undefined

  if (knownMessage) {
    return knownMessage
  }

  if (error.status === 401 || error.status === 403) {
    return "当前账号无法完成该操作，请确认权限或联系管理员。"
  }

  if (error.message?.toLowerCase().includes("email")) {
    return "邮箱或密码不正确。"
  }

  return error.message || error.statusText || fallback
}
