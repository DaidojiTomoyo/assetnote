"use client"

import { useRef, useState, type FormEvent } from "react"
import { useAccount } from "@/components/account-context"
import { getAccountsClient } from "@/lib/api/accounts-client"
import { getAuthErrorMessage } from "@/lib/api/auth-client"
import { updateProfileSchema } from "@workspace/contracts/accounts"
import { prepareAvatar } from "./avatar-file"
import { Avatar, Heading, Notice, PrimaryButton, roleLabels } from "./shared"

export function ProfileForm() {
  const { profile, updateUser } = useAccount()
  const [nickname, setNickname] = useState(profile.user.nickname ?? "")
  const [avatar, setAvatar] = useState(profile.user.avatar)
  const [version, setVersion] = useState(profile.user.version)
  const [pending, setPending] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const busy = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const dirty =
    nickname !== (profile.user.nickname ?? "") || avatar !== profile.user.avatar

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current || processing) return
    const parsed = updateProfileSchema.safeParse({
      nickname,
      ...(avatar !== profile.user.avatar ? { avatar } : {}),
      version,
    })
    setMessage("")
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查资料。")
      return
    }
    busy.current = true
    setPending(true)
    setError("")
    try {
      const user = await getAccountsClient().updateProfile(parsed.data)
      updateUser(user)
      setNickname(user.nickname ?? "")
      setAvatar(user.avatar)
      setVersion(user.version)
      setMessage("资料已保存")
    } catch (error) {
      setError(getAuthErrorMessage(error))
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  return (
    <>
      <Heading title="个人资料" description="让你的账户更容易被认出。" />
      <form
        className="settings-form"
        onSubmit={save}
        aria-label="个人资料"
        aria-busy={pending}
        onChange={() => {
          setMessage("")
          setError("")
        }}
      >
        <div className="settings-avatar-editor">
          <Avatar user={{ ...profile.user, nickname, avatar }} large />
          <div>
            <div className="settings-actions">
              <button
                type="button"
                className="settings-secondary"
                disabled={pending || processing}
                onClick={() => fileRef.current?.click()}
              >
                {processing ? "正在处理…" : "更换头像"}
              </button>
              <button
                type="button"
                className="settings-text-button"
                disabled={!avatar || pending || processing}
                onClick={() => {
                  setAvatar(null)
                  setMessage("")
                }}
              >
                移除头像
              </button>
            </div>
            <p className="settings-hint">
              PNG、JPEG 或 WebP，最多 5 MB。将居中裁剪为正方形。
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-label="选择头像图片"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (!file) return
              setProcessing(true)
              setError("")
              setMessage("")
              try {
                setAvatar(await prepareAvatar(file))
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : "头像处理失败。"
                )
              } finally {
                setProcessing(false)
              }
            }}
          />
        </div>
        <div className="settings-field">
          <label htmlFor="nickname">昵称</label>
          <input
            id="nickname"
            name="nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            maxLength={40}
            required
            autoComplete="nickname"
            readOnly={pending}
            placeholder="填写你的昵称"
          />
        </div>
        <div className="settings-field">
          <label htmlFor="profile-email">登录邮箱</label>
          <input
            id="profile-email"
            value={profile.user.email}
            readOnly
            aria-describedby="profile-email-hint"
          />
          <p id="profile-email-hint" className="settings-hint">
            登录邮箱暂不支持修改。
          </p>
        </div>
        <div className="settings-field">
          <label htmlFor="profile-role">平台角色</label>
          <input
            id="profile-role"
            value={roleLabels[profile.user.role]}
            readOnly
          />
        </div>
        <div className="settings-save-row">
          <PrimaryButton
            type="submit"
            pending={pending}
            disabled={!dirty || processing}
          >
            {pending ? "正在保存…" : "保存资料"}
          </PrimaryButton>
          <Notice message={error || message} error={Boolean(error)} />
        </div>
      </form>
    </>
  )
}
