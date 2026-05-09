export interface Recommendation {
  entityType: 'hardware_asset' | 'software_product' | 'contract';
  entityId: string;
  entityName: string;
  score: number;
  classification: string;
  recommendedAction: string;
  explanation: string;
  isOverridden: boolean;
  overriddenAction: string | null;
}

export interface DecisionHistory {
  id: string;
  entityType: string;
  entityId: string;
  previousAction: string | null;
  newAction: string;
  rationale: string;
  userId: string;
  createdAt: string;
}

export interface UpdateRecommendationInput {
  newAction: string;
  rationale: string;
}
