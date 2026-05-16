import { DEFAULT_PAGE, DENSE_PAGE_SIZE, FILTER_ALL } from "@/lib/const"
import { api } from "@/trpc/server"
import { PersonalApiKeysContent } from "./_components/personal-api-keys-content"

const PersonalApiKeysPage = async ({ searchParams }: { searchParams: Promise<{ keyId?: string }> }) => {
  const params = await searchParams
  const initialKeys = await api.apiKey.listMine({ page: DEFAULT_PAGE, pageSize: DENSE_PAGE_SIZE, search: "", status: FILTER_ALL })

  return <PersonalApiKeysContent initialKeys={initialKeys} selectedKeyId={params.keyId ?? null} />
}

export default PersonalApiKeysPage
