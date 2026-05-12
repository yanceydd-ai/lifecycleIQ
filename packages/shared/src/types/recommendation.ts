export type RecommendedActionType =
  | 'renew_as_is'
  | 'renew_with_reduction'
  | 'expand'
  | 'renegotiate'
  | 'replace'
  | 'retire'
  | 'defer'
  | 'consolidate'
  | 'terminate'
  | 'monitor'
  | 'escalate';

export type ScoreClassification =
  | 'Must fund'
  | 'Strongly recommended'
  | 'Plan carefully'
  | 'Optional or defer'
  | 'Retirement candidate';

export type RecommendationEntityType = 'hardware_asset' | 'software_product' | 'contract';

export interface Recommendation {
  // Keyed by entityType + entityId (no separate row id — computed on the fly, not persisted)
  entityType: RecommendationEntityType;
  entityId: string;
  entityName: string;
  score: number;
  classification: ScoreClassification;
  recommendedAction: RecommendedActionType;
  explanation: string;
  isOverridden: boolean;
  overriddenAction: RecommendedActionType | null;
}

export interface DecisionHistory {
  id: string;
  entityType: RecommendationEntityType;
  entityId: string;
  previousAction: RecommendedActionType | null;
  newAction: RecommendedActionType;
  rationale: string;
  userId: string;
  createdAt: string;
}

export interface UpdateRecommendationInput {
  newAction: RecommendedActionType;
  rationale: string;
}
