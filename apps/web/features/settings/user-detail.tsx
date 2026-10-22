"use client"

import { useCallback, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import type { AccountDetail } from "@workspace/contracts/accounts"
import { getAccountsClient } from "@/lib/api/accounts-client"
import { getAuthErrorMessage } from "@/lib/api/auth-client"
import {
  accountName,
  Avatar,
  ConfirmDialog,
  formatDate,
  Loading,
  Notice,
  PrimaryButton,
  ResourceError,
  roleLabels,
  Status,
  useResource,
} from "./shared"

export function UserDetail({ id }: { id: string }) {
  const params = useSearchParams()
  const load = useCallback(() => getAccountsClient().getUser(id), [id])
  const resource = useResource(load)
  return (
    <>
      <Link
        className="settings-back"
        href={`/settings/users?${params.get("return") ?? ""}`}
      >
        <ArrowLeft size={18} aria-hidden="true" />
        返回用户列表
      </Link>
      <h1 className="settings-title">用户详情</h1>
      {resource.error ? (
        <ResourceError message={resource.error} retry={resource.reload} />
      ) : resource.data ? (
        <DetailForms
          key={resource.data.user.id + ":" + resource.data.user.version}
          initial={resource.data}
        />
      ) : (
        <Loading />
      )}
    </>
  )
}
function DetailForms({ initial }: { initial: AccountDetail }) {
  const [detail, setDetail] = useState(initial)
  const [selectedRole, setSelectedRole] = useState(initial.user.role)
  const [pending, setPending] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const busy = useRef(false)
  const { user, capabilities } = detail
  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current || selectedRole === "SUPER_ADMIN") return
    busy.current = true
    setPending(true)
    setError("")
    setMessage("")
    try {
      const result = await getAccountsClient().changeAccess(user.id, {
        role: selectedRole,
        version: user.version,
      })
      setDetail(result)
      setMessage("角色已更新")
    } catch (error) {
      setError(getAuthErrorMessage(error))
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  async function changeStatus() {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError("")
    setMessage("")
    try {
      const result = await getAccountsClient().changeAccess(user.id, {
        status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
        version: user.version,
      })
      setDetail(result)
      setConfirm(false)
      setMessage(
        result.user.status === "ACTIVE"
          ? "账户已启用"
          : "账户已停用，已有会话已退出"
      )
    } catch (error) {
      setError(getAuthErrorMessage(error))
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return (
    <>
      <div className="settings-detail-grid">
        <aside className="settings-identity">
          <Avatar user={user} large />
          <h2>{accountName(user)}</h2>
          <p className="settings-identity-email">{user.email}</p>
          <dl>
            <div>
              <dt>角色</dt>
              <dd>{roleLabels[user.role]}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>
                <Status status={user.status} />
              </dd>
            </div>
            <div>
              <dt>加入时间</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt>最近登录</dt>
              <dd>{formatDate(user.lastLoginAt)}</dd>
            </div>
          </dl>
        </aside>
        <div className="settings-detail-controls">
          <section>
            <h2>角色与权限</h2>
            <form onSubmit={saveRole} aria-label="修改用户角色">
              <div className="settings-field">
                <label htmlFor="user-role">平台角色</label>
                <select
                  id="user-role"
                  value={selectedRole}
                  disabled={pending || capabilities.roleOptions.length === 0}
                  onChange={(event) => {
                    const role = event.target.value
                    if (role === "ADMIN" || role === "USER") {
                      setSelectedRole(role)
                      setMessage("")
                    }
                  }}
                >
                  {capabilities.roleOptions.length ? (
                    capabilities.roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))
                  ) : (
                    <option value={user.role}>{roleLabels[user.role]}</option>
                  )}
                </select>
                <p className="settings-hint">
                  {selectedRole === "ADMIN"
                    ? "可邀请、启用或停用普通用户。管理权限不包含他人的资产记录。"
                    : selectedRole === "SUPER_ADMIN"
                      ? "超级管理员由受控操作维护，此处不能修改。"
                      : "管理自己的账户与资产记录。"}
                </p>
              </div>
              {capabilities.roleOptions.length > 0 && (
                <div className="settings-actions">
                  <PrimaryButton
                    type="submit"
                    pending={pending}
                    disabled={selectedRole === user.role}
                  >
                    保存更改
                  </PrimaryButton>
                  <button
                    type="button"
                    className="settings-secondary"
                    disabled={pending || selectedRole === user.role}
                    onClick={() => setSelectedRole(user.role)}
                  >
                    取消
                  </button>
                </div>
              )}
            </form>
          </section>
          <section className="settings-status-section">
            <h2>账户状态</h2>
            <p className="settings-field-label">当前状态</p>
            <Status status={user.status} />
            <div className="settings-status-action">
              {capabilities.canChangeStatus ? (
                <>
                  <button
                    className={
                      user.status === "ACTIVE"
                        ? "settings-danger"
                        : "settings-secondary"
                    }
                    disabled={pending}
                    onClick={() => {
                      setError("")
                      setConfirm(true)
                    }}
                  >
                    {user.status === "ACTIVE" ? "停用账户" : "启用账户"}
                  </button>
                  <p className="settings-hint">
                    {user.status === "ACTIVE"
                      ? "停用后无法登录，已有会话会立即退出。"
                      : "启用后可重新登录；此前的会话不会恢复。"}
                  </p>
                </>
              ) : (
                <p className="settings-hint">
                  当前账户、超级管理员及权限范围外的用户不能在此修改。
                </p>
              )}
            </div>
          </section>
          <Notice
            message={!confirm && error ? error : message}
            error={!confirm && Boolean(error)}
          />
        </div>
      </div>
      {confirm && (
        <ConfirmDialog
          title={user.status === "ACTIVE" ? "停用这个账户？" : "启用这个账户？"}
          confirmLabel={user.status === "ACTIVE" ? "确认停用" : "确认启用"}
          pending={pending}
          error={error}
          onCancel={() => {
            setConfirm(false)
            setError("")
          }}
          onConfirm={changeStatus}
        >
          <p>
            {accountName(user)} · {user.email}
          </p>
          <p>
            {user.status === "ACTIVE"
              ? "该用户将立即退出所有登录会话，已有资产记录保留。"
              : "该用户将能够使用原有密码重新登录。"}
          </p>
        </ConfirmDialog>
      )}
    </>
  )
}
