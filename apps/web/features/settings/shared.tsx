"use client"

import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react"
import { gsap } from "gsap"
import type { Account } from "@workspace/contracts/accounts"
import { getAuthErrorMessage } from "@/lib/api/auth-client"

export const roleLabels = {
  SUPER_ADMIN: "超级管理员",
  ADMIN: "管理员",
  USER: "普通用户",
}
export const invitationLabels = {
  PENDING: "待接受",
  ACCEPTED: "已接受",
  EXPIRED: "已过期",
  REVOKED: "已撤销",
}
export function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value))
    : "尚未登录"
}
export function accountName(user: Pick<Account, "nickname" | "email">) {
  return user.nickname || user.email.split("@")[0] || "用户"
}
export function Avatar({
  user,
  large = false,
}: {
  user: Pick<Account, "avatar" | "nickname" | "email">
  large?: boolean
}) {
  return (
    <span
      className={`settings-avatar ${large ? "is-large" : ""}`}
      aria-hidden="true"
    >
      {user.avatar ? (
        <Image
          src={user.avatar}
          alt=""
          width={large ? 108 : 44}
          height={large ? 108 : 44}
          unoptimized
        />
      ) : (
        accountName(user).slice(0, 1).toUpperCase()
      )}
    </span>
  )
}
export function PrimaryButton({
  children,
  pending,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean }) {
  return (
    <button
      {...props}
      className="settings-primary"
      disabled={pending || props.disabled}
    >
      <span>{children}</span>
      <span aria-hidden="true" className="settings-button-arrow">
        {pending ? (
          <LoaderCircle className="auth-spinner" size={19} />
        ) : (
          <ArrowRight size={19} />
        )}
      </span>
    </button>
  )
}
export function Notice({
  message,
  error = false,
}: {
  message: string
  error?: boolean
}) {
  const ref = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (!message || !ref.current) return
    const media = gsap.matchMedia()
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(ref.current, {
        y: 4,
        opacity: 0.5,
        duration: 0.24,
        ease: "expo.out",
        clearProps: "transform,opacity",
      })
    })
    return () => media.revert()
  }, [message])
  return (
    <p
      ref={ref}
      className={`settings-feedback ${error ? "is-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {message && (
        <>
          {error ? (
            <CircleAlert size={18} aria-hidden="true" />
          ) : (
            <Check size={18} aria-hidden="true" />
          )}
          <span>{message}</span>
        </>
      )}
    </p>
  )
}
export function PasswordField({
  name,
  label,
  current = false,
  disabled = false,
  hint,
}: {
  name: string
  label: string
  current?: boolean
  disabled?: boolean
  hint?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="settings-field">
      <label htmlFor={name}>{label}</label>
      <div className="settings-password">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          required
          maxLength={current ? 1024 : 128}
          minLength={current ? 1 : 15}
          autoComplete={current ? "current-password" : "new-password"}
          readOnly={disabled}
          aria-describedby={hint ? `${name}-hint` : undefined}
        />
        <button
          type="button"
          aria-label={`${visible ? "隐藏" : "显示"}${label}`}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {hint && (
        <p id={`${name}-hint`} className="settings-hint">
          {hint}
        </p>
      )}
    </div>
  )
}
export function Status({ status }: { status: Account["status"] }) {
  return (
    <span
      className={`settings-status ${status === "ACTIVE" ? "is-active" : "is-disabled"}`}
    >
      <span aria-hidden="true" />
      {status === "ACTIVE" ? "启用" : "停用"}
    </span>
  )
}
export function Heading({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <div className="settings-heading">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </div>
  )
}
export function Pagination({
  page,
  total,
  pageSize,
  onPage,
  loading,
}: {
  page: number
  total: number
  pageSize: number
  onPage(page: number): void
  loading: boolean
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="settings-pagination">
      <span>共 {total} 条记录</span>
      <div>
        <button
          className="settings-secondary"
          disabled={page <= 1 || loading}
          onClick={() => onPage(page - 1)}
        >
          上一页
        </button>
        <span>
          {page} / {pages}
        </span>
        <button
          className="settings-secondary"
          disabled={page >= pages || page >= 500 || loading}
          onClick={() => onPage(page + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  )
}
export function ResourceError({
  message,
  retry,
}: {
  message: string
  retry(): void
}) {
  return (
    <div className="settings-empty">
      <Notice message={message} error />
      <div className="settings-actions">
        <button className="settings-secondary" onClick={retry}>
          重新加载
        </button>
        <Link className="workspace-text-link" href="/login">
          重新登录
        </Link>
      </div>
    </div>
  )
}
export function Loading() {
  return (
    <div className="settings-loading" role="status">
      <LoaderCircle className="auth-spinner" size={20} />
      正在读取账户资料…
    </div>
  )
}

export function useResource<T>(load: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{
    data: T | null
    error: string
    loaded: typeof load | null
    attempt: number
  }>({ data: null, error: "", loaded: null, attempt: -1 })
  useEffect(() => {
    let active = true
    Promise.resolve()
      .then(load)
      .then(
        (data) => {
          if (active) setState({ data, error: "", loaded: load, attempt })
        },
        (error: unknown) => {
          if (active)
            setState({
              data: null,
              error: getAuthErrorMessage(error),
              loaded: load,
              attempt,
            })
        }
      )
    return () => {
      active = false
    }
  }, [load, attempt])
  return {
    data: state.data,
    error:
      state.loaded === load && state.attempt === attempt ? state.error : "",
    loading: state.loaded !== load || state.attempt !== attempt,
    reload() {
      setAttempt((value) => value + 1)
    },
  }
}

export function ConfirmDialog({
  title,
  children,
  pending,
  error,
  onCancel,
  onConfirm,
  confirmLabel,
}: {
  title: string
  children: ReactNode
  pending: boolean
  error: string
  onCancel(): void
  onConfirm(): void
  confirmLabel: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog?.showModal()
    cancelRef.current?.focus()
    return () => {
      dialog?.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className="settings-dialog"
      onCancel={(event) => {
        event.preventDefault()
        if (!pending) onCancel()
      }}
      aria-labelledby="confirmation-title"
    >
      <h2 id="confirmation-title">{title}</h2>
      <div className="settings-dialog-copy">{children}</div>
      <Notice message={error} error />
      <div className="settings-actions">
        <button
          className="settings-danger"
          disabled={pending}
          onClick={onConfirm}
        >
          {pending ? "正在处理…" : confirmLabel}
        </button>
        <button
          ref={cancelRef}
          className="settings-secondary"
          disabled={pending}
          onClick={onCancel}
        >
          取消
        </button>
      </div>
    </dialog>
  )
}
