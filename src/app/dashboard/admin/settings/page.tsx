import { api } from "@/trpc/server"
import { PlatformSettingsContent } from "./_components/platform-settings-content"

const AdminPlatformSettingsPage = async () => {
  const [initialEmailSettings, initialStorageSettings] = await Promise.all([api.adminPlatformSetting.getEmailSettings(), api.adminPlatformSetting.getStorageSettings()])

  return <PlatformSettingsContent initialEmailSettings={initialEmailSettings} initialStorageSettings={initialStorageSettings} />
}

export default AdminPlatformSettingsPage
