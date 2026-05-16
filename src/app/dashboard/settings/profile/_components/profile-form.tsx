"use client"

import { RefreshCw, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ROUTE_API_UPLOAD_AVATAR } from "@/lib/const"
import { api, type RouterOutputs } from "@/trpc/react"

type ProfileUser = RouterOutputs["profile"]["get"]["user"]

type ProfileFormProps = {
  user: ProfileUser
}

type FieldErrors = Partial<Record<"image" | "name", string>>

type UploadAvatarPayload = {
  message?: string
  url?: string
}

const profileFormSchema = z.object({
  image: z
    .string()
    .trim()
    .max(2048, "头像 URL 不能超过 2048 个字符。")
    .refine((value) => value === "" || z.string().url().safeParse(value).success, "头像 URL 必须是有效链接。"),
  name: z.string().trim().min(2, "名称至少 2 个字符。").max(32, "名称不能超过 32 个字符。")
})

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date)

const getInitial = (name: string, email: string) => (name.trim() || email.trim()).slice(0, 1).toUpperCase()

export const ProfileForm = ({ user }: ProfileFormProps) => {
  const router = useRouter()
  const [name, setName] = useState(user.name)
  const [image, setImage] = useState(user.image ?? "")
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const createdAt = useMemo(() => formatDateTime(user.createdAt), [user.createdAt])
  const mutation = api.profile.update.useMutation({
    onError: (error) => {
      setFormError(error.message)
    },
    onSuccess: (updatedUser) => {
      setName(updatedUser.name)
      setImage(updatedUser.image ?? "")
      setErrors({})
      setFormError(null)
      toast.success("个人资料已更新。")
      router.refresh()
    }
  })

  const isPending = mutation.isPending || isUploadingAvatar

  const handleReset = () => {
    setName(user.name)
    setImage(user.image ?? "")
    setErrors({})
    setFormError(null)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = profileFormSchema.safeParse({ image, name })

    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors
      setErrors({
        image: flattened.image?.[0],
        name: flattened.name?.[0]
      })
      setFormError(null)
      return
    }

    setErrors({})
    setFormError(null)
    mutation.mutate(parsed.data)
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    setIsUploadingAvatar(true)

    try {
      const response = await fetch(ROUTE_API_UPLOAD_AVATAR, {
        body: formData,
        method: "POST"
      })
      const payload = (await response.json()) as UploadAvatarPayload

      if (!response.ok || !payload.url) {
        toast.error(payload.message ?? "头像上传失败。")
        return
      }

      const avatarUrl = payload.url.startsWith("/") ? `${window.location.origin}${payload.url}` : payload.url

      setImage(avatarUrl)
      setErrors((currentErrors) => {
        const nextErrors = { ...currentErrors }
        delete nextErrors.image

        return nextErrors
      })
      setFormError(null)
      toast.success("头像已上传。")
    } catch {
      toast.error("头像上传失败。")
    } finally {
      setIsUploadingAvatar(false)
      event.target.value = ""
    }
  }

  return (
    <Card className="gap-5 rounded-lg py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">账号档案</CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 rounded-lg border bg-background/60 p-4 sm:flex-row sm:items-center dark:bg-muted/20">
            <Avatar className="size-16 rounded-xl">
              <AvatarImage alt={name} src={image || undefined} />
              <AvatarFallback className="rounded-xl text-base">{getInitial(name, user.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate font-medium text-sm">{name}</p>
              <p className="truncate text-muted-foreground text-xs">{user.email}</p>
            </div>
            <Badge className="w-fit rounded-md" variant={user.emailVerified ? "secondary" : "outline"}>
              {user.emailVerified ? "邮箱已验证" : "邮箱未验证"}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">名称</Label>
              <Input aria-invalid={Boolean(errors.name)} id="profile-name" onChange={(event) => setName(event.target.value)} value={name} />
              {errors.name ? <p className="text-destructive text-xs">{errors.name}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">邮箱</Label>
              <Input disabled id="profile-email" value={user.email} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile-avatar-upload">上传头像</Label>
              <Input accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={isPending} id="profile-avatar-upload" onChange={handleAvatarUpload} type="file" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile-image">头像 URL</Label>
              <Input
                aria-invalid={Boolean(errors.image)}
                disabled={isUploadingAvatar}
                id="profile-image"
                onChange={(event) => setImage(event.target.value)}
                placeholder="https://example.com/avatar.png"
                value={image}
              />
              {errors.image ? <p className="text-destructive text-xs">{errors.image}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-user-id">用户 ID</Label>
              <Input className="font-mono text-xs" id="profile-user-id" readOnly value={user.id} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-created-at">创建时间</Label>
              <Input id="profile-created-at" readOnly value={createdAt} />
            </div>
          </div>

          {formError ? <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs">{formError}</p> : null}

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button disabled={isPending} onClick={handleReset} type="button" variant="outline">
              <RefreshCw className="size-4" />
              取消
            </Button>
            <Button disabled={isPending} type="submit">
              <Save className="size-4" />
              保存资料
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
