import { Suspense, type ReactNode } from "react"
import { notFound } from "next/navigation"
import { PreviewShell } from "./preview-shell"

export default function PreviewLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV !== "development") notFound()
  return (
    <Suspense>
      <PreviewShell>{children}</PreviewShell>
    </Suspense>
  )
}
