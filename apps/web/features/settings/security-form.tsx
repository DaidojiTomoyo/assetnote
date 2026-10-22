"use client"

import { useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { changePasswordSchema } from "@workspace/contracts/accounts"
import { getAccountsClient } from "@/lib/api/accounts-client"
import { getAuthErrorMessage } from "@/lib/api/auth-client"
import { Heading, Notice, PasswordField, PrimaryButton } from "./shared"

export function SecurityForm() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const busy = useRef(false)
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    const form = event.currentTarget
    const data = new FormData(form)
    const parsed = changePasswordSchema.safeParse({
      currentPassword: data.get("currentPassword"),
      newPassword: data.get("newPassword"),
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查密码。")
      return
    }
    if (data.get("confirmation") !== parsed.data.newPassword) {
      setError("两次输入的新密码不一致。")
      const input = form.elements.namedItem("confirmation")
      if (input instanceof HTMLInputElement) input.focus()
      return
    }
    busy.current = true
    setPending(true)
    setError("")
    try {
      await getAccountsClient().changePassword(parsed.data)
      form.reset()
      setDone(true)
    } catch (error) {
      setError(getAuthErrorMessage(error))
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return (
    <>
      <Heading title="账户安全" description="更新密码，保护你的个人记录。" />
      {done ? (
        <div className="settings-empty">
          <Notice message="密码已更新，所有设备上的登录会话已退出。" />
          <Link className="settings-secondary" href="/login">
            使用新密码登录
          </Link>
        </div>
      ) : (
        <form
          className="settings-form"
          onSubmit={save}
          aria-label="修改密码"
          aria-busy={pending}
        >
          <PasswordField
            name="currentPassword"
            label="当前密码"
            current
            disabled={pending}
          />
          <PasswordField
            name="newPassword"
            label="新密码"
            disabled={pending}
            hint="15–128 个字符，可以使用空格和中文。建议使用与其他网站不同的长密码。"
          />
          <PasswordField
            name="confirmation"
            label="确认新密码"
            disabled={pending}
          />
          <Notice message={error} error />
          <PrimaryButton type="submit" pending={pending}>
            {pending ? "正在更新…" : "更新密码"}
          </PrimaryButton>
          <p className="settings-hint settings-after-action">
            修改成功后，你在所有设备上都需要重新登录。
          </p>
        </form>
      )}
    </>
  )
}
