"use client"

import { Mail, Save, Send, ShieldAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useEffect, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { EMAIL_PROVIDER_CONSOLE, EMAIL_PROVIDER_RESEND, EMAIL_PROVIDER_SMTP, EMAIL_PROVIDERS } from "@/lib/const"
import { api, type RouterOutputs } from "@/trpc/react"

type EmailSettings = RouterOutputs["adminPlatformSetting"]["getEmailSettings"]
type Provider = EmailSettings["provider"]

type FieldErrors = Partial<Record<"from" | "provider" | "resendApiKey" | "smtpHost" | "smtpPassword" | "smtpPort" | "smtpUser" | "testTo", string>>

type KnownFieldName = keyof FieldErrors

const knownFieldNames = ["from", "provider", "resendApiKey", "smtpHost", "smtpPassword", "smtpPort", "smtpUser"] as const satisfies readonly KnownFieldName[]

const trpcFieldErrorsSchema = z.object({
  from: z.array(z.string()).optional(),
  provider: z.array(z.string()).optional(),
  resendApiKey: z.array(z.string()).optional(),
  smtpHost: z.array(z.string()).optional(),
  smtpPassword: z.array(z.string()).optional(),
  smtpPort: z.array(z.string()).optional(),
  smtpUser: z.array(z.string()).optional()
})

const formSchema = z.object({
  from: z.string().trim().min(1, "发件人不能为空。"),
  provider: z.enum(EMAIL_PROVIDERS),
  resendApiKey: z.string().trim(),
  smtpHost: z.string().trim(),
  smtpPassword: z.string().trim(),
  smtpPort: z.coerce.number().int().positive("SMTP Port 必须为正整数。"),
  smtpSecure: z.boolean(),
  smtpUser: z.string().trim()
})

const testSchema = z.object({
  testTo: z.string().trim().email("请输入有效的测试收件人邮箱。")
})

export const EmailSettingsCard = ({ initialEmailSettings }: { initialEmailSettings: EmailSettings }) => {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [savedEmailSettings, setSavedEmailSettings] = useState(initialEmailSettings)
  const [provider, setProvider] = useState<Provider>(initialEmailSettings.provider)
  const [from, setFrom] = useState(initialEmailSettings.from)
  const [resendApiKey, setResendApiKey] = useState("")
  const [smtpHost, setSmtpHost] = useState(initialEmailSettings.smtpHost)
  const [smtpPort, setSmtpPort] = useState(String(initialEmailSettings.smtpPort))
  const [smtpUser, setSmtpUser] = useState(initialEmailSettings.smtpUser)
  const [smtpPassword, setSmtpPassword] = useState("")
  const [smtpSecure, setSmtpSecure] = useState(initialEmailSettings.smtpSecure)
  const [testTo, setTestTo] = useState("")
  const [clearResendApiKey, setClearResendApiKey] = useState(false)
  const [clearSmtpPassword, setClearSmtpPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const update = api.adminPlatformSetting.updateEmailSettings.useMutation({
    onError: (error) => {
      const parsedFieldErrors = trpcFieldErrorsSchema.safeParse(error.data?.zodError?.fieldErrors)

      if (parsedFieldErrors.success) {
        const nextErrors: FieldErrors = {}

        for (const fieldName of knownFieldNames) {
          const message = parsedFieldErrors.data[fieldName]?.[0]

          if (message) {
            nextErrors[fieldName] = message
          }
        }

        if (Object.keys(nextErrors).length > 0) {
          setErrors((current) => ({ ...current, ...nextErrors }))
          setFormError(null)
          return
        }
      }

      setFormError(error.message)
    },
    onSuccess: (settings) => {
      setSavedEmailSettings(settings)
      setProvider(settings.provider)
      setFrom(settings.from)
      setSmtpHost(settings.smtpHost)
      setSmtpPort(String(settings.smtpPort))
      setSmtpUser(settings.smtpUser)
      setSmtpSecure(settings.smtpSecure)
      setResendApiKey("")
      setSmtpPassword("")
      setClearResendApiKey(false)
      setClearSmtpPassword(false)
      setErrors({})
      setFormError(null)
      toast.success("邮件服务配置已保存。")
      router.refresh()
    }
  })

  const sendTest = api.adminPlatformSetting.sendTestEmail.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: (result) => toast.success(`测试邮件已通过 ${result.provider} 发送。`)
  })

  const handleProviderChange = (value: string) => {
    const parsed = formSchema.shape.provider.safeParse(value)

    if (!parsed.success) {
      return
    }

    const nextProvider: Provider = parsed.data
    setProvider(nextProvider)
    setFormError(null)
    setErrors((current) => ({
      from: current.from,
      provider: undefined,
      resendApiKey: undefined,
      smtpHost: undefined,
      smtpPassword: undefined,
      smtpPort: undefined,
      smtpUser: undefined,
      testTo: current.testTo
    }))

    if (nextProvider !== EMAIL_PROVIDER_RESEND) {
      setClearResendApiKey(false)
    }

    if (nextProvider !== EMAIL_PROVIDER_SMTP) {
      setClearSmtpPassword(false)
    }
  }

  const submitEmailSettings = () => {
    const formValues = {
      from,
      provider,
      resendApiKey: provider === EMAIL_PROVIDER_RESEND ? resendApiKey : "",
      smtpHost: provider === EMAIL_PROVIDER_SMTP ? smtpHost : "",
      smtpPassword: provider === EMAIL_PROVIDER_SMTP ? smtpPassword : "",
      smtpPort: provider === EMAIL_PROVIDER_SMTP ? smtpPort : String(savedEmailSettings.smtpPort),
      smtpSecure: provider === EMAIL_PROVIDER_SMTP ? smtpSecure : false,
      smtpUser: provider === EMAIL_PROVIDER_SMTP ? smtpUser : ""
    }
    const parsed = formSchema.safeParse(formValues)

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      setErrors({
        from: fieldErrors.from?.[0],
        provider: fieldErrors.provider?.[0],
        resendApiKey: fieldErrors.resendApiKey?.[0],
        smtpHost: fieldErrors.smtpHost?.[0],
        smtpPassword: fieldErrors.smtpPassword?.[0],
        smtpPort: fieldErrors.smtpPort?.[0],
        smtpUser: fieldErrors.smtpUser?.[0]
      })
      setFormError(null)
      return
    }

    setErrors({})
    setFormError(null)
    update.mutate({
      ...parsed.data,
      clearResendApiKey: parsed.data.provider === EMAIL_PROVIDER_RESEND ? clearResendApiKey : false,
      clearSmtpPassword: parsed.data.provider === EMAIL_PROVIDER_SMTP ? clearSmtpPassword : false,
      resendApiKey: parsed.data.provider === EMAIL_PROVIDER_RESEND ? parsed.data.resendApiKey : "",
      smtpHost: parsed.data.provider === EMAIL_PROVIDER_SMTP ? parsed.data.smtpHost : "",
      smtpPassword: parsed.data.provider === EMAIL_PROVIDER_SMTP ? parsed.data.smtpPassword : "",
      smtpSecure: parsed.data.provider === EMAIL_PROVIDER_SMTP ? parsed.data.smtpSecure : false,
      smtpUser: parsed.data.provider === EMAIL_PROVIDER_SMTP ? parsed.data.smtpUser : ""
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitEmailSettings()
  }

  const handleSendTest = () => {
    const parsed = testSchema.safeParse({ testTo })

    if (!parsed.success) {
      setErrors((current) => ({ ...current, testTo: parsed.error.flatten().fieldErrors.testTo?.[0] }))
      return
    }

    setErrors((current) => ({ ...current, testTo: undefined }))
    sendTest.mutate({ to: parsed.data.testTo })
  }

  const resendApiKeyConfigured = savedEmailSettings.resendApiKeyConfigured && !clearResendApiKey
  const smtpPasswordConfigured = savedEmailSettings.smtpPasswordConfigured && !clearSmtpPassword

  return (
    <Card className="min-w-0 rounded-lg shadow-sm">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="size-4 text-primary" />
          邮件服务
        </CardTitle>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-5 px-5 pb-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <form className="min-w-0 space-y-4" data-hydrated={hydrated ? "true" : "false"} data-testid="email-settings-form" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email-provider">Provider</Label>
            <Select disabled={update.isPending} onValueChange={handleProviderChange} value={provider}>
              <SelectTrigger aria-describedby={errors.provider ? "email-provider-error" : undefined} aria-invalid={Boolean(errors.provider)} className="w-full" id="email-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMAIL_PROVIDER_CONSOLE}>Console</SelectItem>
                <SelectItem value={EMAIL_PROVIDER_RESEND}>Resend</SelectItem>
                <SelectItem value={EMAIL_PROVIDER_SMTP}>SMTP</SelectItem>
              </SelectContent>
            </Select>
            {errors.provider ? (
              <p className="text-destructive text-xs" id="email-provider-error">
                {errors.provider}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-from">发件人</Label>
            <Input
              aria-describedby={errors.from ? "email-from-error" : undefined}
              aria-invalid={Boolean(errors.from)}
              disabled={update.isPending}
              id="email-from"
              onChange={(event) => setFrom(event.target.value)}
              value={from}
            />
            {errors.from ? (
              <p className="text-destructive text-xs" id="email-from-error">
                {errors.from}
              </p>
            ) : null}
          </div>

          {provider === EMAIL_PROVIDER_RESEND ? (
            <div className="space-y-2">
              <Label htmlFor="resend-api-key">Resend API Key</Label>
              <Input
                aria-describedby={errors.resendApiKey ? "resend-api-key-error" : undefined}
                aria-invalid={Boolean(errors.resendApiKey)}
                disabled={update.isPending}
                id="resend-api-key"
                onChange={(event) => setResendApiKey(event.target.value)}
                placeholder={resendApiKeyConfigured ? "已配置，留空不修改" : "输入 Resend API Key"}
                type="password"
                value={resendApiKey}
              />
              {errors.resendApiKey ? (
                <p className="text-destructive text-xs" id="resend-api-key-error">
                  {errors.resendApiKey}
                </p>
              ) : null}
              {clearResendApiKey ? <p className="text-amber-600 text-xs dark:text-amber-400">已标记清除，保存后生效。</p> : null}
              <Button
                disabled={!savedEmailSettings.resendApiKeyConfigured || update.isPending}
                onClick={() => setClearResendApiKey((current) => !current)}
                size="sm"
                type="button"
                variant="outline"
              >
                {clearResendApiKey ? "取消清除 Key" : "清除已保存 Key"}
              </Button>
            </div>
          ) : null}

          {provider === EMAIL_PROVIDER_SMTP ? (
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  aria-describedby={errors.smtpHost ? "smtp-host-error" : undefined}
                  aria-invalid={Boolean(errors.smtpHost)}
                  disabled={update.isPending}
                  id="smtp-host"
                  onChange={(event) => setSmtpHost(event.target.value)}
                  value={smtpHost}
                />
                {errors.smtpHost ? (
                  <p className="text-destructive text-xs" id="smtp-host-error">
                    {errors.smtpHost}
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  aria-describedby={errors.smtpPort ? "smtp-port-error" : undefined}
                  aria-invalid={Boolean(errors.smtpPort)}
                  disabled={update.isPending}
                  id="smtp-port"
                  inputMode="numeric"
                  onChange={(event) => setSmtpPort(event.target.value)}
                  value={smtpPort}
                />
                {errors.smtpPort ? (
                  <p className="text-destructive text-xs" id="smtp-port-error">
                    {errors.smtpPort}
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="smtp-user">SMTP Username</Label>
                <Input
                  aria-describedby={errors.smtpUser ? "smtp-user-error" : undefined}
                  aria-invalid={Boolean(errors.smtpUser)}
                  disabled={update.isPending}
                  id="smtp-user"
                  onChange={(event) => setSmtpUser(event.target.value)}
                  value={smtpUser}
                />
                {errors.smtpUser ? (
                  <p className="text-destructive text-xs" id="smtp-user-error">
                    {errors.smtpUser}
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="smtp-password">SMTP Password</Label>
                <Input
                  aria-describedby={errors.smtpPassword ? "smtp-password-error" : undefined}
                  aria-invalid={Boolean(errors.smtpPassword)}
                  disabled={update.isPending}
                  id="smtp-password"
                  onChange={(event) => setSmtpPassword(event.target.value)}
                  placeholder={smtpPasswordConfigured ? "已配置，留空不修改" : "输入 SMTP 密码"}
                  type="password"
                  value={smtpPassword}
                />
                {errors.smtpPassword ? (
                  <p className="text-destructive text-xs" id="smtp-password-error">
                    {errors.smtpPassword}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch checked={smtpSecure} disabled={update.isPending} id="smtp-secure" onCheckedChange={setSmtpSecure} />
                <Label htmlFor="smtp-secure">启用 SSL/TLS</Label>
              </div>
              <div className="sm:col-span-2">
                {clearSmtpPassword ? <p className="mb-2 text-amber-600 text-xs dark:text-amber-400">已标记清除，保存后生效。</p> : null}
                <Button
                  disabled={!savedEmailSettings.smtpPasswordConfigured || update.isPending}
                  onClick={() => setClearSmtpPassword((current) => !current)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {clearSmtpPassword ? "取消清除密码" : "清除已保存密码"}
                </Button>
              </div>
            </div>
          ) : null}

          {formError ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs">{formError}</p> : null}

          <div className="flex justify-start border-t pt-4 sm:justify-end">
            <Button className="w-full sm:w-auto" disabled={update.isPending} onClick={submitEmailSettings} type="button">
              <Save className="size-4" />
              保存配置
            </Button>
          </div>
        </form>

        <div className="min-w-0 space-y-4">
          <div className="min-w-0 space-y-3 rounded-lg border bg-background/60 p-4 dark:bg-muted/20">
            <Label htmlFor="test-email">测试收件人</Label>
            <Input
              aria-describedby={errors.testTo ? "test-email-error" : undefined}
              aria-invalid={Boolean(errors.testTo)}
              disabled={sendTest.isPending}
              id="test-email"
              inputMode="email"
              onChange={(event) => setTestTo(event.target.value)}
              placeholder="ops@example.io"
              value={testTo}
            />
            {errors.testTo ? (
              <p className="text-destructive text-xs" id="test-email-error">
                {errors.testTo}
              </p>
            ) : null}
            <Button className="w-full" disabled={sendTest.isPending} onClick={handleSendTest} type="button" variant="secondary">
              <Send className="size-4" />
              发送测试邮件
            </Button>
          </div>

          <Alert className="border-amber-500/40 bg-amber-500/10">
            <ShieldAlert className="size-4" />
            <AlertTitle>安全提示</AlertTitle>
            <AlertDescription>密钥和密码保存后不会回显明文；留空保存会保留已有敏感值。</AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  )
}
