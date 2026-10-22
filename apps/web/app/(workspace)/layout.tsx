import type { ReactNode } from "react"
import { WorkspaceSession } from "@/components/workspace-session"

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceSession>{children}</WorkspaceSession>
}
