import { redirect } from "next/navigation"

import { getOptionalSession } from "@/app/(auth)/_lib/server-session"
import { ROUTE_DASHBOARD, ROUTE_SIGN_IN } from "@/lib/const"

const Home = async () => {
  const session = await getOptionalSession()

  if (!session) {
    redirect(ROUTE_SIGN_IN)
  }

  redirect(ROUTE_DASHBOARD)
}

export default Home
