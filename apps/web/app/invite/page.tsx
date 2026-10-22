import type { Metadata } from "next"
import { AuthShell } from "@/components/auth-shell"
import { AcceptInvitationForm } from "./accept-invitation-form"

export const metadata: Metadata = {
  title: "接受邀请",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
}
export default function InvitePage() {
  return (
    <AuthShell>
      <AcceptInvitationForm />
    </AuthShell>
  )
}
