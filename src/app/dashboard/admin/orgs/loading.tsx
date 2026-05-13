import { Card, CardContent } from "@/components/ui/card"

const AdminOrgsLoading = () => (
  <div className="space-y-5">
    <Card className="rounded-lg">
      <CardContent className="h-16 animate-pulse bg-muted/60 p-4" />
    </Card>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {["orgs", "top", "members", "risk"].map((item) => (
        <Card className="rounded-lg" key={item}>
          <CardContent className="h-24 animate-pulse bg-muted/60 p-5" />
        </Card>
      ))}
    </div>
  </div>
)

export default AdminOrgsLoading
