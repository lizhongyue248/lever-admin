import { redirect } from "next/navigation"

import { ROUTE_DASHBOARD_SETTINGS_PROFILE, ROUTE_SIGN_IN } from "@/lib/const"
import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { ProfilePageContent } from "./_components/profile-page-content"

const ProfilePage = async () => {
  const session = await getSession()

  if (!session?.user) {
    redirect(`${ROUTE_SIGN_IN}?redirectTo=${encodeURIComponent(ROUTE_DASHBOARD_SETTINGS_PROFILE)}`)
  }

  const data = await api.profile.get()

  return <ProfilePageContent data={data} />
}

export default ProfilePage
