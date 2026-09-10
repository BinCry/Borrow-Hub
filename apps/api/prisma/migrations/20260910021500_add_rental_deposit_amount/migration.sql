ALTER TABLE "rental_requests"
ADD COLUMN IF NOT EXISTS "deposit_amount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "handovers"
ADD COLUMN IF NOT EXISTS "partner_id" TEXT;

CREATE INDEX IF NOT EXISTS "handovers_partner_id_idx" ON "handovers"("partner_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'handovers_partner_id_fkey'
  ) THEN
    ALTER TABLE "handovers"
    ADD CONSTRAINT "handovers_partner_id_fkey"
    FOREIGN KEY ("partner_id") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
