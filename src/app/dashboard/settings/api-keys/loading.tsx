import { Skeleton } from "@/components/ui/skeleton"

const ApiKeysLoading = () => (
  <div className="space-y-5 text-[13px]">
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="size-8" />
    </div>
    <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-full lg:w-36" />
      </div>
      <div className="space-y-2">
        {["key-row-1", "key-row-2", "key-row-3", "key-row-4"].map((key) => (
          <Skeleton className="h-14 w-full" key={key} />
        ))}
      </div>
    </div>
  </div>
)

export default ApiKeysLoading
