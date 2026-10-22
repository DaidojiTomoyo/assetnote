import type { Metadata } from "next"
import { NewInvitation } from "@/features/settings/invitations"

export const metadata: Metadata = { title: "邀请用户" }
export default function NewInvitationPage() {
  return <NewInvitation />
}
