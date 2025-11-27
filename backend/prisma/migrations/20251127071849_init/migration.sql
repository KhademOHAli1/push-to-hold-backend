-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('consumer', 'company_rep', 'admin');

-- CreateEnum
CREATE TYPE "DemocracyStatus" AS ENUM ('green', 'yellow', 'red');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('rep', 'legal', 'admin');

-- CreateEnum
CREATE TYPE "PledgeStatus" AS ENUM ('pending_review', 'approved', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('pledge', 'company_statement', 'news_article', 'court_decision', 'gov_report', 'association_membership', 'donation_record', 'other');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('pending', 'answered', 'dismissed');

-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('open', 'in_review', 'resolved', 'rejected');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'consumer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" UUID NOT NULL,
    "display_name" TEXT,
    "locale" TEXT DEFAULT 'de-DE',
    "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "official_name" TEXT NOT NULL,
    "display_name" TEXT,
    "country_code" CHAR(2) NOT NULL,
    "sector" TEXT,
    "size_bracket" TEXT,
    "website_url" TEXT,
    "hq_address" TEXT,
    "democracy_status" "DemocracyStatus" NOT NULL DEFAULT 'yellow',
    "democracy_score" INTEGER,
    "status_reason_short" TEXT,
    "last_review_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_external_ids" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "system" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,

    CONSTRAINT "company_external_ids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_memberships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'rep',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "company_id" UUID,
    "website_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "gtin" VARCHAR(14) NOT NULL,
    "name" TEXT,
    "brand_id" UUID,
    "category" TEXT,
    "source_system" TEXT,
    "source_product_id" TEXT,
    "image_url" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("gtin")
);

-- CreateTable
CREATE TABLE "product_company_overrides" (
    "gtin" VARCHAR(14) NOT NULL,
    "company_id" UUID NOT NULL,
    "reason" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_company_overrides_pkey" PRIMARY KEY ("gtin")
);

-- CreateTable
CREATE TABLE "pledges" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body_markdown" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pledges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_pledges" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "pledge_id" UUID NOT NULL,
    "status" "PledgeStatus" NOT NULL DEFAULT 'pending_review',
    "signed_at" TIMESTAMP(3) NOT NULL,
    "approved_at" TIMESTAMP(3),
    "signatory_name" TEXT,
    "signatory_role" TEXT,
    "pledge_doc_url" TEXT,
    "created_by_user_id" UUID,
    "reviewed_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_pledges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_evidence" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "source_url" TEXT,
    "source_name" TEXT,
    "source_date" DATE,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by_user_id" UUID,
    "impact" INTEGER,
    "notes_markdown" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "is_disputed" BOOLEAN NOT NULL DEFAULT false,
    "dispute_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_status_history" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "previous_status" "DemocracyStatus" NOT NULL,
    "new_status" "DemocracyStatus" NOT NULL,
    "reason_markdown" TEXT,
    "evidence_ids" UUID[],
    "changed_by_user_id" UUID NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_templates" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "question_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_questions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "template_id" UUID,
    "question_text" TEXT NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'pending',
    "answer_markdown" TEXT,
    "answered_by_user_id" UUID,
    "aggregated_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_question_events" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "company_id" UUID NOT NULL,
    "template_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_question_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_correction_requests" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "submitted_by_user_id" UUID NOT NULL,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'open',
    "subject" TEXT NOT NULL,
    "description_markdown" TEXT NOT NULL,
    "related_evidence_ids" UUID[],
    "related_status_change_id" UUID,
    "resolution_markdown" TEXT,
    "resolved_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "gtin" VARCHAR(14) NOT NULL,
    "company_id" UUID,
    "app_platform" TEXT,
    "country_code" CHAR(2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_follows" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "payload_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_claims" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "proof_type" TEXT NOT NULL,
    "proof_value" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "company_external_ids_system_external_id_key" ON "company_external_ids"("system", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_memberships_user_id_company_id_key" ON "company_memberships"("user_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_company_id_key" ON "brands"("name", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_templates_code_key" ON "question_templates"("code");

-- CreateIndex
CREATE INDEX "scans_company_id_created_at_idx" ON "scans"("company_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "company_follows_user_id_company_id_key" ON "company_follows"("user_id", "company_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_external_ids" ADD CONSTRAINT "company_external_ids_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_company_overrides" ADD CONSTRAINT "product_company_overrides_gtin_fkey" FOREIGN KEY ("gtin") REFERENCES "products"("gtin") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_company_overrides" ADD CONSTRAINT "product_company_overrides_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_company_overrides" ADD CONSTRAINT "product_company_overrides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_pledges" ADD CONSTRAINT "company_pledges_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_pledges" ADD CONSTRAINT "company_pledges_pledge_id_fkey" FOREIGN KEY ("pledge_id") REFERENCES "pledges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_pledges" ADD CONSTRAINT "company_pledges_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_pledges" ADD CONSTRAINT "company_pledges_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_evidence" ADD CONSTRAINT "company_evidence_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_evidence" ADD CONSTRAINT "company_evidence_added_by_user_id_fkey" FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_status_history" ADD CONSTRAINT "company_status_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_status_history" ADD CONSTRAINT "company_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_questions" ADD CONSTRAINT "company_questions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_questions" ADD CONSTRAINT "company_questions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "question_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_questions" ADD CONSTRAINT "company_questions_answered_by_user_id_fkey" FOREIGN KEY ("answered_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_question_events" ADD CONSTRAINT "user_question_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_question_events" ADD CONSTRAINT "user_question_events_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "question_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_correction_requests" ADD CONSTRAINT "company_correction_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_correction_requests" ADD CONSTRAINT "company_correction_requests_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_correction_requests" ADD CONSTRAINT "company_correction_requests_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_gtin_fkey" FOREIGN KEY ("gtin") REFERENCES "products"("gtin") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_follows" ADD CONSTRAINT "company_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_follows" ADD CONSTRAINT "company_follows_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
