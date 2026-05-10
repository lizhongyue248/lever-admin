import { Loader2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const SessionsLoading = () => (
  <div className="space-y-5 text-[13px]">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <div className="h-7 w-28 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
    </div>

    <Card className="gap-4 rounded-lg py-5">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Loader2 className="size-4 animate-spin text-primary" />
          会话加载中
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 px-5 sm:grid-cols-3">
        {["活跃会话", "当前设备", "可撤销"].map((label) => (
          <div key={label}>
            <div className="h-9 w-12 animate-pulse rounded-md bg-muted" />
            <p className="mt-2 text-muted-foreground text-xs">{label}</p>
          </div>
        ))}
      </CardContent>
    </Card>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,760px)_290px]">
      <Card className="gap-4 rounded-lg py-5">
        <CardHeader className="px-5">
          <div className="h-5 w-20 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-64 max-w-full animate-pulse rounded-md bg-muted" />
        </CardHeader>
        <CardContent className="space-y-3 px-5">
          {["row-1", "row-2", "row-3"].map((key) => (
            <div className="flex items-center gap-3 rounded-lg border p-4" key={key}>
              <div className="size-8 animate-pulse rounded-md bg-muted" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-40 max-w-full animate-pulse rounded-md bg-muted" />
                <div className="h-3 w-56 max-w-full animate-pulse rounded-md bg-muted" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="gap-4 rounded-lg py-5">
        <CardHeader className="px-5">
          <div className="h-5 w-20 animate-pulse rounded-md bg-muted" />
        </CardHeader>
        <CardContent className="space-y-3 px-5">
          {["health-1", "health-2", "health-3"].map((key) => (
            <div className="h-10 animate-pulse rounded-md bg-muted" key={key} />
          ))}
        </CardContent>
      </Card>
    </div>
  </div>
)

export default SessionsLoading
