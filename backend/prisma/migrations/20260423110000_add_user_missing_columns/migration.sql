-- Add columns to users that exist in current schema but not in init migration
ALTER TABLE "users" ADD COLUMN "username" TEXT;
ALTER TABLE "users" ADD COLUMN "position" TEXT;
ALTER TABLE "users" ADD COLUMN "company_id" TEXT;
ALTER TABLE "users" ADD COLUMN "last_login" DATETIME;

-- Create unique index for username
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
