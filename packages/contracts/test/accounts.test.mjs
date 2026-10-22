import assert from "node:assert/strict"
import { test } from "node:test"
import {
  acceptInvitationSchema,
  changeAccessSchema,
  changePasswordSchema,
  createInvitationSchema,
  updateProfileSchema,
  accountQuerySchema,
} from "../dist/accounts.js"

test("profile changes reject identity and authorization fields", () => {
  assert.deepEqual(
    updateProfileSchema.parse({ nickname: "  林然  ", version: 1 }),
    { nickname: "林然", version: 1 }
  )
  for (const key of ["email", "role", "id", "status"])
    assert.equal(
      updateProfileSchema.safeParse({
        nickname: "林然",
        version: 1,
        [key]: "injected",
      }).success,
      false
    )
  assert.equal(
    updateProfileSchema.safeParse({ nickname: "", version: 0 }).success,
    false
  )
  assert.equal(
    updateProfileSchema.safeParse({
      nickname: "A",
      version: 0,
      avatar: "https://tracking.example/avatar.svg",
    }).success,
    false
  )
})
test("invitations never create super administrators; access changes require a version", () => {
  assert.deepEqual(
    createInvitationSchema.parse({ email: " USER@Example.COM ", role: "USER" }),
    { email: "user@example.com", role: "USER" }
  )
  assert.equal(
    createInvitationSchema.safeParse({
      email: "a@example.com",
      role: "SUPER_ADMIN",
    }).success,
    false
  )
  assert.equal(
    changeAccessSchema.safeParse({ status: "DISABLED" }).success,
    false
  )
  assert.equal(changeAccessSchema.safeParse({ version: 0 }).success, false)
  assert.equal(accountQuerySchema.safeParse({ page: 501 }).success, false)
})
test("new passwords preserve exact whitespace and must meet the agreed length", () => {
  const exact = "  a long passphrase  "
  assert.equal(
    changePasswordSchema.parse({
      currentPassword: "previous",
      newPassword: exact,
    }).newPassword,
    exact
  )
  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: "old",
      newPassword: "short",
    }).success,
    false
  )
  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: exact,
      newPassword: exact,
    }).success,
    false
  )
  assert.equal(
    acceptInvitationSchema.safeParse({
      token: "a".repeat(43),
      nickname: "新用户",
      password: exact,
    }).success,
    true
  )
  assert.equal(
    acceptInvitationSchema.safeParse({
      token: "bad",
      nickname: "新用户",
      password: exact,
    }).success,
    false
  )
})
