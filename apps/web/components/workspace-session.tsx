"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import type { AuthSession } from "@workspace/contracts/auth"
import { getAuthClient, getAuthErrorMessage } from "@/lib/api/auth-client"
import { WorkspaceShell } from "./workspace-shell"

export function WorkspaceSession({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const section = pathname.startsWith("/wallets")
    ? "wallets"
    : pathname.startsWith("/market")
      ? "market"
      : "overview"
  const [session, setSession] = useState<AuthSession | null>(null)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)
  const logoutPending = useRef(false)

  useEffect(() => {
    let active = true
    async function loadSession() {
      try {
        const current = await getAuthClient().getSession()
        if (!active) return
        if (!current) {
          setSession(null)
          setLoading(true)
          router.replace("/login")
          return
        }
        setSession(current)
        setMessage("")
        setLoading(false)
      } catch (error) {
        if (!active) return
        setSession(null)
        setMessage(getAuthErrorMessage(error))
        setLoading(false)
      }
    }
    void loadSession()
    return () => {
      active = false
    }
  }, [router, pathname, attempt])

  async function logout() {
    if (logoutPending.current) return
    logoutPending.current = true
    setLoggingOut(true)
    setMessage("")
    try {
      await getAuthClient().logout()
      router.replace("/login")
    } catch (error) {
      setMessage(getAuthErrorMessage(error))
      logoutPending.current = false
      setLoggingOut(false)
    }
  }

  return (
    <WorkspaceShell
      section={section}
      session={session}
      onLogout={logout}
      loggingOut={loggingOut}
      logoutError={session ? message : ""}
    >
      {loading ? (
        <div
          className="workspace-loading"
          role="status"
          aria-label="正在读取登录状态"
        >
          <span className="sr-only">正在读取登录状态，请稍候。</span>
          <div className="workspace-skeleton skeleton-heading" />
          <div className="workspace-skeleton skeleton-total" />
          <div className="workspace-skeleton skeleton-allocation" />
          <div className="workspace-skeleton skeleton-chart" />
        </div>
      ) : !session ? (
        <section
          className="workspace-unavailable"
          aria-labelledby="session-error-title"
        >
          <h1 id="session-error-title">暂时无法读取账户</h1>
          <p role="alert">{message}</p>
          <div className="workspace-recovery-actions">
            <button
              className="workspace-primary"
              type="button"
              onClick={() => {
                setLoading(true)
                setMessage("")
                setAttempt((current) => current + 1)
              }}
            >
              重新尝试
            </button>
            <Link className="workspace-text-link" href="/login">
              返回登录
            </Link>
          </div>
        </section>
      ) : (
        children
      )}
    </WorkspaceShell>
  )
}
