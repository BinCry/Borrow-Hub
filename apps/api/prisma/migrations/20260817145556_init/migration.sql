-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED', 'REQUIRES_REVIEW');

-- CreateEnum
CREATE TYPE "FaceMatchStatus" AS ENUM ('NOT_AVAILABLE', 'MATCHED', 'NOT_MATCHED', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('USER', 'MODERATOR', 'CUSTOMER_SUPPORT', 'DISPUTE_OFFICER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'WORN');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'REJECTED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('AVAILABLE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('PENDING_OWNER', 'APPROVED', 'AWAITING_PAYMENT', 'AWAITING_SIGNATURE', 'CONFIRMED', 'READY_FOR_HANDOVER', 'ONGOING', 'RETURN_PENDING', 'COMPLETED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'DISPUTED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'CANCELLED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "SignatureMethod" AS ENUM ('OTP', 'IN_APP', 'PIN', 'ELECTRONIC_PROVIDER');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('SANDBOX', 'BANK_TRANSFER', 'QR', 'E_WALLET');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'SCHEDULED', 'PAID', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HandoverType" AS ENUM ('DELIVERY', 'RETURN');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ISSUE_REPORTED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('PHOTO', 'VIDEO', 'DOCUMENT', 'REPAIR_QUOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('USER', 'ASSET', 'REVIEW', 'CHAT_MESSAGE');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "SupportTicketEventType" AS ENUM ('CREATED', 'NOTE', 'ASSIGNED', 'STATUS_CHANGED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RiskTargetType" AS ENUM ('USER', 'ASSET', 'RENTAL', 'MESSAGE');

-- CreateEnum
CREATE TYPE "RiskIncidentStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'WAITING_RESPONSE', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DisputeEventType" AS ENUM ('OPENED', 'RESPONSE_ADDED', 'EVIDENCE_ATTACHED', 'ASSIGNED', 'STATUS_CHANGED', 'RESOLVED', 'NOTE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('RENTAL_REQUEST_CREATED', 'RENTAL_REQUEST_APPROVED', 'RENTAL_REQUEST_DECLINED', 'PAYMENT_SUCCESS', 'CONTRACT_READY', 'SIGNATURE_REQUIRED', 'CONTRACT_SIGNED', 'RENTAL_CONFIRMED', 'HANDOVER_READY', 'HANDOVER_COMPLETED', 'RETURN_REQUESTED', 'RETURN_COMPLETED', 'REVIEW_REMINDER', 'RENTAL_TOMORROW', 'RETURN_REMINDER', 'RENTAL_OVERDUE', 'AVAILABILITY_MATCH', 'PAYOUT_COMPLETED', 'ASSET_MODERATED', 'KYC_UPDATED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('USER_REGISTERED', 'KYC_STARTED', 'KYC_COMPLETED', 'SEARCH_PERFORMED', 'LISTING_VIEWED', 'RENTAL_REQUEST_CREATED', 'RENTAL_APPROVED', 'PAYMENT_COMPLETED', 'CONTRACT_SIGNED', 'HANDOVER_COMPLETED', 'RETURN_COMPLETED', 'REVIEW_CREATED', 'DISPUTE_OPENED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "refresh_token_hash" TEXT,
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "email_verified_at" TIMESTAMP(3),
    "phone_verified_at" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "trust_score" INTEGER NOT NULL DEFAULT 0,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "ward" TEXT,
    "address_line" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_verifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_reference" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "document_type" TEXT,
    "masked_document_number" TEXT,
    "name_verified" BOOLEAN NOT NULL DEFAULT false,
    "date_of_birth_verified" BOOLEAN NOT NULL DEFAULT false,
    "face_match_status" "FaceMatchStatus" NOT NULL DEFAULT 'NOT_AVAILABLE',
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,
    "description" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "condition" "AssetCondition" NOT NULL,
    "estimated_value" INTEGER NOT NULL,
    "price_per_day" INTEGER NOT NULL,
    "minimum_duration_days" INTEGER NOT NULL,
    "maximum_duration_days" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "ward" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "meeting_point" TEXT,
    "delivery_options" JSONB,
    "usage_instructions" TEXT,
    "cancellation_policy" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_assets" (
    "user_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_assets_pkey" PRIMARY KEY ("user_id","asset_id")
);

-- CreateTable
CREATE TABLE "asset_images" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_key" TEXT,
    "metadata" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_accessories" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_accessories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_availability" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "availability_type" "AvailabilityType" NOT NULL DEFAULT 'BLOCKED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_requests" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "renter_id" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "delivery_method" TEXT,
    "message" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "rental_fee" INTEGER NOT NULL,
    "service_fee" INTEGER NOT NULL,
    "delivery_fee" INTEGER NOT NULL DEFAULT 0,
    "late_fee" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL,
    "status" "RentalStatus" NOT NULL DEFAULT 'PENDING_OWNER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_contracts" (
    "id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "contract_number" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content_url" TEXT,
    "content_hash" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'PENDING_SIGNATURE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activated_at" TIMESTAMP(3),

    CONSTRAINT "rental_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_signatures" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "signature_method" "SignatureMethod" NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "device_info" TEXT,
    "signature_reference" TEXT,

    CONSTRAINT "contract_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "payer_id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "provider_transaction_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'COMPLETED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "gross_amount" INTEGER NOT NULL,
    "commission_amount" INTEGER NOT NULL,
    "net_amount" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handovers" (
    "id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "type" "HandoverType" NOT NULL,
    "status" "HandoverStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handover_qr_sessions" (
    "id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "handover_id" TEXT NOT NULL,
    "generated_by" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handover_qr_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handover_items" (
    "id" TEXT NOT NULL,
    "handover_id" TEXT NOT NULL,
    "accessory_name" TEXT NOT NULL,
    "expected_quantity" INTEGER NOT NULL DEFAULT 1,
    "actual_quantity" INTEGER NOT NULL DEFAULT 1,
    "condition" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handover_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidences" (
    "id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "handover_id" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_key" TEXT,
    "metadata" JSONB,
    "file_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "opened_by" TEXT NOT NULL,
    "assigned_to" TEXT,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_evidences" (
    "id" TEXT NOT NULL,
    "dispute_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "evidence_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_events" (
    "id" TEXT NOT NULL,
    "dispute_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "event_type" "DisputeEventType" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "reviewee_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_members" (
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("conversation_id","user_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "attachment_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "target_type" "ReportTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "assigned_to" TEXT,
    "resolution_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "assigned_to" TEXT,
    "rental_id" TEXT,
    "dispute_id" TEXT,
    "report_id" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_events" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "event_type" "SupportTicketEventType" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prohibited_asset_rules" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "category_hint" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prohibited_asset_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_incidents" (
    "id" TEXT NOT NULL,
    "target_type" "RiskTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RiskIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "resolution_summary" TEXT,
    "metadata" JSONB,
    "created_by" TEXT,
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "risk_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "event_type" "AnalyticsEventType" NOT NULL,
    "user_id" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_logs" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "user_id" TEXT,
    "method" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "before_data" JSONB,
    "after_data" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "user_addresses_user_id_idx" ON "user_addresses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_verifications_user_id_key" ON "user_verifications"("user_id");

-- CreateIndex
CREATE INDEX "user_verifications_verification_status_idx" ON "user_verifications"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "assets_category_id_idx" ON "assets"("category_id");

-- CreateIndex
CREATE INDEX "assets_owner_id_idx" ON "assets"("owner_id");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_city_district_idx" ON "assets"("city", "district");

-- CreateIndex
CREATE INDEX "favorite_assets_asset_id_idx" ON "favorite_assets"("asset_id");

-- CreateIndex
CREATE INDEX "asset_images_asset_id_idx" ON "asset_images"("asset_id");

-- CreateIndex
CREATE INDEX "asset_accessories_asset_id_idx" ON "asset_accessories"("asset_id");

-- CreateIndex
CREATE INDEX "asset_availability_asset_id_idx" ON "asset_availability"("asset_id");

-- CreateIndex
CREATE INDEX "asset_availability_start_at_end_at_idx" ON "asset_availability"("start_at", "end_at");

-- CreateIndex
CREATE INDEX "rental_requests_asset_id_idx" ON "rental_requests"("asset_id");

-- CreateIndex
CREATE INDEX "rental_requests_owner_id_idx" ON "rental_requests"("owner_id");

-- CreateIndex
CREATE INDEX "rental_requests_renter_id_idx" ON "rental_requests"("renter_id");

-- CreateIndex
CREATE INDEX "rental_requests_status_idx" ON "rental_requests"("status");

-- CreateIndex
CREATE INDEX "rental_requests_start_at_end_at_idx" ON "rental_requests"("start_at", "end_at");

-- CreateIndex
CREATE UNIQUE INDEX "rental_contracts_rental_id_key" ON "rental_contracts"("rental_id");

-- CreateIndex
CREATE UNIQUE INDEX "rental_contracts_contract_number_key" ON "rental_contracts"("contract_number");

-- CreateIndex
CREATE INDEX "contract_signatures_user_id_idx" ON "contract_signatures"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_signatures_contract_id_user_id_key" ON "contract_signatures"("contract_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_transaction_id_key" ON "payments"("provider_transaction_id");

-- CreateIndex
CREATE INDEX "payments_rental_id_idx" ON "payments"("rental_id");

-- CreateIndex
CREATE INDEX "payments_payer_id_idx" ON "payments"("payer_id");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_rental_id_key" ON "payouts"("rental_id");

-- CreateIndex
CREATE INDEX "payouts_owner_id_idx" ON "payouts"("owner_id");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE INDEX "handovers_rental_id_idx" ON "handovers"("rental_id");

-- CreateIndex
CREATE UNIQUE INDEX "handover_qr_sessions_token_key" ON "handover_qr_sessions"("token");

-- CreateIndex
CREATE INDEX "handover_qr_sessions_rental_id_idx" ON "handover_qr_sessions"("rental_id");

-- CreateIndex
CREATE INDEX "handover_qr_sessions_handover_id_idx" ON "handover_qr_sessions"("handover_id");

-- CreateIndex
CREATE INDEX "handover_qr_sessions_generated_by_idx" ON "handover_qr_sessions"("generated_by");

-- CreateIndex
CREATE INDEX "handover_qr_sessions_expires_at_used_at_idx" ON "handover_qr_sessions"("expires_at", "used_at");

-- CreateIndex
CREATE INDEX "handover_items_handover_id_idx" ON "handover_items"("handover_id");

-- CreateIndex
CREATE INDEX "evidences_rental_id_idx" ON "evidences"("rental_id");

-- CreateIndex
CREATE INDEX "evidences_handover_id_idx" ON "evidences"("handover_id");

-- CreateIndex
CREATE INDEX "evidences_uploaded_by_idx" ON "evidences"("uploaded_by");

-- CreateIndex
CREATE INDEX "disputes_rental_id_idx" ON "disputes"("rental_id");

-- CreateIndex
CREATE INDEX "disputes_opened_by_idx" ON "disputes"("opened_by");

-- CreateIndex
CREATE INDEX "disputes_assigned_to_idx" ON "disputes"("assigned_to");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- CreateIndex
CREATE INDEX "dispute_evidences_dispute_id_idx" ON "dispute_evidences"("dispute_id");

-- CreateIndex
CREATE INDEX "dispute_evidences_uploaded_by_idx" ON "dispute_evidences"("uploaded_by");

-- CreateIndex
CREATE INDEX "dispute_evidences_evidence_id_idx" ON "dispute_evidences"("evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "dispute_evidences_dispute_id_evidence_id_key" ON "dispute_evidences"("dispute_id", "evidence_id");

-- CreateIndex
CREATE INDEX "dispute_events_dispute_id_idx" ON "dispute_events"("dispute_id");

-- CreateIndex
CREATE INDEX "dispute_events_actor_id_idx" ON "dispute_events"("actor_id");

-- CreateIndex
CREATE INDEX "dispute_events_event_type_idx" ON "dispute_events"("event_type");

-- CreateIndex
CREATE INDEX "reviews_reviewee_id_idx" ON "reviews"("reviewee_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_rental_id_reviewer_id_key" ON "reviews"("rental_id", "reviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_rental_id_key" ON "conversations"("rental_id");

-- CreateIndex
CREATE INDEX "conversations_created_at_idx" ON "conversations"("created_at");

-- CreateIndex
CREATE INDEX "conversation_members_user_id_idx" ON "conversation_members"("user_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "reports_reporter_id_idx" ON "reports"("reporter_id");

-- CreateIndex
CREATE INDEX "reports_assigned_to_idx" ON "reports"("assigned_to");

-- CreateIndex
CREATE INDEX "reports_target_type_target_id_idx" ON "reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "support_tickets_requester_id_idx" ON "support_tickets"("requester_id");

-- CreateIndex
CREATE INDEX "support_tickets_assigned_to_idx" ON "support_tickets"("assigned_to");

-- CreateIndex
CREATE INDEX "support_tickets_rental_id_idx" ON "support_tickets"("rental_id");

-- CreateIndex
CREATE INDEX "support_tickets_dispute_id_idx" ON "support_tickets"("dispute_id");

-- CreateIndex
CREATE INDEX "support_tickets_report_id_idx" ON "support_tickets"("report_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets"("priority");

-- CreateIndex
CREATE INDEX "support_ticket_events_ticket_id_idx" ON "support_ticket_events"("ticket_id");

-- CreateIndex
CREATE INDEX "support_ticket_events_actor_id_idx" ON "support_ticket_events"("actor_id");

-- CreateIndex
CREATE INDEX "support_ticket_events_event_type_idx" ON "support_ticket_events"("event_type");

-- CreateIndex
CREATE INDEX "prohibited_asset_rules_is_active_idx" ON "prohibited_asset_rules"("is_active");

-- CreateIndex
CREATE INDEX "prohibited_asset_rules_keyword_idx" ON "prohibited_asset_rules"("keyword");

-- CreateIndex
CREATE INDEX "risk_incidents_target_type_target_id_idx" ON "risk_incidents"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "risk_incidents_level_idx" ON "risk_incidents"("level");

-- CreateIndex
CREATE INDEX "risk_incidents_status_idx" ON "risk_incidents"("status");

-- CreateIndex
CREATE INDEX "risk_incidents_created_by_idx" ON "risk_incidents"("created_by");

-- CreateIndex
CREATE INDEX "risk_incidents_resolved_by_idx" ON "risk_incidents"("resolved_by");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "analytics_events_event_type_created_at_idx" ON "analytics_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_user_id_created_at_idx" ON "analytics_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_entity_type_entity_id_idx" ON "analytics_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "request_logs_request_id_idx" ON "request_logs"("request_id");

-- CreateIndex
CREATE INDEX "request_logs_user_id_created_at_idx" ON "request_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "request_logs_status_code_created_at_idx" ON "request_logs"("status_code", "created_at");

-- CreateIndex
CREATE INDEX "request_logs_endpoint_created_at_idx" ON "request_logs"("endpoint", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_verifications" ADD CONSTRAINT "user_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_assets" ADD CONSTRAINT "favorite_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_assets" ADD CONSTRAINT "favorite_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_images" ADD CONSTRAINT "asset_images_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_accessories" ADD CONSTRAINT "asset_accessories_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_availability" ADD CONSTRAINT "asset_availability_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_contracts" ADD CONSTRAINT "rental_contracts_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rental_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_signatures" ADD CONSTRAINT "contract_signatures_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "rental_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_signatures" ADD CONSTRAINT "contract_signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rental_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rental_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rental_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_qr_sessions" ADD CONSTRAINT "handover_qr_sessions_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rental_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_qr_sessions" ADD CONSTRAINT "handover_qr_sessions_handover_id_fkey" FOREIGN KEY ("handover_id") REFERENCES "handovers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_qr_sessions" ADD CONSTRAINT "handover_qr_sessions_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_items" ADD CONSTRAINT "handover_items_handover_id_fkey" FOREIGN KEY ("handover_id") REFERENCES "handovers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rental_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_handover_id_fkey" FOREIGN KEY ("handover_id") REFERENCES "handovers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rental_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidences" ADD CONSTRAINT "dispute_evidences_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidences" ADD CONSTRAINT "dispute_evidences_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidences" ADD CONSTRAINT "dispute_evidences_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_events" ADD CONSTRAINT "dispute_events_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_events" ADD CONSTRAINT "dispute_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rental_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rental_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rental_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_events" ADD CONSTRAINT "support_ticket_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_events" ADD CONSTRAINT "support_ticket_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prohibited_asset_rules" ADD CONSTRAINT "prohibited_asset_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_incidents" ADD CONSTRAINT "risk_incidents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_incidents" ADD CONSTRAINT "risk_incidents_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
