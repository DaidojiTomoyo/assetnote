import type { Metadata } from "next"
import { WorkspaceUnavailable } from "@/components/workspace-unavailable"

export const metadata: Metadata = { title: "钱包" }

export default function WalletsPage() {
  return <WorkspaceUnavailable section="wallets" />
}
