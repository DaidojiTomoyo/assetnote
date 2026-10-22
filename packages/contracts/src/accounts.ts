import { z } from "zod"
import { authRoleSchema } from "./auth"

export const accountStatusSchema = z.enum(["ACTIVE", "DISABLED"])
export const assignableRoleSchema = z.enum(["ADMIN", "USER"])
export const nicknameSchema = z
  .string()
  .trim()
  .min(1, "请填写昵称。")
  .max(40, "昵称最多 40 个字符。")
export const newPasswordSchema = z
  .string()
  .min(15, "新密码至少需要 15 个字符。")
  .max(128, "新密码最多 128 个字符。")
export const avatarInputSchema = z
  .string()
  .max(96_000, "头像过大，请选择较小的图片。")
  .regex(
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
    "请选择 PNG、JPEG 或 WebP 图片。"
  )
export const accountSchema = z.strictObject({
  id: z.uuid(),
  email: z.email(),
  nickname: z.string().nullable(),
  avatar: z.string().nullable(),
  role: authRoleSchema,
  status: accountStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  lastLoginAt: z.iso.datetime().nullable(),
  version: z.number().int().nonnegative(),
})
export const accountProfileSchema = z.strictObject({
  user: accountSchema,
  canManageUsers: z.boolean(),
  inviteRoles: z.array(assignableRoleSchema),
})
export const updateProfileSchema = z.strictObject({
  nickname: nicknameSchema,
  avatar: avatarInputSchema.nullable().optional(),
  version: z.number().int().nonnegative(),
})
export const changePasswordSchema = z
  .strictObject({
    currentPassword: z.string().min(1, "请填写当前密码。").max(1024),
    newPassword: newPasswordSchema,
  })
  .refine((input) => input.currentPassword !== input.newPassword, {
    message: "新密码不能与当前密码相同。",
    path: ["newPassword"],
  })
export const accountQuerySchema = z.strictObject({
  search: z.string().trim().max(100).default(""),
  role: authRoleSchema.optional(),
  status: accountStatusSchema.optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
})
export const accountListSchema = z.strictObject({
  users: z.array(accountSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int(),
  pageSize: z.number().int(),
})
export const accountDetailSchema = z.strictObject({
  user: accountSchema,
  capabilities: z.strictObject({
    canChangeStatus: z.boolean(),
    roleOptions: z.array(assignableRoleSchema),
  }),
})
export const changeAccessSchema = z
  .strictObject({
    role: assignableRoleSchema.optional(),
    status: accountStatusSchema.optional(),
    version: z.number().int().nonnegative(),
  })
  .refine((input) => input.role !== undefined || input.status !== undefined, {
    message: "请选择需要修改的角色或状态。",
  })
export const createInvitationSchema = z.strictObject({
  email: z.string().trim().toLowerCase().max(254).email("邮箱格式不正确。"),
  role: assignableRoleSchema,
})
export const invitationStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
])
export const invitationSchema = z.strictObject({
  id: z.uuid(),
  email: z.email(),
  role: assignableRoleSchema,
  status: invitationStatusSchema,
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  acceptedAt: z.iso.datetime().nullable(),
  canRevoke: z.boolean(),
  canReinvite: z.boolean(),
})
export const invitationQuerySchema = z.strictObject({
  status: invitationStatusSchema.optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
})
export const invitationListSchema = z.strictObject({
  invitations: z.array(invitationSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int(),
  pageSize: z.number().int(),
})
export const createdInvitationSchema = z.strictObject({
  invitation: invitationSchema,
  link: z.url(),
})
export const invitationTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "邀请链接无效，请联系管理员重新邀请。")
export const resolveInvitationSchema = z.strictObject({
  token: invitationTokenSchema,
})
export const invitationPreviewSchema = z.strictObject({
  email: z.email(),
  role: assignableRoleSchema,
  expiresAt: z.iso.datetime(),
})
export const acceptInvitationSchema = z.strictObject({
  token: invitationTokenSchema,
  nickname: nicknameSchema,
  password: newPasswordSchema,
})

export type Account = z.infer<typeof accountSchema>
export type AccountProfile = z.infer<typeof accountProfileSchema>
export type UpdateProfile = z.infer<typeof updateProfileSchema>
export type ChangePassword = z.infer<typeof changePasswordSchema>
export type AccountQuery = z.infer<typeof accountQuerySchema>
export type AccountList = z.infer<typeof accountListSchema>
export type AccountDetail = z.infer<typeof accountDetailSchema>
export type ChangeAccess = z.infer<typeof changeAccessSchema>
export type CreateInvitation = z.infer<typeof createInvitationSchema>
export type Invitation = z.infer<typeof invitationSchema>
export type InvitationQuery = z.infer<typeof invitationQuerySchema>
export type InvitationList = z.infer<typeof invitationListSchema>
export type CreatedInvitation = z.infer<typeof createdInvitationSchema>
export type InvitationPreview = z.infer<typeof invitationPreviewSchema>
export type AcceptInvitation = z.infer<typeof acceptInvitationSchema>
