"use client"

import {
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react"
import Link from "next/link"
import { acceptInvitationSchema } from "@workspace/contracts/accounts"
import { ApiError, getAuthErrorMessage } from "@/lib/api/auth-client"
import { getAccountsClient } from "@/lib/api/accounts-client"
import {
  formatDate,
  Loading,
  Notice,
  PasswordField,
  PrimaryButton,
  roleLabels,
  useResource,
} from "@/features/settings/shared"

function subscribeHash(listener: () => void) {
  window.addEventListener("hashchange", listener)
  return () => window.removeEventListener("hashchange", listener)
}
function getHash() {
  return window.location.hash.slice(1)
}
function getServerHash() {
  return ""
}
export function AcceptInvitationForm() {
  const token = useSyncExternalStore(subscribeHash, getHash, getServerHash)
  const load = useCallback(
    () =>
      token
        ? getAccountsClient().resolveInvitation(token)
        : Promise.reject(new ApiError("请打开管理员发给你的完整邀请链接。")),
    [token]
  )
  const resource = useResource(load)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const busy = useRef(false)
  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    const parsed = acceptInvitationSchema.safeParse({
      token,
      nickname: data.get("nickname"),
      password: data.get("password"),
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查资料。")
      return
    }
    if (data.get("confirmation") !== parsed.data.password) {
      setError("两次输入的密码不一致。")
      return
    }
    busy.current = true
    setPending(true)
    setError("")
    try {
      await getAccountsClient().acceptInvitation(parsed.data)
      form.reset()
      setDone(true)
      window.history.replaceState(null, "", "/invite")
    } catch (error) {
      setError(getAuthErrorMessage(error))
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return (
    <div className="invite-form">
      <h1 id="auth-title">{done ? "账户已就绪" : "欢迎加入 AssetNote"}</h1>
      {done ? (
        <>
          <p className="auth-instruction">
            邀请已接受，现在可以使用邮箱和新密码登录。
          </p>
          <Link className="auth-submit" href="/login">
            前往登录
          </Link>
        </>
      ) : resource.loading ? (
        <Loading />
      ) : resource.error ? (
        <>
          <Notice message={resource.error} error />
          <button className="settings-secondary" onClick={resource.reload}>
            重新检查链接
          </button>
          <p className="auth-help">
            <Link href="/login">返回登录</Link>
          </p>
        </>
      ) : (
        resource.data && (
          <>
            <p className="auth-instruction">
              受邀邮箱：{resource.data.email}
              <br />
              {roleLabels[resource.data.role]} · 邀请有效期至{" "}
              {formatDate(resource.data.expiresAt)}
            </p>
            <form onSubmit={accept} aria-label="接受邀请" aria-busy={pending}>
              <div className="settings-field">
                <label htmlFor="invite-nickname">昵称</label>
                <input
                  name="nickname"
                  id="invite-nickname"
                  required
                  maxLength={40}
                  autoComplete="nickname"
                  readOnly={pending}
                />
              </div>
              <PasswordField
                name="password"
                label="设置密码"
                hint="15–128 个字符，可使用空格和中文。"
                disabled={pending}
              />
              <PasswordField
                name="confirmation"
                label="确认密码"
                disabled={pending}
              />
              <Notice message={error} error />
              <PrimaryButton type="submit" pending={pending}>
                {pending ? "正在创建…" : "接受邀请并创建账户"}
              </PrimaryButton>
            </form>
          </>
        )
      )}
    </div>
  )
}
