import { z } from "zod"

export const emailSchema = z.string().min(1, "请输入邮箱。").email("请输入有效的邮箱地址。")
export const passwordSchema = z.string().min(8, "密码至少需要 8 位。")

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "请输入密码。")
})

export const signUpSchema = z
  .object({
    confirmPassword: passwordSchema,
    email: emailSchema,
    name: z.string().min(1, "请输入名称。").max(64, "名称不能超过 64 个字符。"),
    password: passwordSchema
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "两次输入的密码不一致。",
    path: ["confirmPassword"]
  })

export const forgotPasswordSchema = z.object({
  email: emailSchema
})

export const resetPasswordSchema = z
  .object({
    confirmPassword: passwordSchema,
    password: passwordSchema
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "两次输入的新密码不一致。",
    path: ["confirmPassword"]
  })

export const verifyEmailSchema = z.object({
  email: emailSchema
})

export const twoFactorTotpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "请输入 6 位数字验证码。"),
  trustDevice: z.boolean()
})

export const twoFactorBackupCodeSchema = z.object({
  code: z.string().min(1, "请输入备用恢复码。").max(64, "备用恢复码格式不正确。"),
  trustDevice: z.boolean()
})

export type FieldErrors<TField extends string> = Partial<Record<TField, string>>

export const getZodFieldErrors = <TField extends string>(error: z.ZodError): FieldErrors<TField> => {
  const fieldErrors: FieldErrors<TField> = {}

  for (const issue of error.issues) {
    const fieldName = issue.path[0]

    if (typeof fieldName === "string" && !fieldErrors[fieldName as TField]) {
      fieldErrors[fieldName as TField] = issue.message
    }
  }

  return fieldErrors
}

export type SignInValues = z.infer<typeof signInSchema>
export type SignUpValues = z.infer<typeof signUpSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
export type TwoFactorBackupCodeValues = z.infer<typeof twoFactorBackupCodeSchema>
export type TwoFactorTotpValues = z.infer<typeof twoFactorTotpSchema>
export type VerifyEmailValues = z.infer<typeof verifyEmailSchema>
