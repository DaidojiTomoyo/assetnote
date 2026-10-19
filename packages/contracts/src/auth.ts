import { z } from "zod"

export const loginRequestSchema = z.strictObject({
  email: z
    .string({ error: "邮箱必须是字符串。" })
    .trim()
    .max(254, "邮箱长度不能超过 254 个字符。")
    .email("邮箱格式不正确。"),
  password: z
    .string({ error: "密码必须是字符串。" })
    .min(1, "密码不能为空。")
    .max(1024, "密码长度不能超过 1024 个字符。"),
})

export const authRoleSchema = z.enum(["SUPER_ADMIN", "ADMIN", "USER"])

export const authSessionSchema = z.strictObject({
  user: z.strictObject({
    id: z.string().min(1),
    email: z.string().email(),
    role: authRoleSchema,
  }),
  expiresAt: z.iso.datetime(),
})

export const apiErrorSchema = z.object({
  message: z.string().min(1),
})

export type LoginRequest = z.infer<typeof loginRequestSchema>
export type AuthRole = z.infer<typeof authRoleSchema>
export type AuthSession = z.infer<typeof authSessionSchema>
