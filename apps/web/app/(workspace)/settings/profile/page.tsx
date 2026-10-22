import type { Metadata } from "next"
import { ProfileForm } from "@/features/settings/profile-form"

export const metadata: Metadata = { title: "个人资料" }
export default function ProfilePage() {
  return <ProfileForm />
}
