"use client"

import type { ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { WorkspaceShell } from "@/components/workspace-shell"

export function PreviewShell({ children }: { children: ReactNode }) {
  const requested = useSearchParams().get("section")
  const section =
    requested === "wallets" || requested === "market" ? requested : "overview"

  return (
    <WorkspaceShell section={section} preview>
      {children}
    </WorkspaceShell>
  )
}
