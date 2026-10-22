import type { Metadata } from "next"
import { InvitationsList } from "@/features/settings/invitations"

export const metadata: Metadata = { title: "邀请记录" }
export default function InvitationsPage() {
  return <InvitationsList />
}
