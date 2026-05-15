import { Skeleton } from "@/components/ui/skeleton"

const RequestLogsLoading = () => (
  <div className="space-y-5">
    <div>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-80" />
    </div>
    <div className="grid gap-3 md:grid-cols-4">
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
    <Skeleton className="h-[560px] rounded-lg" />
  </div>
)

export default RequestLogsLoading
