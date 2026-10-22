import { apiErrorSchema } from "@workspace/contracts/auth"
import {
  acceptInvitationSchema,
  accountDetailSchema,
  accountListSchema,
  accountProfileSchema,
  accountQuerySchema,
  accountSchema,
  changeAccessSchema,
  changePasswordSchema,
  createInvitationSchema,
  createdInvitationSchema,
  invitationListSchema,
  invitationPreviewSchema,
  invitationQuerySchema,
  resolveInvitationSchema,
  updateProfileSchema,
  type AcceptInvitation,
  type AccountQuery,
  type ChangeAccess,
  type ChangePassword,
  type CreateInvitation,
  type InvitationQuery,
  type UpdateProfile,
} from "@workspace/contracts/accounts"
import { ApiError, parseApiOrigin } from "./auth-client.ts"

interface Schema<T> {
  safeParse(
    value: unknown
  ):
    | { success: true; data: T }
    | { success: false; error: { issues: readonly { message: string }[] } }
}
function validated<T>(schema: Schema<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success)
    throw new ApiError(
      result.error.issues[0]?.message ?? "请检查填写的内容。",
      400
    )
  return result.data
}
function queryString(input: object) {
  return new URLSearchParams(
    Object.entries(input)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)])
  ).toString()
}

export function createAccountsClient(
  origin: string,
  fetcher: typeof fetch = fetch
) {
  const base = `${parseApiOrigin(origin)}/api`
  async function request(path: string, method = "GET", body?: unknown) {
    let response: Response
    try {
      response = await fetcher(`${base}${path}`, {
        method,
        credentials: "include",
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
        ...(body !== undefined
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      })
    } catch {
      throw new ApiError("暂时无法连接服务，请检查网络后重试。")
    }
    if (!response.ok) {
      const result = apiErrorSchema.safeParse(
        await response.json().catch(() => null)
      )
      throw new ApiError(
        response.status >= 500
          ? "服务暂时不可用，请稍后重试。"
          : result.success
            ? result.data.message
            : "请求未完成，请稍后重试。",
        response.status
      )
    }
    return response
  }
  async function read<T>(
    response: Promise<Response>,
    schema: Schema<T>
  ): Promise<T> {
    const result = schema.safeParse(
      await (await response).json().catch(() => null)
    )
    if (!result.success)
      throw new ApiError("服务返回的数据不完整，请稍后重试。")
    return result.data
  }
  return {
    getProfile() {
      return read(request("/account/profile"), accountProfileSchema)
    },
    updateProfile(input: UpdateProfile) {
      return read(
        request(
          "/account/profile",
          "PATCH",
          validated(updateProfileSchema, input)
        ),
        accountSchema
      )
    },
    async changePassword(input: ChangePassword) {
      await request(
        "/account/password",
        "POST",
        validated(changePasswordSchema, input)
      )
    },
    listUsers(input: AccountQuery) {
      return read(
        request(`/users?${queryString(validated(accountQuerySchema, input))}`),
        accountListSchema
      )
    },
    getUser(id: string) {
      return read(
        request(`/users/${encodeURIComponent(id)}`),
        accountDetailSchema
      )
    },
    changeAccess(id: string, input: ChangeAccess) {
      return read(
        request(
          `/users/${encodeURIComponent(id)}/access`,
          "PATCH",
          validated(changeAccessSchema, input)
        ),
        accountDetailSchema
      )
    },
    listInvitations(input: InvitationQuery) {
      return read(
        request(
          `/invitations?${queryString(validated(invitationQuerySchema, input))}`
        ),
        invitationListSchema
      )
    },
    createInvitation(input: CreateInvitation) {
      return read(
        request(
          "/invitations",
          "POST",
          validated(createInvitationSchema, input)
        ),
        createdInvitationSchema
      )
    },
    reinvite(id: string) {
      return read(
        request(`/invitations/${encodeURIComponent(id)}/reinvite`, "POST"),
        createdInvitationSchema
      )
    },
    async revokeInvitation(id: string) {
      await request(`/invitations/${encodeURIComponent(id)}/revoke`, "POST")
    },
    resolveInvitation(token: string) {
      return read(
        request(
          "/invitations/resolve",
          "POST",
          validated(resolveInvitationSchema, { token })
        ),
        invitationPreviewSchema
      )
    },
    async acceptInvitation(input: AcceptInvitation) {
      await request(
        "/invitations/accept",
        "POST",
        validated(acceptInvitationSchema, input)
      )
    },
  }
}
export function getAccountsClient() {
  const origin = process.env.NEXT_PUBLIC_API_ORIGIN
  if (!origin && process.env.NODE_ENV === "production")
    throw new ApiError("账户服务尚未配置，请联系管理员。")
  return createAccountsClient(origin ?? "http://localhost:3001")
}
