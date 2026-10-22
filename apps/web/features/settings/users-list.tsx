"use client"

import { useCallback, type FormEvent } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, ChevronRight, Search } from "lucide-react"
import { accountQuerySchema } from "@workspace/contracts/accounts"
import { getAccountsClient } from "@/lib/api/accounts-client"
import { useAccount } from "@/components/account-context"
import {
  accountName,
  Avatar,
  formatDate,
  Heading,
  Loading,
  Pagination,
  ResourceError,
  roleLabels,
  Status,
  useResource,
} from "./shared"

export function UsersList() {
  const params = useSearchParams()
  const router = useRouter()
  const { profile } = useAccount()
  const query = params.toString()
  const load = useCallback(() => {
    const values = new URLSearchParams(query)
    const parsed = accountQuerySchema.safeParse({
      search: values.get("search") ?? "",
      role: values.get("role") || undefined,
      status: values.get("status") || undefined,
      page: values.get("page") ?? 1,
    })
    return getAccountsClient().listUsers(
      parsed.success ? parsed.data : { search: "", page: 1 }
    )
  }, [query])
  const resource = useResource(load)
  function change(key: string, value: string) {
    const next = new URLSearchParams(query)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== "page") next.delete("page")
    router.replace(`/settings/users?${next}`)
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    change(
      "search",
      String(new FormData(event.currentTarget).get("search") ?? "")
    )
  }
  return (
    <>
      <Heading title="用户管理" description="管理账户准入与角色。">
        <Link className="settings-primary" href="/settings/invitations/new">
          <span>邀请用户</span>
          <span className="settings-button-arrow">
            <ArrowRight size={19} aria-hidden="true" />
          </span>
        </Link>
      </Heading>
      <div className="settings-filters">
        <form className="settings-search" onSubmit={search} role="search">
          <Search size={19} aria-hidden="true" />
          <input
            key={params.get("search")}
            name="search"
            defaultValue={params.get("search") ?? ""}
            placeholder="搜索昵称或邮箱"
            aria-label="搜索昵称或邮箱"
            maxLength={100}
          />
          <button type="submit">搜索</button>
        </form>
        <select
          aria-label="筛选角色"
          value={params.get("role") ?? ""}
          onChange={(event) => change("role", event.target.value)}
        >
          <option value="">全部角色</option>
          {Object.entries(roleLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="筛选状态"
          value={params.get("status") ?? ""}
          onChange={(event) => change("status", event.target.value)}
        >
          <option value="">全部状态</option>
          <option value="ACTIVE">启用</option>
          <option value="DISABLED">停用</option>
        </select>
      </div>
      {resource.error ? (
        <ResourceError message={resource.error} retry={resource.reload} />
      ) : !resource.data ? (
        <Loading />
      ) : (
        <div aria-busy={resource.loading} className="settings-list-region">
          <table className="settings-table">
            <caption className="sr-only">账户名单</caption>
            <thead>
              <tr>
                <th>用户</th>
                <th>角色</th>
                <th>状态</th>
                <th className="settings-date-column">加入时间</th>
                <th>
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {resource.data.users.map((user) => (
                <tr
                  key={user.id}
                  className={
                    user.id === profile.user.id
                      ? "settings-current-row"
                      : undefined
                  }
                >
                  <td>
                    <div className="settings-person">
                      <Avatar user={user} />
                      <div>
                        <Link
                          href={`/settings/users/${user.id}?return=${encodeURIComponent(query)}`}
                          className="settings-person-name"
                        >
                          {accountName(user)}
                        </Link>
                        <span className="settings-person-email">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>{roleLabels[user.role]}</td>
                  <td>
                    <Status status={user.status} />
                  </td>
                  <td className="settings-date-column">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="settings-row-action">
                    <Link
                      href={`/settings/users/${user.id}?return=${encodeURIComponent(query)}`}
                      aria-label={`查看 ${accountName(user)} 的详情`}
                    >
                      {user.id === profile.user.id ? "当前账户" : "查看详情"}
                      <ChevronRight size={16} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {resource.data.users.length === 0 && (
            <div className="settings-empty">
              <h3>没有找到匹配的用户</h3>
              <p>试试其他昵称或邮箱，或清除筛选条件。</p>
              <button
                className="settings-secondary"
                onClick={() => router.replace("/settings/users")}
              >
                清除筛选
              </button>
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
    </>
  )
}
