import assert from "node:assert/strict"
import { test } from "node:test"
import { createAccountsClient } from "../lib/api/accounts-client.ts"

test("profile writes are cookie-authenticated, exact, and reject malformed success", async () => {
  const client = createAccountsClient(
    "http://localhost:3001",
    async (url, options) => {
      assert.equal(url, "http://localhost:3001/api/account/profile")
      assert.equal(options.method, "PATCH")
      assert.equal(options.credentials, "include")
      assert.equal(options.cache, "no-store")
      assert.deepEqual(JSON.parse(options.body), {
        nickname: "林然",
        avatar: null,
        version: 3,
      })
      return Response.json({ id: "not-a-profile" })
    }
  )
  await assert.rejects(
    client.updateProfile({ nickname: " 林然 ", avatar: null, version: 3 }),
    /数据不完整/
  )
})
test("authorization, stale version and rate-limit responses cannot become false successes", async () => {
  for (const status of [401, 403, 409, 429]) {
    const client = createAccountsClient("http://localhost:3001", async () =>
      Response.json({ message: "请刷新后重试。" }, { status })
    )
    await assert.rejects(
      client.changeAccess("user", { status: "DISABLED", version: 1 }),
      (error) => error.status === status
    )
  }
})
test("invitation tokens travel in a JSON body rather than a URL", async () => {
  const token = "a".repeat(43)
  const client = createAccountsClient(
    "http://localhost:3001",
    async (url, options) => {
      assert.equal(url, "http://localhost:3001/api/invitations/accept")
      assert.equal(JSON.parse(options.body).token, token)
      assert.equal(options.method, "POST")
      return new Response(null, { status: 204 })
    }
  )
  await client.acceptInvitation({
    token,
    nickname: "陈安",
    password: "  exact password  ",
  })
})
test("invalid password and invitation payloads never reach fetch", async () => {
  const client = createAccountsClient("http://localhost:3001", async () => {
    assert.fail("must not send invalid input")
  })
  await assert.rejects(
    client.changePassword({ currentPassword: "old", newPassword: "short" }),
    /15/
  )
  assert.throws(() =>
    client.createInvitation({ email: "a@example.com", role: "SUPER_ADMIN" })
  )
})

test("malformed invitation links are rejected before a network request", async () => {
  const client = createAccountsClient("http://localhost:3001", async () => {
    assert.fail("must not send a malformed invitation token")
  })
  for (const token of [
    "short",
    "a".repeat(42),
    "a".repeat(44),
    "!".repeat(43),
  ]) {
    await assert.rejects(
      Promise.resolve().then(() => client.resolveInvitation(token)),
      (error) => error.status === 400
    )
  }
})
