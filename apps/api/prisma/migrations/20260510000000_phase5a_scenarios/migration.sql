-- CreateEnum: ScenarioType
CREATE TYPE "ScenarioType" AS ENUM ('conservative', 'expected', 'aggressive', 'custom');

-- CreateTable: scenarios
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

-- CreateTable: scenario_overrides
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

-- CreateIndex: unique override per entity per scenario
CREATE UNIQUE INDEX "scenario_overrides_scenario_id_entity_type_entity_id_override_type_key"
    ON "scenario_overrides"("scenario_id", "entity_type", "entity_id", "override_type");

-- AddForeignKey: scenario_overrides -> scenarios (cascade delete)
ALTER TABLE "scenario_overrides" ADD CONSTRAINT "scenario_overrides_scenario_id_fkey"
    FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
