import { Skeleton } from "@/components/ui/skeleton"

const ApiKeyDetailLoading = () => (
  <div className="space-y-5 text-[13px]">
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Skeleton className="h-72 rounded-lg" />
      <Skeleton className="h-72 rounded-lg" />
    </div>
    <Skeleton className="h-72 rounded-lg" />
  </div>
)

export default ApiKeyDetailLoading
