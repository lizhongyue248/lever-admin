"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/trpc/react"

const platformRoles = ["user", "support", "admin", "super_admin"] as const
type PlatformRole = (typeof platformRoles)[number]
type DialogControlProps = {
  onOpenChange?: (open: boolean) => void
  open?: boolean
  trigger?: ReactNode | null
}

export const BanUserDialog = ({ onOpenChange, open, trigger, userId, userName }: { userId: string; userName: string } & DialogControlProps) => {
  const utils = api.useUtils()
  const [reason, setReason] = useState("")
  const [internalOpen, setInternalOpen] = useState(false)
  const dialogOpen = open ?? internalOpen
  const setDialogOpen = onOpenChange ?? setInternalOpen
  const banUser = api.adminUser.ban.useMutation({
    onSuccess: async () => {
      await utils.adminUser.invalidate()
      toast.success("用户已封禁，活动会话已撤销。")
      setDialogOpen(false)
      setReason("")
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  return (
    <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
      {trigger === null ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button type="button" variant="destructive">
              封禁用户
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>封禁 {userName}</DialogTitle>
          <DialogDescription>封禁后会立即撤销该用户的全部活动会话。</DialogDescription>
        </DialogHeader>
        <Input aria-label="封禁原因" onChange={(event) => setReason(event.target.value)} placeholder="输入封禁原因" value={reason} />
        <DialogFooter>
          <Button disabled={reason.trim().length === 0 || banUser.isPending} onClick={() => banUser.mutate({ banReason: reason, userId })} type="button" variant="destructive">
            确认封禁
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const CreateUserDialog = () => {
  const utils = api.useUtils()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<PlatformRole>("user")
  const createUser = api.adminUser.create.useMutation({
    onSuccess: async () => {
      await utils.adminUser.invalidate()
      toast.success("用户已创建。")
      setOpen(false)
      setEmail("")
      setName("")
      setPassword("")
      setRole("user")
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button type="button">创建用户</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建用户</DialogTitle>
          <DialogDescription>创建平台用户并设置初始密码。</DialogDescription>
        </DialogHeader>
        <Input aria-label="用户邮箱" onChange={(event) => setEmail(event.target.value)} placeholder="user@example.com" value={email} />
        <Input aria-label="用户姓名" onChange={(event) => setName(event.target.value)} placeholder="Maya Chen" value={name} />
        <Input aria-label="初始密码" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
        <Select onValueChange={(value) => setRole(value as PlatformRole)} value={role}>
          <SelectTrigger aria-label="初始角色">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {platformRoles.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button
            disabled={createUser.isPending || email.length === 0 || name.length === 0 || password.length < 8}
            onClick={() => createUser.mutate({ email, name, password, role })}
            type="button"
          >
            创建用户
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const RemoveUserDialog = ({ email, onOpenChange, open, trigger, userId }: { email: string; userId: string } & DialogControlProps) => {
  const utils = api.useUtils()
  const [confirmEmail, setConfirmEmail] = useState("")
  const [internalOpen, setInternalOpen] = useState(false)
  const dialogOpen = open ?? internalOpen
  const setDialogOpen = onOpenChange ?? setInternalOpen
  const removeUser = api.adminUser.remove.useMutation({
    onSuccess: async () => {
      await utils.adminUser.invalidate()
      toast.success("用户已删除。")
      setDialogOpen(false)
      setConfirmEmail("")
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  return (
    <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
      {trigger === null ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button type="button" variant="destructive">
              删除用户
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除用户</DialogTitle>
          <DialogDescription>这是硬删除操作。请输入用户邮箱确认：{email}</DialogDescription>
        </DialogHeader>
        <Input aria-label="确认删除邮箱" onChange={(event) => setConfirmEmail(event.target.value)} value={confirmEmail} />
        <DialogFooter>
          <Button disabled={confirmEmail !== email || removeUser.isPending} onClick={() => removeUser.mutate({ confirmEmail, userId })} type="button" variant="destructive">
            硬删除用户
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const RevokeAllSessionsDialog = ({ userId }: { userId: string }) => {
  const utils = api.useUtils()
  const [open, setOpen] = useState(false)
  const revokeAll = api.adminUser.revokeAllSessions.useMutation({
    onSuccess: async () => {
      await utils.adminUser.invalidate()
      toast.success("全部会话已撤销。")
      setOpen(false)
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive">
          撤销全部
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>撤销全部会话</DialogTitle>
          <DialogDescription>该用户所有设备都需要重新登录。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={revokeAll.isPending} onClick={() => revokeAll.mutate({ userId })} type="button" variant="destructive">
            确认撤销
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const RevokeSessionDialog = ({ sessionId }: { sessionId: string }) => {
  const utils = api.useUtils()
  const revokeSession = api.adminUser.revokeSession.useMutation({
    onSuccess: async () => {
      await utils.adminUser.invalidate()
      toast.success("会话已撤销。")
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  return (
    <Button disabled={revokeSession.isPending} onClick={() => revokeSession.mutate({ sessionId })} size="sm" type="button" variant="outline">
      撤销
    </Button>
  )
}

export const SetPasswordDialog = ({ onOpenChange, open, trigger, userId }: { userId: string } & DialogControlProps) => {
  const [newPassword, setNewPassword] = useState("")
  const [internalOpen, setInternalOpen] = useState(false)
  const dialogOpen = open ?? internalOpen
  const setDialogOpen = onOpenChange ?? setInternalOpen
  const setPassword = api.adminUser.setPassword.useMutation({
    onSuccess: () => {
      toast.success("密码已重置。")
      setDialogOpen(false)
      setNewPassword("")
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  return (
    <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
      {trigger === null ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button type="button" variant="outline">
              重置密码
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重置用户密码</DialogTitle>
          <DialogDescription>请输入不少于 8 位的新密码。</DialogDescription>
        </DialogHeader>
        <Input aria-label="新密码" onChange={(event) => setNewPassword(event.target.value)} type="password" value={newPassword} />
        <DialogFooter>
          <Button disabled={setPassword.isPending || newPassword.length < 8} onClick={() => setPassword.mutate({ newPassword, userId })} type="button">
            保存新密码
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const SetRoleDialog = ({ currentRole, onOpenChange, open, trigger, userId }: { currentRole: string; userId: string } & DialogControlProps) => {
  const utils = api.useUtils()
  const [internalOpen, setInternalOpen] = useState(false)
  const dialogOpen = open ?? internalOpen
  const setDialogOpen = onOpenChange ?? setInternalOpen
  const [role, setRole] = useState<PlatformRole>(platformRoles.includes(currentRole as PlatformRole) ? (currentRole as PlatformRole) : "user")
  const setRoleMutation = api.adminUser.setRole.useMutation({
    onSuccess: async () => {
      await utils.adminUser.invalidate()
      toast.success("角色已更新。")
      setDialogOpen(false)
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  return (
    <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
      {trigger === null ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button type="button" variant="outline">
              设置角色
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>设置平台角色</DialogTitle>
          <DialogDescription>角色变更会影响该用户的平台管理权限。</DialogDescription>
        </DialogHeader>
        <Select onValueChange={(value) => setRole(value as PlatformRole)} value={role}>
          <SelectTrigger aria-label="平台角色">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {platformRoles.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button disabled={setRoleMutation.isPending} onClick={() => setRoleMutation.mutate({ role, userId })} type="button">
            保存角色
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const UnbanUserDialog = ({ userId }: { userId: string }) => {
  const utils = api.useUtils()
  const unbanUser = api.adminUser.unban.useMutation({
    onSuccess: async () => {
      await utils.adminUser.invalidate()
      toast.success("用户已解除封禁。")
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  return (
    <Button disabled={unbanUser.isPending} onClick={() => unbanUser.mutate({ userId })} type="button" variant="outline">
      解除封禁
    </Button>
  )
}
