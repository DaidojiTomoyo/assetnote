import assert from "node:assert/strict"
import { test } from "node:test"

import {
  ApiError,
  createAuthClient,
  parseApiOrigin,
} from "../lib/api/auth-client.ts"

const session = {
  user: { id: "user-id", email: "user@example.com", role: "USER" },
  expiresAt: "2026-10-14T00:00:00.000Z",
}

test("login sends exact credentials with cookies and validates the session", async () => {
  let requestCount = 0
  const client = createAuthClient(
    "http://localhost:3201",
    async (url, options) => {
      requestCount += 1
      assert.equal(url, "http://localhost:3201/api/auth/login")
      assert.equal(options.method, "POST")
      assert.equal(options.credentials, "include")
      assert.equal(options.cache, "no-store")
      assert.deepEqual(JSON.parse(options.body), {
        email: "user@example.com",
        password: "  secret  ",
      })
      return Response.json(session)
    }
  )
  assert.deepEqual(
    await client.login({ email: " user@example.com ", password: "  secret  " }),
    session
  )
  assert.equal(requestCount, 1)
})

test("expired sessions become unauthenticated; server failures do not", async () => {
  const unauthorized = createAuthClient("http://localhost:3201", async () =>
    Response.json({ message: "请先登录。" }, { status: 401 })
  )
  assert.equal(await unauthorized.getSession(), null)

  const unavailable = createAuthClient("http://localhost:3201", async () =>
    Response.json({ message: "internal details" }, { status: 500 })
  )
  await assert.rejects(unavailable.getSession(), {
    message: "服务暂时不可用，请稍后重试。",
  })
})

test("surfaces credential and rate-limit errors without a false success", async () => {
  for (const status of [401, 403, 429]) {
    const client = createAuthClient("http://localhost:3201", async () =>
      Response.json({ message: "请求被拒绝。" }, { status })
    )
    await assert.rejects(
      client.login({ email: "user@example.com", password: "secret" }),
      (error) => error instanceof ApiError && error.status === status
    )
  }
})

test("rejects malformed successful responses and normalizes network errors", async () => {
  const malformed = createAuthClient("http://localhost:3201", async () =>
    Response.json({ user: session.user })
  )
  await assert.rejects(malformed.getSession(), /数据不完整/)
  const offline = createAuthClient("http://localhost:3201", async () => {
    throw new TypeError("Failed to fetch")
  })
  await assert.rejects(offline.getSession(), /无法连接服务/)
})

test("logout sends a cookie-authenticated POST and accepts the empty response", async () => {
  const client = createAuthClient(
    "http://localhost:3201",
    async (url, options) => {
      assert.equal(url, "http://localhost:3201/api/auth/logout")
      assert.equal(options.method, "POST")
      assert.equal(options.credentials, "include")
      return new Response(null, { status: 204 })
    }
  )
  await client.logout()
})

test("API configuration refuses credentials, paths and non-HTTP protocols", () => {
  for (const origin of [
    "file:///tmp/example",
    "http://user:secret@localhost:3201",
    "http://localhost:3201/api",
    "http://localhost:3201/?token=secret",
  ]) {
    assert.throws(() => parseApiOrigin(origin))
  }
})
