"use client"

import { useId, useSyncExternalStore, type ReactNode } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { ChevronDown, LogOut, X } from "lucide-react"
import type { AuthRole, AuthSession } from "@workspace/contracts/auth"

export type WorkspaceSection = "overview" | "wallets" | "market"

const navigation: { section: WorkspaceSection; label: string; href: string }[] =
  [
    { section: "overview", label: "总览", href: "/account" },
    { section: "wallets", label: "钱包", href: "/wallets" },
    { section: "market", label: "行情", href: "/market" },
  ]

const roleLabels: Record<AuthRole, string> = {
  SUPER_ADMIN: "超级管理员",
  ADMIN: "管理员",
  USER: "用户",
}

type WorkspaceShellProps = {
  children: ReactNode
  section: WorkspaceSection
  session?: AuthSession | null
  preview?: boolean
  loggingOut?: boolean
  logoutError?: string
  onLogout?: () => void
}

function subscribeToHydration() {
  return () => {}
}

function getClientSnapshot() {
  return true
}

function getServerSnapshot() {
  return false
}

export function WorkspaceShell({
  children,
  section,
  session,
  preview = false,
  loggingOut = false,
  logoutError = "",
  onLogout,
}: WorkspaceShellProps) {
  const accountId = useId()
  const { theme, setTheme } = useTheme()
  // The theme is stored in the browser; keep the server and hydration markup equal.
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot
  )
  const email = preview ? "name@example.com" : session?.user.email

  function hrefFor(item: (typeof navigation)[number]) {
    return preview ? `/preview?section=${item.section}` : item.href
  }

  return (
    <div className="workspace">
      <a className="workspace-skip-link" href="#workspace-main">
        跳至主要内容
      </a>
      <header className="workspace-header">
        <div className="workspace-header-inner">
          <Link
            className="workspace-wordmark"
            href={preview ? "/preview" : "/account"}
            aria-label="AssetNote 总览"
          >
            AssetNote
          </Link>
          <nav className="workspace-navigation" aria-label="主导航">
            {navigation.map((item) => (
              <Link
                key={item.section}
                href={hrefFor(item)}
                aria-current={section === item.section ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {email && (
            <>
              <button
                className="workspace-account-trigger"
                type="button"
                popoverTarget={accountId}
                aria-label={
                  preview ? "打开预览账户菜单" : `打开账户菜单：${email}`
                }
              >
                <span className="workspace-avatar" aria-hidden="true">
                  {email[0]?.toUpperCase()}
                </span>
                <span className="workspace-account-email">{email}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              <div
                className="workspace-account-popover"
                id={accountId}
                popover="auto"
              >
                <div className="workspace-notice-title">
                  <h2>{preview ? "设计预览" : "我的账户"}</h2>
                  <button
                    type="button"
                    className="workspace-icon-button"
                    popoverTarget={accountId}
                    popoverTargetAction="hide"
                    aria-label="关闭账户菜单"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
                <p className="workspace-profile-email">{email}</p>
                <p className="workspace-profile-role">
                  {preview
                    ? "示例身份，不代表登录状态"
                    : session
                      ? roleLabels[session.user.role]
                      : ""}
                </p>
                <fieldset className="workspace-theme-options">
                  <legend>外观</legend>
                  {[
                    { value: "light", label: "浅色" },
                    { value: "dark", label: "深色" },
                    { value: "system", label: "跟随系统" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      aria-pressed={hydrated && theme === item.value}
                      onClick={() => setTheme(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </fieldset>
                {logoutError && (
                  <p className="workspace-error" role="alert">
                    {logoutError}
                  </p>
                )}
                {preview ? (
                  <Link className="workspace-logout" href="/login">
                    <LogOut size={17} aria-hidden="true" />
                    前往登录
                  </Link>
                ) : (
                  <button
                    className="workspace-logout"
                    type="button"
                    onClick={onLogout}
                    disabled={loggingOut}
                  >
                    <LogOut size={17} aria-hidden="true" />
                    {loggingOut ? "正在退出…" : "退出登录"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </header>
      <main id="workspace-main" className="workspace-main" tabIndex={-1}>
        {children}
      </main>
      <footer className="workspace-footer">仅记录资产，不参与交易</footer>
    </div>
  )
}
