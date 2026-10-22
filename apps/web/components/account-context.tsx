"use client"

import { createContext, useContext } from "react"
import type { Account, AccountProfile } from "@workspace/contracts/accounts"

export const AccountContext = createContext<{
  profile: AccountProfile
  updateUser(user: Account): void
} | null>(null)
export function useAccount() {
  const context = useContext(AccountContext)
  if (!context) throw new Error("账户页面必须位于已登录的工作区中。")
  return context
}
