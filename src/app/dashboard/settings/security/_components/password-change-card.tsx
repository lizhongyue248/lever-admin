"use client"

import { Loader2, LockKeyhole } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "@/server/better-auth/client"

type PasswordChangeCardProps = {
  hasPassword: boolean
}

const passwordChangeSchema = z
  .object({
    confirmPassword: z.string().min(1, "请再次输入新密码。"),
    currentPassword: z.string().min(1, "请输入当前密码。"),
    newPassword: z.string().min(8, "新密码至少 8 个字符。"),
    revokeOtherSessions: z.boolean()
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "两次输入的新密码不一致。",
    path: ["confirmPassword"]
  })

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>

const initialForm: PasswordChangeForm = {
  confirmPassword: "",
  currentPassword: "",
  newPassword: "",
  revokeOtherSessions: true
}

const firstError = (errors: z.ZodError<PasswordChangeForm>["issues"], path: keyof PasswordChangeForm) => errors.find((issue) => issue.path[0] === path)?.message

export const PasswordChangeCard = ({ hasPassword }: PasswordChangeCardProps) => {
  const router = useRouter()
  const [form, setForm] = useState<PasswordChangeForm>(initialForm)
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordChangeForm, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  const updateField = (field: keyof PasswordChangeForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsed = passwordChangeSchema.safeParse(form)

    if (!parsed.success) {
      setErrors({
        confirmPassword: firstError(parsed.error.issues, "confirmPassword"),
        currentPassword: firstError(parsed.error.issues, "currentPassword"),
        newPassword: firstError(parsed.error.issues, "newPassword")
      })
      return
    }

    setSubmitting(true)

    try {
      const result = await authClient.changePassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: parsed.data.revokeOtherSessions
      })

      if (result.error) {
        toast.error("密码更新失败，请检查当前密码。")
        return
      }

      setForm(initialForm)
      toast.success("密码已更新。")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="gap-4 rounded-lg py-5">
      <CardHeader className="px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <LockKeyhole className="size-4" />
            </span>
            <div>
              <CardTitle className="text-base">修改密码</CardTitle>
              <p className="mt-1 text-muted-foreground text-xs">{hasPassword ? "定期更新密码可降低凭证泄露风险。" : "当前账号尚未检测到密码凭证。"}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="security-current-password">当前密码</Label>
              <Input
                autoComplete="current-password"
                disabled={submitting}
                id="security-current-password"
                onChange={(event) => updateField("currentPassword", event.target.value)}
                type="password"
                value={form.currentPassword}
              />
              {errors.currentPassword ? <p className="text-destructive text-xs">{errors.currentPassword}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="security-new-password">新密码</Label>
              <Input
                autoComplete="new-password"
                disabled={submitting}
                id="security-new-password"
                onChange={(event) => updateField("newPassword", event.target.value)}
                type="password"
                value={form.newPassword}
              />
              {errors.newPassword ? <p className="text-destructive text-xs">{errors.newPassword}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="security-confirm-password">确认新密码</Label>
              <Input
                autoComplete="new-password"
                disabled={submitting}
                id="security-confirm-password"
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                type="password"
                value={form.confirmPassword}
              />
              {errors.confirmPassword ? <p className="text-destructive text-xs">{errors.confirmPassword}</p> : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.revokeOtherSessions}
                disabled={submitting}
                id="security-revoke-sessions"
                onCheckedChange={(checked) => updateField("revokeOtherSessions", checked === true)}
              />
              <Label className="text-xs" htmlFor="security-revoke-sessions">
                同时退出其他设备
              </Label>
            </div>
            <Button className="sm:w-fit" disabled={submitting} type="submit">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              更新密码
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
