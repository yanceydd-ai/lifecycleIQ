-- Add retire and defer to RecommendedAction enum
ALTER TYPE "RecommendedAction" ADD VALUE IF NOT EXISTS 'retire';
ALTER TYPE "RecommendedAction" ADD VALUE IF NOT EXISTS 'defer';

-- AlterTable: hardware_assets
ALTER TABLE "hardware_assets" ADD COLUMN "recommended_action" TEXT;

-- AlterTable: contracts
ALTER TABLE "contracts" ADD COLUMN "recommended_action" TEXT;

-- CreateTable: decision_history
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
