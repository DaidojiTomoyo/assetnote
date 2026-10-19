import type { Metadata } from "next"
import { AuthShell } from "@/components/auth-shell"
import { AccountSession } from "./account-session"

export const metadata: Metadata = { title: "当前账户" }

export default function AccountPage() {
  return (
    <AuthShell>
      <AccountSession />
    </AuthShell>
  )
}
