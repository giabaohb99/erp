/*
  Warnings:

  - A unique constraint covering the columns `[employee_id,leave_type_id,year]` on the table `leave_balances` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `leave_type_id` to the `leave_balances` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "leave_balances_employee_id_year_key";

-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "logs" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "leave_balances" ADD COLUMN     "leave_type_id" TEXT NOT NULL,
ALTER COLUMN "totalDays" DROP DEFAULT,
ALTER COLUMN "remainingDays" DROP DEFAULT;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "leave_type_id" TEXT;

-- CreateTable
CREATE TABLE "leave_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "default_days" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_policies" (
    "id" TEXT NOT NULL,
    "leave_type_id" TEXT NOT NULL,
    "resetType" TEXT NOT NULL DEFAULT 'ANNUAL',
    "resetMonth" INTEGER NOT NULL DEFAULT 1,
    "allow_rollover" BOOLEAN NOT NULL DEFAULT false,
    "max_rollover_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "rollover_expiry_month" INTEGER NOT NULL DEFAULT 3,
    "auto_accrue" BOOLEAN NOT NULL DEFAULT false,
    "accrue_amount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_name_key" ON "leave_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_code_key" ON "leave_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "leave_policies_leave_type_id_key" ON "leave_policies"("leave_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_employee_id_leave_type_id_year_key" ON "leave_balances"("employee_id", "leave_type_id", "year");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
