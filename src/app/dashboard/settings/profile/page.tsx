import { redirect } from "next/navigation"

import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"
import { ProfilePageContent } from "./_components/profile-page-content"

const ProfilePage = async () => {
  const session = await getSession()

  if (!session?.user) {
    redirect("/sign-in?redirectTo=%2Fdashboard%2Fsettings%2Fprofile")
  }

  const data = await api.profile.get()

  return <ProfilePageContent data={data} />
}

export default ProfilePage
