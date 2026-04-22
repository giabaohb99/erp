-- CreateEnum
CREATE TYPE "ReviewCycle" AS ENUM ('MIDYEAR', 'ANNUAL', 'PROBATION', 'ADHOC');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'SELF_PENDING', 'SELF_DONE', 'MANAGER_PENDING', 'MANAGER_DONE', 'HR_REVIEWING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RatingScale" AS ENUM ('EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS_IMPROVEMENT', 'UNSATISFACTORY');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('CONTRACT', 'OFFICIAL_DOCUMENT', 'MEETING', 'RECRUITMENT');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'EMPLOYEE', 'TEXTAREA', 'CHECKBOX');

-- CreateEnum
CREATE TYPE "ImportType" AS ENUM ('EMPLOYEES', 'PAYROLL', 'ATTENDANCE', 'CONTRACTS');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('DRY_RUN', 'COMPLETED', 'ROLLED_BACK', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PAYROLL_MARK_PAID';
ALTER TYPE "AuditAction" ADD VALUE 'PAYSLIP_EMAIL_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'OFFBOARDING_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'REPORTS_BATCH_CLOSED';
ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_GENERATE';
ALTER TYPE "AuditAction" ADD VALUE 'DATA_IMPORT';
ALTER TYPE "AuditAction" ADD VALUE 'DATA_IMPORT_ROLLBACK';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW';

-- AlterEnum
ALTER TYPE "ReportType" ADD VALUE 'LEAVE_WEDDING';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "interview_scheduled_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "description" TEXT,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_generations" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "generated_by" TEXT NOT NULL,
    "fieldValues" JSONB NOT NULL DEFAULT '{}',
    "file_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_periods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cycle" "ReviewCycle" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_reviews" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "self_rating" "RatingScale",
    "self_strengths" TEXT,
    "self_weaknesses" TEXT,
    "self_goals" TEXT,
    "self_submitted_at" TIMESTAMP(3),
    "manager_rating" "RatingScale",
    "manager_strengths" TEXT,
    "manager_weaknesses" TEXT,
    "manager_goals" TEXT,
    "manager_submitted_at" TIMESTAMP(3),
    "competency_scores" JSONB,
    "final_rating" "RatingScale",
    "hr_notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "triggered_hr_event_id" TEXT,

    CONSTRAINT "employee_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_sessions" (
    "id" TEXT NOT NULL,
    "type" "ImportType" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'DRY_RUN',
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "success_rows" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "mapping" JSONB NOT NULL DEFAULT '{}',
    "errors" JSONB NOT NULL DEFAULT '[]',
    "imported_ids" JSONB NOT NULL DEFAULT '[]',
    "raw_data" JSONB,
    "metadata" JSONB DEFAULT '{}',
    "imported_by" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "rolled_back_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_reviews_period_id_employee_id_key" ON "employee_reviews"("period_id", "employee_id");

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_generations" ADD CONSTRAINT "document_generations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_generations" ADD CONSTRAINT "document_generations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_generations" ADD CONSTRAINT "document_generations_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_periods" ADD CONSTRAINT "review_periods_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_reviews" ADD CONSTRAINT "employee_reviews_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "review_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_reviews" ADD CONSTRAINT "employee_reviews_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_reviews" ADD CONSTRAINT "employee_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
