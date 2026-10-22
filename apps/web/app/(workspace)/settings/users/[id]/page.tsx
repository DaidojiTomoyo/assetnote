import type { Metadata } from "next"
import { UserDetail } from "@/features/settings/user-detail"

export const metadata: Metadata = { title: "用户详情" }
export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return <UserDetail id={(await params).id} />
}
