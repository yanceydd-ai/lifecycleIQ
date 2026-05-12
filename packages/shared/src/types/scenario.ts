export type ScenarioType = 'conservative' | 'expected' | 'aggressive' | 'custom';
export type OverrideType = 'defer_year' | 'cost' | 'exclude';
export type OverrideEntityType = 'hardware_asset' | 'software_product' | 'contract';

export interface ScenarioOverride {
  id: string;
  scenarioId: string;
  entityType: OverrideEntityType;
  entityId: string;
  overrideType: OverrideType;
  value: string;
  createdAt: string;
}

export interface Scenario {
  id: string;
  name: string;
  type: ScenarioType;
  escalationRate: number;
  isRecommended: boolean;
  isSystem: boolean;
  createdBy: string | null;
  overrides: ScenarioOverride[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateScenarioInput {
  name: string;
  escalationRate: number;
}

export interface UpdateScenarioInput {
  name?: string;
  escalationRate?: number;
  isRecommended?: boolean;
}

export interface UpsertScenarioOverrideInput {
  entityType: OverrideEntityType;
  entityId: string;
  overrideType: OverrideType;
  value: string;
}
