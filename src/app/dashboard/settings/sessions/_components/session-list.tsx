"use client"

import { useEffect, useMemo, useState } from "react"

import { DataPagination } from "@/components/data-pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DEFAULT_PAGE, SESSION_RISK_RISK } from "@/lib/const"
import { cn } from "@/lib/utils"
import type { RouterOutputs } from "@/trpc/react"
import { SessionDeviceIcon } from "./session-device-icon"

type SessionItem = RouterOutputs["session"]["listMine"]["sessions"][number]

type SessionListProps = {
  isSigningOut: boolean
  onOpenRevoke: (session: SessionItem) => void
  onSignOut: () => void
  sessions: SessionItem[]
}

const PAGE_SIZE = 5

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(date)

export const SessionList = ({ isSigningOut, onOpenRevoke, onSignOut, sessions }: SessionListProps) => {
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE)
  const pageCount = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE))
  const visibleSessions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE

    return sessions.slice(start, start + PAGE_SIZE)
  }, [currentPage, sessions])

  useEffect(() => {
    setCurrentPage((value) => Math.min(value, pageCount))
  }, [pageCount])

  return (
    <Card className="gap-4 rounded-lg py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">登录设备</CardTitle>
        <p className="text-muted-foreground text-xs">当前会话置顶显示，不展示完整 session token。</p>
      </CardHeader>
      <CardContent className="px-5">
        {sessions.length === 0 ? (
          <div className="rounded-md border bg-background/60 p-6 text-center text-muted-foreground text-sm dark:bg-muted/20">暂无活跃会话。</div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-lg border lg:block">
              <div className="grid grid-cols-[minmax(260px,1fr)_120px_160px_120px] bg-muted/40 px-4 py-3 font-medium text-muted-foreground text-xs">
                <span>设备</span>
                <span>IP</span>
                <span>最近活跃</span>
                <span>操作</span>
              </div>
              <div className="max-h-[320px] divide-y overflow-y-auto">
                {visibleSessions.map((item) => (
                  <div
                    className={cn("relative grid grid-cols-[minmax(260px,1fr)_120px_160px_120px] items-center px-4 py-4", item.isCurrent && "bg-primary/5")}
                    key={item.id}
                    {...(item.isCurrent ? { "aria-current": "true" as const } : {})}
                  >
                    <div className="flex min-w-0 items-center gap-3 pr-8">
                      <SessionDeviceIcon browser={item.browser} current={item.isCurrent} deviceLabel={item.deviceLabel} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm">
                          {item.deviceLabel} · {item.browserLabel}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-muted-foreground text-xs">创建于 {formatDate(item.createdAt)}</p>
                          {item.riskLevel === SESSION_RISK_RISK ? <Badge variant="destructive">{item.riskReasons[0] ?? "风险会话"}</Badge> : null}
                        </div>
                      </div>
                    </div>
                    <span className="min-w-0 break-all pr-3 text-xs">{item.ipAddress ?? "未知 IP"}</span>
                    <span className="text-xs">{item.lastActiveLabel}</span>
                    {item.isCurrent ? (
                      <Button className="w-fit px-0 text-primary" disabled={isSigningOut} onClick={onSignOut} size="sm" type="button" variant="link">
                        退出登录
                      </Button>
                    ) : (
                      <Button className="w-fit px-0 text-destructive" onClick={() => onOpenRevoke(item)} size="sm" type="button" variant="link">
                        撤销
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 lg:hidden">
              {visibleSessions.map((item) => (
                <div
                  className={cn("relative rounded-lg border bg-card p-4", item.isCurrent && "border-primary/40 bg-primary/5")}
                  key={item.id}
                  {...(item.isCurrent ? { "aria-current": "true" as const } : {})}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <SessionDeviceIcon browser={item.browser} current={item.isCurrent} deviceLabel={item.deviceLabel} />
                    <p className="truncate font-medium text-sm">
                      {item.deviceLabel} · {item.browserLabel}
                    </p>
                  </div>
                  <div className="mt-4 space-y-1 text-muted-foreground text-xs">
                    <p className="break-all">IP：{item.ipAddress ?? "未知 IP"}</p>
                    <p>
                      {item.lastActiveLabel} · 创建于 {formatDate(item.createdAt)}
                    </p>
                    {item.riskLevel === SESSION_RISK_RISK ? <Badge variant="destructive">{item.riskReasons[0] ?? "风险会话"}</Badge> : null}
                  </div>
                  <div className="mt-3 flex justify-end">
                    {item.isCurrent ? (
                      <Button className="px-0 text-primary" disabled={isSigningOut} onClick={onSignOut} size="sm" type="button" variant="link">
                        退出登录
                      </Button>
                    ) : (
                      <Button className="px-0 text-destructive" onClick={() => onOpenRevoke(item)} size="sm" type="button" variant="link">
                        撤销
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <DataPagination
          className="pt-4"
          itemCount={visibleSessions.length}
          onPageChange={setCurrentPage}
          page={currentPage}
          pageCount={pageCount}
          pageSize={PAGE_SIZE}
          total={sessions.length}
        />
      </CardContent>
    </Card>
  )
}
