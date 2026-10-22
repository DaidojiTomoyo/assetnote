import type { Metadata } from "next"
import { SecurityForm } from "@/features/settings/security-form"

export const metadata: Metadata = { title: "账户安全" }
export default function SecurityPage() {
  return <SecurityForm />
}
