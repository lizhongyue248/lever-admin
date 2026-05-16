import { DEFAULT_PAGE, DENSE_PAGE_SIZE, FILTER_ALL } from "@/lib/const"
import { api } from "@/trpc/server"
import { AdminApiKeysContent } from "./_components/admin-api-keys-content"

const AdminApiKeysPage = async ({ searchParams }: { searchParams: Promise<{ keyId?: string }> }) => {
  const params = await searchParams
  const initialKeys = await api.adminApiKey.list({ page: DEFAULT_PAGE, pageSize: DENSE_PAGE_SIZE, search: "", status: FILTER_ALL })
  const initialOverview = await api.adminApiKey.getOverview()
  const initialSelectedKey = params.keyId ? await api.adminApiKey.get({ id: params.keyId }).catch(() => null) : null

  return <AdminApiKeysContent initialKeys={initialKeys} initialOverview={initialOverview} initialSelectedKey={initialSelectedKey} selectedKeyId={params.keyId ?? null} />
}

export default AdminApiKeysPage
