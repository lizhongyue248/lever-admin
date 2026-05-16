import { redirect } from "next/navigation"

import { ROUTE_DASHBOARD } from "@/lib/const"

const AppCompatibilityPage = () => {
  redirect(ROUTE_DASHBOARD)
}

export default AppCompatibilityPage
