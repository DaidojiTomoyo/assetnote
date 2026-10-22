import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { WorkspaceUnavailable } from "@/components/workspace-unavailable"
import { Overview } from "@/features/overview/overview"

export const metadata: Metadata = {
  title: "设计预览",
  robots: { index: false, follow: false },
}

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>
}) {
  // A development-only fixture surface. Authenticated routes never consult it.
  if (process.env.NODE_ENV !== "development") notFound()
  const requested = (await searchParams).section
  const section =
    requested === "wallets" || requested === "market" ? requested : "overview"
  return section === "overview" ? (
    <Overview preview />
  ) : (
    <WorkspaceUnavailable section={section} preview />
  )
}
