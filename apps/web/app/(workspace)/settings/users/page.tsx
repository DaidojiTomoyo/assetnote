import type { Metadata } from "next"
import { UsersList } from "@/features/settings/users-list"

export const metadata: Metadata = { title: "用户管理" }
export default function UsersPage() {
  return <UsersList />
}
