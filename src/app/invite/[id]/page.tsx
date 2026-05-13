import { redirect } from "next/navigation"

import { getSession } from "@/server/better-auth/server"
import { api } from "@/trpc/server"

import { InvitationConfirmationCard } from "./_components/invitation-confirmation-card"

type InvitePageProps = {
  params: Promise<{ id: string }>
}

const InvitePage = async ({ params }: InvitePageProps) => {
  const { id } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(`/invite/${id}`)}`)
  }

  const invitation = await api.notification.invitation.getMine({ invitationId: id })

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/45 px-4 py-10">
      <InvitationConfirmationCard invitation={invitation} />
    </main>
  )
}

export default InvitePage
