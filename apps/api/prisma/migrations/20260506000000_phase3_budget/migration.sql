-- CreateTable: fiscal_year_settings
CREATE TABLE "fiscal_year_settings" (
    "id" TEXT NOT NULL,
    "fiscal_year_start_month" INTEGER NOT NULL DEFAULT 1,
    "default_escalation_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.03,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fiscal_year_settings_pkey" PRIMARY KEY ("id")
);

-- AlterTable: hardware_assets
ALTER TABLE "hardware_assets" ADD COLUMN "annual_maintenance_cost" DECIMAL(12,2);
