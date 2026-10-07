CREATE UNIQUE INDEX "disputes_one_active_per_rental_idx"
ON "disputes" ("rental_id")
WHERE "status" IN ('OPEN', 'WAITING_RESPONSE', 'UNDER_REVIEW');
