import { api } from "@/trpc/server"
import { PlatformSettingsContent } from "./_components/platform-settings-content"

const AdminPlatformSettingsPage = async () => {
  const initialEmailSettings = await api.adminPlatformSetting.getEmailSettings()

  return <PlatformSettingsContent initialEmailSettings={initialEmailSettings} />
}

export default AdminPlatformSettingsPage
