ALTER TABLE "User" ADD COLUMN "password_reset_code_hash" TEXT;

CREATE UNIQUE INDEX "User_password_reset_code_hash_key" ON "User"("password_reset_code_hash");
