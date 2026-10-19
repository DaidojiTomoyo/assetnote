import assert from "node:assert/strict"
import { test } from "node:test"

import { authSessionSchema, loginRequestSchema } from "../dist/auth.js"

test("trims email while preserving the exact password", () => {
  assert.deepEqual(
    loginRequestSchema.parse({
      email: "  User@example.com  ",
      password: "  exact password  ",
    }),
    { email: "User@example.com", password: "  exact password  " }
  )
})

test("rejects malformed input, role injection and excessive credentials", () => {
  for (const input of [
    null,
    { email: "invalid", password: "secret" },
    { email: "user@example.com", password: "" },
    { email: "user@example.com", password: "secret", role: "SUPER_ADMIN" },
    { email: "user@example.com", password: "x".repeat(1025) },
  ]) {
    assert.equal(loginRequestSchema.safeParse(input).success, false)
  }
})

test("rejects unknown roles, invalid expiry and leaked session secrets", () => {
  const session = {
    user: { id: "user-id", email: "user@example.com", role: "USER" },
    expiresAt: "2026-10-14T00:00:00.000Z",
  }
  assert.equal(authSessionSchema.safeParse(session).success, true)
  for (const input of [
    { ...session, expiresAt: "yesterday" },
    { ...session, user: { ...session.user, role: "OWNER" } },
    { ...session, rawSessionToken: "must-not-leak" },
  ]) {
    assert.equal(authSessionSchema.safeParse(input).success, false)
  }
})
