ALTER TABLE "conversations" ALTER COLUMN "rental_id" DROP NOT NULL;
ALTER TABLE "conversations" ADD COLUMN "direct_key" TEXT;
CREATE UNIQUE INDEX "conversations_direct_key_key" ON "conversations"("direct_key");
