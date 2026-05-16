import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, FILTER_ALL, REQUEST_LOG_DEFAULT_TIME_RANGE } from "@/lib/const"
import { api } from "@/trpc/server"
import { RequestLogsContent } from "./_components/request-logs-content"

const RequestLogsPage = async ({ searchParams }: { searchParams: Promise<{ logId?: string }> }) => {
  const params = await searchParams
  const initialLogs = await api.adminRequestLog.list({
    method: FILTER_ALL,
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
    result: FILTER_ALL,
    risk: FILTER_ALL,
    search: "",
    source: FILTER_ALL,
    statusCode: null,
    timeRange: REQUEST_LOG_DEFAULT_TIME_RANGE
  })
  const initialOverview = await api.adminRequestLog.getOverview()
  const initialSelectedLog = params.logId ? await api.adminRequestLog.get({ id: params.logId }).catch(() => null) : null

  return <RequestLogsContent initialLogs={initialLogs} initialOverview={initialOverview} initialSelectedLog={initialSelectedLog} selectedLogId={params.logId ?? null} />
}

export default RequestLogsPage
