-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'editor', 'finance_viewer', 'department_viewer', 'viewer');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('laptop', 'desktop', 'tablet', 'server', 'storage', 'network_switch', 'wireless_access_point', 'firewall', 'ups', 'printer', 'mfp_copier', 'classroom_display', 'projector', 'av_equipment', 'phone', 'camera', 'iot_device', 'other');

-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('planned', 'ordered', 'active', 'spare', 'in_repair', 'due_for_replacement', 'deferred', 'retired', 'disposed');

-- CreateEnum
CREATE TYPE "Criticality" AS ENUM ('low', 'medium', 'high', 'mission_critical');

-- CreateEnum
CREATE TYPE "FundingType" AS ENUM ('opex', 'capex');

-- CreateEnum
CREATE TYPE "LicenseModel" AS ENUM ('per_user', 'per_device', 'site_license', 'fte_based', 'concurrent_user', 'consumption_based', 'flat_annual', 'multi_year_agreement', 'other');

-- CreateEnum
CREATE TYPE "SoftwareStatus" AS ENUM ('active', 'trial', 'under_review', 'renewal_pending', 'sunset_planned', 'replaced', 'terminated');

-- CreateEnum
CREATE TYPE "RecommendedAction" AS ENUM ('renew_as_is', 'renew_with_reduction', 'expand', 'renegotiate', 'replace', 'retire', 'defer', 'consolidate', 'terminate', 'monitor', 'escalate');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('software_subscription', 'saas_agreement', 'hardware_support', 'maintenance_agreement', 'managed_service', 'telecom', 'internet_circuit', 'cloud_service', 'professional_service', 'warranty', 'other');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('not_reviewed', 'review_required', 'pending_quote', 'pending_approval', 'approved', 'rejected', 'deferred', 'cancelled');

-- CreateEnum
CREATE TYPE "ScenarioType" AS ENUM ('conservative', 'expected', 'aggressive', 'custom');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'viewer',
    "department_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "budget_code" TEXT,
    "owner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "building" TEXT,
    "room" TEXT,
    "location_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "account_rep_name" TEXT,
    "account_rep_email" TEXT,
    "support_email" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hardware_assets" (
    "id" TEXT NOT NULL,
    "asset_tag" TEXT,
    "asset_type" "AssetType" NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serial_number" TEXT,
    "purchase_date" TIMESTAMP(3),
    "purchase_cost" DECIMAL(12,2),
    "replacement_cost" DECIMAL(12,2),
    "annual_maintenance_cost" DECIMAL(12,2),
    "recommended_action" "RecommendedAction",
    "useful_life_years" INTEGER,
    "replacement_year_override" INTEGER,
    "warranty_end_date" TIMESTAMP(3),
    "support_end_date" TIMESTAMP(3),
    "lifecycle_status" "LifecycleStatus" NOT NULL DEFAULT 'active',
    "criticality" "Criticality" NOT NULL DEFAULT 'medium',
    "funding_type" "FundingType" NOT NULL DEFAULT 'capex',
    "location_id" TEXT,
    "department_id" TEXT,
    "vendor_id" TEXT,
    "assigned_user_id" TEXT,
    "business_owner" TEXT,
    "technical_owner" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hardware_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor_id" TEXT,
    "category" TEXT,
    "description" TEXT,
    "license_model" "LicenseModel",
    "qty_purchased" INTEGER,
    "qty_assigned" INTEGER,
    "qty_actively_used" INTEGER,
    "unit_cost" DECIMAL(12,2),
    "annual_cost" DECIMAL(12,2),
    "billing_frequency" TEXT,
    "contract_start_date" TIMESTAMP(3),
    "contract_end_date" TIMESTAMP(3),
    "renewal_date" TIMESTAMP(3),
    "notice_period_days" INTEGER,
    "auto_renewal" BOOLEAN NOT NULL DEFAULT false,
    "status" "SoftwareStatus" NOT NULL DEFAULT 'active',
    "recommended_action" "RecommendedAction",
    "funding_type" "FundingType" NOT NULL DEFAULT 'opex',
    "department_id" TEXT,
    "business_owner" TEXT,
    "technical_owner" TEXT,
    "budget_owner" TEXT,
    "strategic_value" TEXT,
    "risk_if_not_renewed" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "software_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor_id" TEXT,
    "contract_type" "ContractType" NOT NULL,
    "hardware_asset_id" TEXT,
    "software_product_id" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "renewal_date" TIMESTAMP(3),
    "notice_period_days" INTEGER,
    "cancellation_deadline_override" TIMESTAMP(3),
    "auto_renewal" BOOLEAN NOT NULL DEFAULT false,
    "annual_cost" DECIMAL(12,2),
    "renewal_cost" DECIMAL(12,2),
    "escalation_pct" DECIMAL(5,2),
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'not_reviewed',
    "document_link" TEXT,
    "department_id" TEXT,
    "business_owner" TEXT,
    "technical_owner" TEXT,
    "budget_owner" TEXT,
    "notes" TEXT,
    "recommended_action" "RecommendedAction",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_year_settings" (
    "id" TEXT NOT NULL,
    "fiscal_year_start_month" INTEGER NOT NULL DEFAULT 1,
    "default_escalation_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.03,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_year_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_history" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "previous_action" TEXT,
    "new_action" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenarios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ScenarioType" NOT NULL,
    "escalation_rate" DECIMAL(5,4) NOT NULL,
    "is_recommended" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_overrides" (
    "id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "override_type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenario_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_log" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "alert_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "hardware_assets_asset_tag_key" ON "hardware_assets"("asset_tag");

-- CreateIndex
CREATE UNIQUE INDEX "scenario_overrides_scenario_id_entity_type_entity_id_overri_key" ON "scenario_overrides"("scenario_id", "entity_type", "entity_id", "override_type");

-- CreateIndex
CREATE UNIQUE INDEX "notification_log_entity_type_entity_id_alert_type_severity_key" ON "notification_log"("entity_type", "entity_id", "alert_type", "severity");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hardware_assets" ADD CONSTRAINT "hardware_assets_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hardware_assets" ADD CONSTRAINT "hardware_assets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hardware_assets" ADD CONSTRAINT "hardware_assets_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hardware_assets" ADD CONSTRAINT "hardware_assets_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_products" ADD CONSTRAINT "software_products_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_products" ADD CONSTRAINT "software_products_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_hardware_asset_id_fkey" FOREIGN KEY ("hardware_asset_id") REFERENCES "hardware_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_software_product_id_fkey" FOREIGN KEY ("software_product_id") REFERENCES "software_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_overrides" ADD CONSTRAINT "scenario_overrides_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

