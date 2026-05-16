import { redirect } from "next/navigation"

import { getOptionalSession } from "@/app/(auth)/_lib/server-session"

const Home = async () => {
  const session = await getOptionalSession()

  if (!session) {
    redirect("/sign-in")
  }

  redirect("/dashboard")
}

export default Home
