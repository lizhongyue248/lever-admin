import { api } from "@/trpc/server"
import { RequestLogsContent } from "./_components/request-logs-content"

const RequestLogsPage = async ({ searchParams }: { searchParams: Promise<{ logId?: string }> }) => {
  const params = await searchParams
  const initialLogs = await api.adminRequestLog.list({
    method: "all",
    page: 1,
    pageSize: 10,
    result: "all",
    risk: "all",
    search: "",
    source: "all",
    statusCode: null,
    timeRange: "24h"
  })
  const initialOverview = await api.adminRequestLog.getOverview()
  const initialSelectedLog = params.logId ? await api.adminRequestLog.get({ id: params.logId }).catch(() => null) : null

  return <RequestLogsContent initialLogs={initialLogs} initialOverview={initialOverview} initialSelectedLog={initialSelectedLog} selectedLogId={params.logId ?? null} />
}

export default RequestLogsPage
