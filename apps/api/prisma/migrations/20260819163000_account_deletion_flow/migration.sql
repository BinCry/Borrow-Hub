ALTER TABLE "User"
  ADD COLUMN "account_deletion_token_hash" TEXT,
  ADD COLUMN "account_deletion_expires_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_account_deletion_token_hash_key"
  ON "User"("account_deletion_token_hash");
