"use client"

import { CheckCircle2, HardDrive, Save, ShieldAlert, Trash2, UploadCloud } from "lucide-react"
import { useRouter } from "next/navigation"
import { type ChangeEvent, type FormEvent, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { STORAGE_PROVIDER_LOCAL, STORAGE_PROVIDER_S3, STORAGE_PROVIDERS } from "@/lib/const"
import { api, type RouterOutputs } from "@/trpc/react"

type StorageSettings = RouterOutputs["adminPlatformSetting"]["getStorageSettings"]
type Provider = StorageSettings["provider"]

type FieldErrors = Partial<
  Record<
    | "clearS3AccessKeyId"
    | "clearS3SecretAccessKey"
    | "localPath"
    | "provider"
    | "publicBaseUrl"
    | "s3AccessKeyId"
    | "s3Bucket"
    | "s3Endpoint"
    | "s3ForcePathStyle"
    | "s3Region"
    | "s3SecretAccessKey",
    string
  >
>

type KnownFieldName = keyof FieldErrors

const knownFieldNames = [
  "clearS3AccessKeyId",
  "clearS3SecretAccessKey",
  "localPath",
  "provider",
  "publicBaseUrl",
  "s3AccessKeyId",
  "s3Bucket",
  "s3Endpoint",
  "s3ForcePathStyle",
  "s3Region",
  "s3SecretAccessKey"
] as const satisfies readonly KnownFieldName[]

const trpcFieldErrorsSchema = z.object({
  clearS3AccessKeyId: z.array(z.string()).optional(),
  clearS3SecretAccessKey: z.array(z.string()).optional(),
  localPath: z.array(z.string()).optional(),
  provider: z.array(z.string()).optional(),
  publicBaseUrl: z.array(z.string()).optional(),
  s3AccessKeyId: z.array(z.string()).optional(),
  s3Bucket: z.array(z.string()).optional(),
  s3Endpoint: z.array(z.string()).optional(),
  s3ForcePathStyle: z.array(z.string()).optional(),
  s3Region: z.array(z.string()).optional(),
  s3SecretAccessKey: z.array(z.string()).optional()
})

const optionalHttpUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (!value) {
        return true
      }

      const parsed = z.url().safeParse(value)

      if (!parsed.success) {
        return false
      }

      const protocol = new URL(value).protocol

      return protocol === "http:" || protocol === "https:"
    },
    { message: "请输入有效的 HTTP(S) URL。" }
  )

const formSchema = z
  .object({
    clearS3AccessKeyId: z.boolean(),
    clearS3SecretAccessKey: z.boolean(),
    localPath: z.string().trim(),
    provider: z.enum(STORAGE_PROVIDERS),
    publicBaseUrl: optionalHttpUrlSchema,
    s3AccessKeyId: z.string().trim(),
    s3AccessKeyIdConfigured: z.boolean(),
    s3Bucket: z.string().trim(),
    s3Endpoint: optionalHttpUrlSchema,
    s3ForcePathStyle: z.boolean(),
    s3Region: z.string().trim(),
    s3SecretAccessKey: z.string().trim(),
    s3SecretAccessKeyConfigured: z.boolean()
  })
  .superRefine((value, ctx) => {
    if (value.provider === STORAGE_PROVIDER_LOCAL && !value.localPath) {
      ctx.addIssue({ code: "custom", message: "本地上传路径不能为空。", path: ["localPath"] })
    }

    if (value.provider === STORAGE_PROVIDER_S3) {
      if (!value.s3Bucket) {
        ctx.addIssue({ code: "custom", message: "S3 Bucket 不能为空。", path: ["s3Bucket"] })
      }

      if (!value.s3Endpoint && !value.s3Region) {
        ctx.addIssue({ code: "custom", message: "S3 Region 或 S3 Endpoint 至少填写一项。", path: ["s3Region"] })
      }

      if (!value.s3AccessKeyId && (!value.s3AccessKeyIdConfigured || value.clearS3AccessKeyId)) {
        ctx.addIssue({ code: "custom", message: "S3 Access Key 不能为空。", path: ["s3AccessKeyId"] })
      }

      if (!value.s3SecretAccessKey && (!value.s3SecretAccessKeyConfigured || value.clearS3SecretAccessKey)) {
        ctx.addIssue({ code: "custom", message: "S3 Secret Key 不能为空。", path: ["s3SecretAccessKey"] })
      }
    }
  })

export const StorageSettingsCard = ({ initialStorageSettings }: { initialStorageSettings: StorageSettings }) => {
  const router = useRouter()
  const [savedStorageSettings, setSavedStorageSettings] = useState(initialStorageSettings)
  const [provider, setProvider] = useState<Provider>(initialStorageSettings.provider)
  const [localPath, setLocalPath] = useState(initialStorageSettings.localPath)
  const [publicBaseUrl, setPublicBaseUrl] = useState(initialStorageSettings.publicBaseUrl)
  const [s3Endpoint, setS3Endpoint] = useState(initialStorageSettings.s3Endpoint)
  const [s3Region, setS3Region] = useState(initialStorageSettings.s3Region)
  const [s3Bucket, setS3Bucket] = useState(initialStorageSettings.s3Bucket)
  const [s3AccessKeyId, setS3AccessKeyId] = useState("")
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState("")
  const [s3ForcePathStyle, setS3ForcePathStyle] = useState(initialStorageSettings.s3ForcePathStyle)
  const [clearS3AccessKeyId, setClearS3AccessKeyId] = useState(false)
  const [clearS3SecretAccessKey, setClearS3SecretAccessKey] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [lastTestResult, setLastTestResult] = useState<{ key: string; provider: Provider } | null>(null)

  const update = api.adminPlatformSetting.updateStorageSettings.useMutation({
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
      setSavedStorageSettings(settings)
      setProvider(settings.provider)
      setLocalPath(settings.localPath)
      setPublicBaseUrl(settings.publicBaseUrl)
      setS3Endpoint(settings.s3Endpoint)
      setS3Region(settings.s3Region)
      setS3Bucket(settings.s3Bucket)
      setS3ForcePathStyle(settings.s3ForcePathStyle)
      setS3AccessKeyId("")
      setS3SecretAccessKey("")
      setClearS3AccessKeyId(false)
      setClearS3SecretAccessKey(false)
      setLastTestResult(null)
      setErrors({})
      setFormError(null)
      toast.success("文件存储配置已保存。")
      router.refresh()
    }
  })

  const testUpload = api.adminPlatformSetting.testStorageUpload.useMutation({
    onError: (error) => {
      setFormError(error.message)
      toast.error(error.message)
    },
    onSuccess: (result) => {
      setLastTestResult({ key: result.key, provider: result.provider })
      setFormError(null)
      toast.success(`上传测试已通过 ${result.provider} 完成。`)
    }
  })

  const handleProviderChange = (value: string) => {
    const parsed = formSchema.shape.provider.safeParse(value)

    if (!parsed.success) {
      return
    }

    const nextProvider: Provider = parsed.data
    setProvider(nextProvider)
    setFormError(null)
    setLastTestResult(null)
    setErrors((current) => ({
      clearS3AccessKeyId: undefined,
      clearS3SecretAccessKey: undefined,
      localPath: nextProvider === STORAGE_PROVIDER_LOCAL ? current.localPath : undefined,
      provider: undefined,
      publicBaseUrl: current.publicBaseUrl,
      s3AccessKeyId: undefined,
      s3Bucket: undefined,
      s3Endpoint: undefined,
      s3ForcePathStyle: undefined,
      s3Region: undefined,
      s3SecretAccessKey: undefined
    }))

    if (nextProvider !== STORAGE_PROVIDER_S3) {
      setClearS3AccessKeyId(false)
      setClearS3SecretAccessKey(false)
    }
  }

  const handleTextFieldChange = (setter: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => {
    setter(event.target.value)
    setLastTestResult(null)
  }

  const handleS3ForcePathStyleChange = (checked: boolean) => {
    setS3ForcePathStyle(checked)
    setLastTestResult(null)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formValues = {
      clearS3AccessKeyId,
      clearS3SecretAccessKey,
      localPath,
      provider,
      publicBaseUrl,
      s3AccessKeyId: provider === STORAGE_PROVIDER_S3 ? s3AccessKeyId : "",
      s3AccessKeyIdConfigured: savedStorageSettings.s3AccessKeyIdConfigured,
      s3Bucket: provider === STORAGE_PROVIDER_S3 ? s3Bucket : "",
      s3Endpoint: provider === STORAGE_PROVIDER_S3 ? s3Endpoint : "",
      s3ForcePathStyle: provider === STORAGE_PROVIDER_S3 ? s3ForcePathStyle : false,
      s3Region: provider === STORAGE_PROVIDER_S3 ? s3Region : "",
      s3SecretAccessKey: provider === STORAGE_PROVIDER_S3 ? s3SecretAccessKey : "",
      s3SecretAccessKeyConfigured: savedStorageSettings.s3SecretAccessKeyConfigured
    }
    const parsed = formSchema.safeParse(formValues)

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      setErrors({
        clearS3AccessKeyId: fieldErrors.clearS3AccessKeyId?.[0],
        clearS3SecretAccessKey: fieldErrors.clearS3SecretAccessKey?.[0],
        localPath: fieldErrors.localPath?.[0],
        provider: fieldErrors.provider?.[0],
        publicBaseUrl: fieldErrors.publicBaseUrl?.[0],
        s3AccessKeyId: fieldErrors.s3AccessKeyId?.[0],
        s3Bucket: fieldErrors.s3Bucket?.[0],
        s3Endpoint: fieldErrors.s3Endpoint?.[0],
        s3ForcePathStyle: fieldErrors.s3ForcePathStyle?.[0],
        s3Region: fieldErrors.s3Region?.[0],
        s3SecretAccessKey: fieldErrors.s3SecretAccessKey?.[0]
      })
      setFormError(null)
      return
    }

    setErrors({})
    setFormError(null)
    update.mutate({
      clearS3AccessKeyId: parsed.data.provider === STORAGE_PROVIDER_S3 ? parsed.data.clearS3AccessKeyId : false,
      clearS3SecretAccessKey: parsed.data.provider === STORAGE_PROVIDER_S3 ? parsed.data.clearS3SecretAccessKey : false,
      localPath: parsed.data.localPath,
      provider: parsed.data.provider,
      publicBaseUrl: parsed.data.publicBaseUrl,
      s3AccessKeyId: parsed.data.provider === STORAGE_PROVIDER_S3 ? parsed.data.s3AccessKeyId : "",
      s3Bucket: parsed.data.provider === STORAGE_PROVIDER_S3 ? parsed.data.s3Bucket : "",
      s3Endpoint: parsed.data.provider === STORAGE_PROVIDER_S3 ? parsed.data.s3Endpoint : "",
      s3ForcePathStyle: parsed.data.provider === STORAGE_PROVIDER_S3 ? parsed.data.s3ForcePathStyle : false,
      s3Region: parsed.data.provider === STORAGE_PROVIDER_S3 ? parsed.data.s3Region : "",
      s3SecretAccessKey: parsed.data.provider === STORAGE_PROVIDER_S3 ? parsed.data.s3SecretAccessKey : ""
    })
  }

  const s3AccessKeyConfigured = savedStorageSettings.s3AccessKeyIdConfigured && !clearS3AccessKeyId
  const s3SecretKeyConfigured = savedStorageSettings.s3SecretAccessKeyConfigured && !clearS3SecretAccessKey

  return (
    <Card className="min-w-0 rounded-lg shadow-sm">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="size-4 text-primary" />
          文件存储
        </CardTitle>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-5 px-5 pb-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <form className="min-w-0 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="storage-provider">存储方式</Label>
            <Select disabled={update.isPending} onValueChange={handleProviderChange} value={provider}>
              <SelectTrigger
                aria-describedby={errors.provider ? "storage-provider-error" : undefined}
                aria-invalid={Boolean(errors.provider)}
                className="w-full"
                id="storage-provider"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={STORAGE_PROVIDER_LOCAL}>Local</SelectItem>
                <SelectItem value={STORAGE_PROVIDER_S3}>S3</SelectItem>
              </SelectContent>
            </Select>
            {errors.provider ? (
              <p className="text-destructive text-xs" id="storage-provider-error">
                {errors.provider}
              </p>
            ) : null}
          </div>

          {provider === STORAGE_PROVIDER_LOCAL ? (
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="storage-local-path">本地上传路径</Label>
                <Input
                  aria-describedby={errors.localPath ? "storage-local-path-error" : undefined}
                  aria-invalid={Boolean(errors.localPath)}
                  disabled={update.isPending}
                  id="storage-local-path"
                  onChange={handleTextFieldChange(setLocalPath)}
                  value={localPath}
                />
                {errors.localPath ? (
                  <p className="text-destructive text-xs" id="storage-local-path-error">
                    {errors.localPath}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">服务端路径，保存时会由服务端校验。</p>
                )}
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="storage-public-base-url">公开访问基础 URL</Label>
                <Input
                  aria-describedby={errors.publicBaseUrl ? "storage-public-base-url-error" : undefined}
                  aria-invalid={Boolean(errors.publicBaseUrl)}
                  disabled={update.isPending}
                  id="storage-public-base-url"
                  onChange={handleTextFieldChange(setPublicBaseUrl)}
                  placeholder="https://cdn.example.com/uploads"
                  value={publicBaseUrl}
                />
                {errors.publicBaseUrl ? (
                  <p className="text-destructive text-xs" id="storage-public-base-url-error">
                    {errors.publicBaseUrl}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {provider === STORAGE_PROVIDER_S3 ? (
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2 sm:col-span-2">
                <Label htmlFor="storage-public-base-url">公开访问基础 URL</Label>
                <Input
                  aria-describedby={errors.publicBaseUrl ? "storage-public-base-url-error" : undefined}
                  aria-invalid={Boolean(errors.publicBaseUrl)}
                  disabled={update.isPending}
                  id="storage-public-base-url"
                  onChange={handleTextFieldChange(setPublicBaseUrl)}
                  placeholder="https://cdn.example.com"
                  value={publicBaseUrl}
                />
                {errors.publicBaseUrl ? (
                  <p className="text-destructive text-xs" id="storage-public-base-url-error">
                    {errors.publicBaseUrl}
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="storage-s3-endpoint">S3 Endpoint</Label>
                <Input
                  aria-describedby={errors.s3Endpoint ? "storage-s3-endpoint-error" : undefined}
                  aria-invalid={Boolean(errors.s3Endpoint)}
                  disabled={update.isPending}
                  id="storage-s3-endpoint"
                  onChange={handleTextFieldChange(setS3Endpoint)}
                  placeholder="https://s3.amazonaws.com"
                  value={s3Endpoint}
                />
                {errors.s3Endpoint ? (
                  <p className="text-destructive text-xs" id="storage-s3-endpoint-error">
                    {errors.s3Endpoint}
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="storage-s3-region">S3 Region</Label>
                <Input
                  aria-describedby={errors.s3Region ? "storage-s3-region-error" : undefined}
                  aria-invalid={Boolean(errors.s3Region)}
                  disabled={update.isPending}
                  id="storage-s3-region"
                  onChange={handleTextFieldChange(setS3Region)}
                  placeholder="ap-east-1"
                  value={s3Region}
                />
                {errors.s3Region ? (
                  <p className="text-destructive text-xs" id="storage-s3-region-error">
                    {errors.s3Region}
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 space-y-2 sm:col-span-2">
                <Label htmlFor="storage-s3-bucket">S3 Bucket</Label>
                <Input
                  aria-describedby={errors.s3Bucket ? "storage-s3-bucket-error" : undefined}
                  aria-invalid={Boolean(errors.s3Bucket)}
                  disabled={update.isPending}
                  id="storage-s3-bucket"
                  onChange={handleTextFieldChange(setS3Bucket)}
                  value={s3Bucket}
                />
                {errors.s3Bucket ? (
                  <p className="text-destructive text-xs" id="storage-s3-bucket-error">
                    {errors.s3Bucket}
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="storage-s3-access-key-id">S3 Access Key</Label>
                <Input
                  aria-describedby={errors.s3AccessKeyId ? "storage-s3-access-key-id-error" : undefined}
                  aria-invalid={Boolean(errors.s3AccessKeyId)}
                  disabled={update.isPending}
                  id="storage-s3-access-key-id"
                  onChange={handleTextFieldChange(setS3AccessKeyId)}
                  placeholder={s3AccessKeyConfigured ? "已配置，留空不修改" : "输入 S3 Access Key"}
                  type="password"
                  value={s3AccessKeyId}
                />
                {errors.s3AccessKeyId ? (
                  <p className="text-destructive text-xs" id="storage-s3-access-key-id-error">
                    {errors.s3AccessKeyId}
                  </p>
                ) : null}
                {clearS3AccessKeyId ? <p className="text-amber-600 text-xs dark:text-amber-400">已标记清除，保存后生效。</p> : null}
                <Button
                  disabled={!savedStorageSettings.s3AccessKeyIdConfigured || update.isPending}
                  onClick={() => {
                    setClearS3AccessKeyId((current) => !current)
                    setLastTestResult(null)
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Trash2 className="size-4" />
                  {clearS3AccessKeyId ? "取消清除 Access Key" : "清除已保存 Access Key"}
                </Button>
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="storage-s3-secret-access-key">S3 Secret Key</Label>
                <Input
                  aria-describedby={errors.s3SecretAccessKey ? "storage-s3-secret-access-key-error" : undefined}
                  aria-invalid={Boolean(errors.s3SecretAccessKey)}
                  disabled={update.isPending}
                  id="storage-s3-secret-access-key"
                  onChange={handleTextFieldChange(setS3SecretAccessKey)}
                  placeholder={s3SecretKeyConfigured ? "已配置，留空不修改" : "输入 S3 Secret Key"}
                  type="password"
                  value={s3SecretAccessKey}
                />
                {errors.s3SecretAccessKey ? (
                  <p className="text-destructive text-xs" id="storage-s3-secret-access-key-error">
                    {errors.s3SecretAccessKey}
                  </p>
                ) : null}
                {clearS3SecretAccessKey ? <p className="text-amber-600 text-xs dark:text-amber-400">已标记清除，保存后生效。</p> : null}
                <Button
                  disabled={!savedStorageSettings.s3SecretAccessKeyConfigured || update.isPending}
                  onClick={() => {
                    setClearS3SecretAccessKey((current) => !current)
                    setLastTestResult(null)
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Trash2 className="size-4" />
                  {clearS3SecretAccessKey ? "取消清除 Secret Key" : "清除已保存 Secret Key"}
                </Button>
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch checked={s3ForcePathStyle} disabled={update.isPending} id="storage-s3-force-path-style" onCheckedChange={handleS3ForcePathStyleChange} />
                <Label htmlFor="storage-s3-force-path-style">forcePathStyle</Label>
              </div>
            </div>
          ) : null}

          {formError ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs">{formError}</p> : null}

          <div className="flex justify-start border-t pt-4 sm:justify-end">
            <Button className="w-full sm:w-auto" disabled={update.isPending} type="submit">
              <Save className="size-4" />
              保存文件存储配置
            </Button>
          </div>
        </form>

        <div className="min-w-0 space-y-4">
          <div className="min-w-0 space-y-3 rounded-lg border bg-background/60 p-4 dark:bg-muted/20">
            <div>
              <p className="font-medium text-sm">上传测试</p>
              <p className="mt-1 text-muted-foreground text-xs">使用当前已保存配置写入并清理一个测试文件。</p>
            </div>
            <Button className="w-full" disabled={testUpload.isPending || update.isPending} onClick={() => testUpload.mutate({})} type="button" variant="secondary">
              <UploadCloud className="size-4" />
              执行上传测试
            </Button>
            {lastTestResult ? (
              <Alert className="border-emerald-500/40 bg-emerald-500/10">
                <CheckCircle2 className="size-4" />
                <AlertTitle>最近上传测试成功</AlertTitle>
                <AlertDescription className="break-all">
                  {lastTestResult.provider} 写入并清理了测试对象 {lastTestResult.key}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

          <Alert className="border-amber-500/40 bg-amber-500/10">
            <ShieldAlert className="size-4" />
            <AlertTitle>安全提示</AlertTitle>
            <AlertDescription>Access Key 和 Secret Key 保存后不会回显明文；留空保存会保留已有敏感值。</AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  )
}
