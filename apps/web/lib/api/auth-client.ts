import {
  apiErrorSchema,
  authSessionSchema,
  loginRequestSchema,
  type LoginRequest,
} from "@workspace/contracts/auth"

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export function parseApiOrigin(value: string) {
  const url = new URL(value)
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("API 地址必须是不包含路径或凭据的 HTTP 来源地址。")
  }
  return url.origin
}

export function createAuthClient(
  origin: string,
  fetcher: typeof fetch = fetch
) {
  const baseUrl = parseApiOrigin(origin)

  async function request(
    path: string,
    method: "GET" | "POST",
    body?: LoginRequest
  ) {
    let response: Response
    try {
      response = await fetcher(`${baseUrl}/api/auth/${path}`, {
        method,
        credentials: "include",
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
        ...(body
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
      const payload: unknown = await response.json().catch(() => null)
      const error = apiErrorSchema.safeParse(payload)
      const message =
        response.status >= 500
          ? "服务暂时不可用，请稍后重试。"
          : error.success
            ? error.data.message
            : "请求未完成，请稍后重试。"
      throw new ApiError(message, response.status)
    }
    return response
  }

  async function readSession(response: Response) {
    const payload: unknown = await response.json().catch(() => null)
    const result = authSessionSchema.safeParse(payload)
    if (!result.success) {
      throw new ApiError("服务返回的数据不完整，请稍后重试。")
    }
    return result.data
  }

  return {
    async login(input: LoginRequest) {
      const body = loginRequestSchema.parse(input)
      return readSession(await request("login", "POST", body))
    },
    async getSession() {
      try {
        return await readSession(await request("me", "GET"))
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    async logout() {
      await request("logout", "POST")
    },
  }
}

export function getAuthClient() {
  const origin = process.env.NEXT_PUBLIC_API_ORIGIN
  if (!origin && process.env.NODE_ENV === "production") {
    throw new ApiError("登录服务尚未配置，请联系管理员。")
  }
  return createAuthClient(origin ?? "http://localhost:3001")
}

export function getAuthErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "操作未完成，请稍后重试。"
}
