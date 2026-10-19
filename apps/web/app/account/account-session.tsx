"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { AuthRole, AuthSession } from "@workspace/contracts/auth"
import { getAuthClient, getAuthErrorMessage } from "@/lib/api/auth-client"

const roleLabels: Record<AuthRole, string> = {
  SUPER_ADMIN: "超级管理员",
  ADMIN: "管理员",
  USER: "用户",
}

export function AccountSession() {
  const router = useRouter()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let active = true
    async function loadSession() {
      try {
        const current = await getAuthClient().getSession()
        if (!active) return
        if (!current) {
          router.replace("/login")
          return
        }
        setSession(current)
        setLoading(false)
      } catch (error) {
        if (!active) return
        setMessage(getAuthErrorMessage(error))
        setLoading(false)
      }
    }
    void loadSession()
    return () => {
      active = false
    }
  }, [router, attempt])

  async function logout() {
    setLoggingOut(true)
    setMessage("")
    try {
      await getAuthClient().logout()
      router.replace("/login")
    } catch (error) {
      setMessage(getAuthErrorMessage(error))
      setLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <>
        <h1 id="auth-title">正在确认账户</h1>
        <p className="auth-instruction" role="status">
          请稍候，正在读取当前登录状态。
        </p>
      </>
    )
  }

  if (!session) {
    return (
      <>
        <h1 id="auth-title">暂时无法读取账户</h1>
        <p className="auth-instruction" role="alert">
          {message}
        </p>
        <button
          className="auth-submit"
          onClick={() => {
            setLoading(true)
            setMessage("")
            setAttempt((current) => current + 1)
          }}
        >
          重新尝试
        </button>
      </>
    )
  }

  return (
    <>
      <h1 id="auth-title">已登录</h1>
      <p className="auth-instruction">欢迎回到 AssetNote。</p>
      <dl className="auth-account-details">
        <div>
          <dt>邮箱</dt>
          <dd>{session.user.email}</dd>
        </div>
        <div>
          <dt>角色</dt>
          <dd>{roleLabels[session.user.role]}</dd>
        </div>
      </dl>
      <p className="auth-account-note">
        钱包与行情页面尚未开放，你的账户已成功连接。
      </p>
      <p className="auth-feedback" role="alert">
        {message}
      </p>
      <button className="auth-submit" onClick={logout} disabled={loggingOut}>
        {loggingOut ? "正在退出…" : "退出登录"}
      </button>
    </>
  )
}
