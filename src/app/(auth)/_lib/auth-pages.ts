export type AuthPageKey = "sign-in" | "sign-up" | "forgot-password" | "reset-password" | "verify-email"

export interface AuthPageContent {
  imageAlt: string
  imageDark: string
  imageLight: string
}

export const authPages: Record<AuthPageKey, AuthPageContent> = {
  "sign-in": {
    imageAlt: "登录页安全身份验证插画",
    imageDark: "/auth/sign-in-dark.png",
    imageLight: "/auth/sign-in-light.png"
  },
  "sign-up": {
    imageAlt: "注册页账号创建插画",
    imageDark: "/auth/sign-up-dark.png",
    imageLight: "/auth/sign-up-light.png"
  },
  "forgot-password": {
    imageAlt: "忘记密码页邮件找回插画",
    imageDark: "/auth/forgot-password-dark.png",
    imageLight: "/auth/forgot-password-light.png"
  },
  "reset-password": {
    imageAlt: "重置密码页凭据更新插画",
    imageDark: "/auth/reset-password-dark.png",
    imageLight: "/auth/reset-password-light.png"
  },
  "verify-email": {
    imageAlt: "邮箱验证页身份确认插画",
    imageDark: "/auth/verify-email-dark.png",
    imageLight: "/auth/verify-email-light.png"
  }
}
