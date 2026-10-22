"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Mail, Shield, UserRound, UsersRound } from "lucide-react"
import { useAccount } from "@/components/account-context"

const sections = [
  {
    href: "/settings/profile",
    label: "个人资料",
    icon: UserRound,
    management: false,
  },
  {
    href: "/settings/security",
    label: "账户安全",
    icon: Shield,
    management: false,
  },
  {
    href: "/settings/users",
    label: "用户管理",
    icon: UsersRound,
    management: true,
  },
  {
    href: "/settings/invitations",
    label: "邀请记录",
    icon: Mail,
    management: true,
  },
]
export function SettingsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { profile } = useAccount()
  const management =
    pathname.startsWith("/settings/users") ||
    pathname.startsWith("/settings/invitations")
  const detail = pathname.startsWith("/settings/users/")
  return (
    <div className="settings">
      {!detail && <h1 className="settings-title">设置</h1>}
      <div className={detail ? "settings-detail-shell" : "settings-layout"}>
        {!detail && (
          <nav className="settings-navigation" aria-label="设置导航">
            {sections
              .filter(
                (section) => !section.management || profile.canManageUsers
              )
              .map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={
                    pathname === href || pathname.startsWith(`${href}/`)
                      ? "page"
                      : undefined
                  }
                >
                  <Icon size={20} aria-hidden="true" />
                  {label}
                </Link>
              ))}
          </nav>
        )}
        <div className="settings-content">
          {management && !profile.canManageUsers ? (
            <div className="settings-empty">
              <h2>此页面仅对管理员开放</h2>
              <p>你可以继续管理自己的资料和密码。</p>
              <Link href="/settings/profile" className="workspace-text-link">
                返回个人资料
              </Link>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  )
}
