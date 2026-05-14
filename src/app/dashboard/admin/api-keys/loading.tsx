import { Skeleton } from "@/components/ui/skeleton"

const AdminApiKeysLoading = () => (
  <div className="space-y-5 text-[13px]">
    <div className="space-y-2">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
    <div className="grid gap-3 md:grid-cols-5">
      {["total", "enabled", "risky", "expiring", "recent"].map((item) => (
        <Skeleton className="h-24 rounded-lg" key={item} />
      ))}
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

export default AdminApiKeysLoading
