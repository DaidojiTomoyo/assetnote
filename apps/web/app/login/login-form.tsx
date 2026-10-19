"use client"

import { useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react"
import { loginRequestSchema } from "@workspace/contracts/auth"
import { getAuthClient, getAuthErrorMessage } from "@/lib/api/auth-client"

type FieldErrors = { email?: string; password?: string }

export function LoginForm() {
  const router = useRouter()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState("")
  const feedback = errors.email ?? errors.password ?? message

  function clearError(field: keyof FieldErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }))
    setMessage("")
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return

    const formData = new FormData(event.currentTarget)
    const result = loginRequestSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    })
    setMessage("")
    if (!result.success) {
      const nextErrors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0]
        if ((field === "email" || field === "password") && !nextErrors[field]) {
          nextErrors[field] = issue.message
        }
      }
      setErrors(nextErrors)
      if (nextErrors.email) emailRef.current?.focus()
      else passwordRef.current?.focus()
      return
    }

    setErrors({})
    submittingRef.current = true
    setPending(true)
    try {
      await getAuthClient().login(result.data)
      router.replace("/account")
    } catch (error) {
      setMessage(getAuthErrorMessage(error))
      submittingRef.current = false
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="登录账户"
      aria-busy={pending}
    >
      <div className="auth-field">
        <label htmlFor="email">邮箱</label>
        <div className="auth-control">
          <input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="name@example.com"
            maxLength={254}
            required
            readOnly={pending}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            onChange={() => clearError("email")}
          />
        </div>
        {errors.email && (
          <p className="sr-only" id="email-error">
            {errors.email}
          </p>
        )}
      </div>
      <div className="auth-field">
        <label htmlFor="password">密码</label>
        <div className="auth-control auth-password">
          <input
            ref={passwordRef}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="请输入密码"
            maxLength={1024}
            required
            readOnly={pending}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            onChange={() => clearError("password")}
          />
          <button
            type="button"
            className="auth-visibility"
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? (
              <EyeOff size={20} aria-hidden="true" />
            ) : (
              <Eye size={20} aria-hidden="true" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="sr-only" id="password-error">
            {errors.password}
          </p>
        )}
      </div>
      <p className="auth-feedback" role="alert">
        {feedback}
      </p>
      <button
        className="auth-submit auth-login-submit"
        type="submit"
        disabled={pending}
      >
        <span>{pending ? "正在登录…" : "登录"}</span>
        <span className="auth-submit-indicator" aria-hidden="true">
          {pending ? (
            <LoaderCircle size={20} className="auth-spinner" />
          ) : (
            <ArrowRight size={20} className="auth-submit-arrow" />
          )}
        </span>
      </button>
      <p className="auth-help">忘记密码或无法登录？请联系邀请你的管理员。</p>
    </form>
  )
}
