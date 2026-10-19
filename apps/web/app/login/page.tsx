import type { Metadata } from "next"
import { AuthShell } from "@/components/auth-shell"
import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "登录" }

export default function LoginPage() {
  return (
    <AuthShell>
      <h1 id="auth-title">欢迎回来</h1>
      <p className="auth-instruction">使用邮箱和密码登录 AssetNote。</p>
      <LoginForm />
      <p className="auth-invitation">仅限受邀用户，暂不开放公开注册。</p>
    </AuthShell>
  )
}
