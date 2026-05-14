import { api } from "@/trpc/server"
import { PersonalApiKeysContent } from "./_components/personal-api-keys-content"

const PersonalApiKeysPage = async ({ searchParams }: { searchParams: Promise<{ keyId?: string }> }) => {
  const params = await searchParams
  const initialKeys = await api.apiKey.listMine({ page: 1, pageSize: 20, search: "", status: "all" })

  return <PersonalApiKeysContent initialKeys={initialKeys} selectedKeyId={params.keyId ?? null} />
}

export default PersonalApiKeysPage
