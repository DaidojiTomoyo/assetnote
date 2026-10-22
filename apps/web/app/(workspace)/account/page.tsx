import type { Metadata } from "next"
import { Overview } from "@/features/overview/overview"

export const metadata: Metadata = { title: "资产总览" }

export default function AccountPage() {
  return <Overview />
}
