ALTER TABLE "users"
  ADD COLUMN "nickname" VARCHAR(40),
  ADD COLUMN "avatar" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "user_invitations" (
  "id" UUID NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "role" "user_role" NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "inviter_id" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "accepted_at" TIMESTAMPTZ(3),
  "revoked_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "user_invitations_role_check" CHECK ("role" IN ('ADMIN', 'USER'))
);
CREATE UNIQUE INDEX "user_invitations_token_hash_key" ON "user_invitations"("token_hash");
CREATE INDEX "user_invitations_email_idx" ON "user_invitations"("email");
CREATE INDEX "user_invitations_created_at_id_idx" ON "user_invitations"("created_at", "id");
