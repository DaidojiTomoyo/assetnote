"use client"

import { useCallback, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowRight, Copy } from "lucide-react"
import {
  createInvitationSchema,
  invitationQuerySchema,
  type CreatedInvitation,
  type Invitation,
} from "@workspace/contracts/accounts"
import { useAccount } from "@/components/account-context"
import { getAccountsClient } from "@/lib/api/accounts-client"
import { getAuthErrorMessage } from "@/lib/api/auth-client"
import {
  ConfirmDialog,
  formatDate,
  Heading,
  invitationLabels,
  Loading,
  Notice,
  Pagination,
  PrimaryButton,
  ResourceError,
  roleLabels,
  useResource,
} from "./shared"

export function InvitationLink({ created }: { created: CreatedInvitation }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  return (
    <section className="settings-invitation-link" aria-label="新生成的邀请链接">
      <h3>邀请链接已生成</h3>
      <p>
        发给 {created.invitation.email}，有效期至{" "}
        {formatDate(created.invitation.expiresAt)}。
      </p>
      <label className="sr-only" htmlFor="created-link">
        邀请链接
      </label>
      <div className="settings-copy-row">
        <input
          id="created-link"
          value={created.link}
          readOnly
          onFocus={(event) => event.target.select()}
        />
        <button
          type="button"
          className="settings-secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(created.link)
              setCopied(true)
              setError("")
            } catch {
              setError("无法自动复制，请选中链接后手动复制。")
            }
          }}
        >
          <Copy size={17} aria-hidden="true" />
          {copied ? "已复制" : "复制链接"}
        </button>
      </div>
      <p className="settings-hint">
        链接仅在本次生成后显示。离开页面后可在邀请记录中重新生成，旧链接随即失效。
      </p>
      {error && <Notice message={error} error />}
    </section>
  )
}

export function NewInvitation() {
  const { profile } = useAccount()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [created, setCreated] = useState<CreatedInvitation | null>(null)
  const busy = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    const data = new FormData(event.currentTarget)
    const result = createInvitationSchema.safeParse({
      email: data.get("email"),
      role: data.get("role"),
    })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "请检查邀请信息。")
      return
    }
    busy.current = true
    setPending(true)
    setError("")
    try {
      setCreated(await getAccountsClient().createInvitation(result.data))
    } catch (error) {
      setError(getAuthErrorMessage(error))
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return (
    <>
      <Link href="/settings/invitations" className="settings-back">
        <ArrowLeft size={18} aria-hidden="true" />
        返回邀请记录
      </Link>
      <Heading
        title="邀请用户"
        description="生成专属链接，由你分享给受邀者。"
      />
      {created ? (
        <>
          <InvitationLink created={created} />
          <div className="settings-actions settings-after-action">
            <button
              className="settings-secondary"
              onClick={() => setCreated(null)}
            >
              继续邀请
            </button>
            <Link href="/settings/invitations" className="workspace-text-link">
              查看邀请记录
            </Link>
          </div>
        </>
      ) : (
        <form
          className="settings-form"
          onSubmit={submit}
          aria-label="邀请用户"
          aria-busy={pending}
        >
          <div className="settings-field">
            <label htmlFor="invite-email">受邀邮箱</label>
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="off"
              readOnly={pending}
              placeholder="name@example.com"
            />
            <p className="settings-hint">
              受邀者将使用这个邮箱登录。已有账户无需重复邀请。
            </p>
          </div>
          <div className="settings-field">
            <label htmlFor="invite-role">邀请角色</label>
            <select
              id="invite-role"
              name="role"
              defaultValue="USER"
              disabled={pending}
            >
              {profile.inviteRoles.map((role) => (
                <option value={role} key={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
            <p className="settings-hint">
              角色仅决定账户管理权限，不授予他人资产的访问权。
            </p>
          </div>
          <Notice message={error} error />
          <PrimaryButton type="submit" pending={pending}>
            生成邀请链接
          </PrimaryButton>
          <p className="settings-hint settings-after-action">
            邀请在 7 天后过期，仅可接受一次。请将链接发送给对应邮箱的使用者。
          </p>
        </form>
      )}
    </>
  )
}

export function InvitationsList() {
  const params = useSearchParams()
  const router = useRouter()
  const query = params.toString()
  const load = useCallback(() => {
    const values = new URLSearchParams(query)
    const parsed = invitationQuerySchema.safeParse({
      status: values.get("status") || undefined,
      page: values.get("page") ?? 1,
    })
    return getAccountsClient().listInvitations(
      parsed.success ? parsed.data : { page: 1 }
    )
  }, [query])
  const resource = useResource(load)
  const [action, setAction] = useState<{
    invitation: Invitation
    kind: "revoke" | "reinvite"
  } | null>(null)
  const [created, setCreated] = useState<CreatedInvitation | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const busy = useRef(false)
  function change(key: string, value: string) {
    const next = new URLSearchParams(query)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== "page") next.delete("page")
    router.replace(`/settings/invitations?${next}`)
  }
  async function perform() {
    if (!action || busy.current) return
    busy.current = true
    setPending(true)
    setError("")
    setMessage("")
    try {
      if (action.kind === "reinvite")
        setCreated(await getAccountsClient().reinvite(action.invitation.id))
      else {
        await getAccountsClient().revokeInvitation(action.invitation.id)
        setMessage("邀请已撤销")
        if (created?.invitation.id === action.invitation.id) setCreated(null)
      }
      setAction(null)
      resource.reload()
    } catch (error) {
      setError(getAuthErrorMessage(error))
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return (
    <>
      <Heading
        title="邀请记录"
        description="查看账户邀请，处理尚未接受的链接。"
      >
        <Link className="settings-primary" href="/settings/invitations/new">
          <span>邀请用户</span>
          <span className="settings-button-arrow">
            <ArrowRight size={19} aria-hidden="true" />
          </span>
        </Link>
      </Heading>
      {created && <InvitationLink key={created.link} created={created} />}
      <div className="settings-invitation-filters">
        <label htmlFor="invitation-status">邀请状态</label>
        <select
          id="invitation-status"
          value={params.get("status") ?? ""}
          onChange={(event) => change("status", event.target.value)}
        >
          <option value="">全部邀请</option>
          {Object.entries(invitationLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {message && <Notice message={message} />}
      {resource.error ? (
        <ResourceError message={resource.error} retry={resource.reload} />
      ) : !resource.data ? (
        <Loading />
      ) : (
        <div aria-busy={resource.loading}>
          <table className="settings-table settings-invites-table">
            <caption className="sr-only">邀请记录</caption>
            <thead>
              <tr>
                <th>受邀邮箱</th>
                <th>角色</th>
                <th>状态</th>
                <th className="settings-date-column">有效期至</th>
                <th>
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {resource.data.invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td className="settings-invite-email">{invitation.email}</td>
                  <td>{roleLabels[invitation.role]}</td>
                  <td>
                    <span
                      className={`settings-invite-status is-${invitation.status.toLowerCase()}`}
                    >
                      {invitationLabels[invitation.status]}
                    </span>
                  </td>
                  <td className="settings-date-column">
                    {formatDate(invitation.expiresAt)}
                  </td>
                  <td>
                    <div className="settings-invite-actions">
                      {invitation.canReinvite && (
                        <button
                          className="settings-text-button"
                          onClick={() => {
                            setError("")
                            setAction({ invitation, kind: "reinvite" })
                          }}
                        >
                          {invitation.status === "PENDING"
                            ? "重新生成"
                            : "重新邀请"}
                        </button>
                      )}
                      {invitation.canRevoke && (
                        <button
                          className="settings-text-button"
                          onClick={() => {
                            setError("")
                            setAction({ invitation, kind: "revoke" })
                          }}
                        >
                          撤销
                        </button>
                      )}
                      {!invitation.canReinvite && !invitation.canRevoke && (
                        <span className="settings-hint">无可用操作</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {resource.data.invitations.length === 0 && (
            <div className="settings-empty">
              <h3>还没有{params.get("status") ? "这类" : ""}邀请</h3>
              <p>新生成的邀请和处理记录会出现在这里。</p>
            </div>
          )}
          <Pagination
            page={resource.data.page}
            total={resource.data.total}
            pageSize={resource.data.pageSize}
            loading={resource.loading}
            onPage={(page) => change("page", String(page))}
          />
        </div>
      )}
      {action && (
        <ConfirmDialog
          title={
            action.kind === "revoke" ? "撤销这个邀请？" : "生成新的邀请链接？"
          }
          confirmLabel={action.kind === "revoke" ? "确认撤销" : "重新生成"}
          pending={pending}
          error={error}
          onCancel={() => {
            setAction(null)
            setError("")
          }}
          onConfirm={perform}
        >
          <p>{action.invitation.email}</p>
          <p>
            {action.kind === "revoke"
              ? "旧链接将立即失效，受邀者将无法再用它创建账户。"
              : "该邮箱此前未接受的链接会失效。新链接有效期为 7 天，请重新分享。"}
          </p>
        </ConfirmDialog>
      )}
    </>
  )
}
