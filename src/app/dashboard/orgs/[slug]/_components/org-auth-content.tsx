"use client"

import { MonitorSmartphone } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api, type RouterOutputs } from "@/trpc/react"
import { formatRelativeTime } from "../_lib/org-format"

type AuthData = RouterOutputs["org"]["session"]["list"]

export const OrgAuthContent = ({ initialData, slug }: { initialData: AuthData; slug: string }) => {
  const sessions = api.org.session.list.useQuery({ deviceType: "all", page: 1, pageSize: 10, riskStatus: "all", search: "", slug }, { initialData })

  return (
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-5">
        <div className="hidden max-h-[620px] overflow-auto rounded-lg border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>成员</TableHead>
                <TableHead>设备</TableHead>
                <TableHead>位置</TableHead>
                <TableHead>最后活跃</TableHead>
                <TableHead>风险</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-muted-foreground text-xs">{item.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MonitorSmartphone className="size-4 text-muted-foreground" />
                      <span>
                        {item.deviceLabel} · {item.browserLabel}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{item.ipAddress ?? "未知位置"}</TableCell>
                  <TableCell>{formatRelativeTime(item.lastActiveAt)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">正常</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="space-y-3 md:hidden">
          {sessions.data.items.map((item) => (
            <div className="rounded-lg border p-4" key={item.id}>
              <div className="font-medium">{item.name}</div>
              <div className="text-muted-foreground text-xs">{item.email}</div>
              <div className="mt-3 grid gap-2 text-xs">
                <span>
                  设备：{item.deviceLabel} · {item.browserLabel}
                </span>
                <span>位置：{item.ipAddress ?? "未知位置"}</span>
                <span>最后活跃：{formatRelativeTime(item.lastActiveAt)}</span>
              </div>
            </div>
          ))}
        </div>
        {sessions.data.items.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">暂无成员登录记录。</div> : null}
        <div className="mt-4 flex items-center justify-center gap-3 text-muted-foreground">
          <Button disabled size="icon-sm" type="button" variant="outline">
            ‹
          </Button>
          <span>
            {sessions.data.page} / {sessions.data.pageCount}
          </span>
          <Button disabled size="icon-sm" type="button" variant="outline">
            ›
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
