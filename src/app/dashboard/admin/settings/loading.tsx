import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

const AdminPlatformSettingsLoading = () => (
  <div className="space-y-5 text-[13px]">
    <div className="space-y-2">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
    <Card className="rounded-lg">
      <CardContent className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </CardContent>
    </Card>
  </div>
)

export default AdminPlatformSettingsLoading
