-- Store only a digest of password-reset tokens and repair the schema/migration drift.
ALTER TYPE "PaymentProvider" ADD VALUE 'SEPAY';
ALTER TABLE "payments" ADD COLUMN "metadata" JSONB;
ALTER TABLE "user_verifications"
  ADD COLUMN "document_front_key" TEXT,
  ADD COLUMN "document_back_key" TEXT,
  ADD COLUMN "selfie_key" TEXT;

DROP INDEX IF EXISTS "User_password_reset_token_key";
ALTER TABLE "User" DROP COLUMN IF EXISTS "password_reset_token";
ALTER TABLE "User"
  ADD COLUMN "password_reset_token_hash" TEXT,
  ADD COLUMN "password_reset_expires_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_password_reset_token_hash_key"
  ON "User"("password_reset_token_hash");

-- Replace redundant single-column indexes with indexes matching application filters and ordering.
CREATE INDEX "User_status_created_at_idx" ON "User"("status", "created_at");

DROP INDEX "asset_availability_asset_id_idx";
DROP INDEX "asset_availability_start_at_end_at_idx";
CREATE INDEX "asset_avail_asset_type_start_end_idx"
  ON "asset_availability"("asset_id", "availability_type", "start_at", "end_at");

DROP INDEX "rental_requests_asset_id_idx";
DROP INDEX "rental_requests_owner_id_idx";
DROP INDEX "rental_requests_renter_id_idx";
DROP INDEX "rental_requests_status_idx";
DROP INDEX "rental_requests_start_at_end_at_idx";
CREATE INDEX "rental_requests_asset_id_status_start_at_end_at_idx"
  ON "rental_requests"("asset_id", "status", "start_at", "end_at");
CREATE INDEX "rental_requests_owner_id_status_created_at_idx"
  ON "rental_requests"("owner_id", "status", "created_at");
CREATE INDEX "rental_requests_renter_id_status_created_at_idx"
  ON "rental_requests"("renter_id", "status", "created_at");
CREATE INDEX "rental_requests_status_created_at_idx"
  ON "rental_requests"("status", "created_at");

CREATE INDEX "payments_status_created_at_idx"
  ON "payments"("status", "created_at");

DROP INDEX "refunds_status_idx";
CREATE INDEX "refunds_status_created_at_idx"
  ON "refunds"("status", "created_at");

DROP INDEX "payouts_owner_id_idx";
DROP INDEX "payouts_status_idx";
CREATE INDEX "payouts_owner_id_status_created_at_idx"
  ON "payouts"("owner_id", "status", "created_at");
CREATE INDEX "payouts_status_scheduled_at_idx"
  ON "payouts"("status", "scheduled_at");

DROP INDEX "disputes_opened_by_idx";
DROP INDEX "disputes_assigned_to_idx";
DROP INDEX "disputes_status_idx";
CREATE INDEX "disputes_opened_by_status_created_at_idx"
  ON "disputes"("opened_by", "status", "created_at");
CREATE INDEX "disputes_assigned_to_status_created_at_idx"
  ON "disputes"("assigned_to", "status", "created_at");
CREATE INDEX "disputes_status_created_at_idx"
  ON "disputes"("status", "created_at");

DROP INDEX "dispute_evidences_dispute_id_idx";

DROP INDEX "dispute_events_dispute_id_idx";
DROP INDEX "dispute_events_event_type_idx";
CREATE INDEX "dispute_events_dispute_id_created_at_idx"
  ON "dispute_events"("dispute_id", "created_at");

DROP INDEX "conversations_created_at_idx";
CREATE INDEX "conversations_updated_at_idx" ON "conversations"("updated_at");

DROP INDEX "reports_reporter_id_idx";
DROP INDEX "reports_assigned_to_idx";
DROP INDEX "reports_status_idx";
CREATE INDEX "reports_reporter_id_status_created_at_idx"
  ON "reports"("reporter_id", "status", "created_at");
CREATE INDEX "reports_assigned_to_status_created_at_idx"
  ON "reports"("assigned_to", "status", "created_at");
CREATE INDEX "reports_status_created_at_idx"
  ON "reports"("status", "created_at");

DROP INDEX "support_tickets_requester_id_idx";
DROP INDEX "support_tickets_assigned_to_idx";
DROP INDEX "support_tickets_status_idx";
DROP INDEX "support_tickets_priority_idx";
CREATE INDEX "support_tickets_requester_id_status_updated_at_idx"
  ON "support_tickets"("requester_id", "status", "updated_at");
CREATE INDEX "support_tickets_assigned_to_status_updated_at_idx"
  ON "support_tickets"("assigned_to", "status", "updated_at");
CREATE INDEX "support_tickets_status_priority_updated_at_idx"
  ON "support_tickets"("status", "priority", "updated_at");

DROP INDEX "support_ticket_events_ticket_id_idx";
DROP INDEX "support_ticket_events_event_type_idx";
CREATE INDEX "support_ticket_events_ticket_id_created_at_idx"
  ON "support_ticket_events"("ticket_id", "created_at");

DROP INDEX "prohibited_asset_rules_keyword_idx";

DROP INDEX "risk_incidents_target_type_target_id_idx";
DROP INDEX "risk_incidents_level_idx";
DROP INDEX "risk_incidents_status_idx";
CREATE INDEX "risk_incidents_target_type_target_id_status_idx"
  ON "risk_incidents"("target_type", "target_id", "status");
CREATE INDEX "risk_incidents_status_level_created_at_idx"
  ON "risk_incidents"("status", "level", "created_at");

DROP INDEX "request_logs_endpoint_created_at_idx";
CREATE INDEX "request_logs_created_at_idx" ON "request_logs"("created_at");

CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
