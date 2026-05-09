"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { getAuthErrorMessage } from "@/app/(auth)/_lib/auth-errors"
import { Button } from "@/components/ui/button"
import { authClient } from "@/server/better-auth/client"

export const SignOutButton = () => {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState("")
  const [pending, setPending] = useState(false)

  const handleSignOut = async () => {
    setErrorMessage("")
    setPending(true)

    try {
      const { error } = await authClient.signOut()

      if (error) {
        setErrorMessage(getAuthErrorMessage(error, "退出登录失败，请稍后重试。"))
        return
      }

      router.replace("/sign-in")
      router.refresh()
    } catch {
      setErrorMessage("退出登录服务暂时不可用，请稍后重试。")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button disabled={pending} onClick={handleSignOut} type="button" variant="outline">
        <LogOut className="size-4" />
        {pending ? "退出中..." : "退出登录"}
      </Button>
      {errorMessage ? <p className="text-destructive text-xs">{errorMessage}</p> : null}
    </div>
  )
}
