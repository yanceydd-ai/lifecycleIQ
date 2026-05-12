export interface ExecutiveBudgetReport {
  currentYearOpex: number;
  currentYearCapex: number;
  threeYearTotal: number;
  sevenYearTotal: number;
  spikeYears: number[];
  topRenewals: {
    name: string;
    type: string;
    renewalDate: string | null;
    cost: number;
  }[];
  topCapitalReplacements: {
    name: string;
    assetType: string;
    replacementYear: number | null;
    cost: number;
  }[];
  savingsOpportunities: {
    name: string;
    annualCost: number;
    utilizationRate: number;
    potentialSavings: number;
  }[];
  highPriorityRecommendations: {
    name: string;
    entityType: string;
    action: string;
    score: number;
    classification: string;
  }[];
}

export interface RenewalReviewReport {
  upcomingRenewals: {
    name: string;
    type: string;
    renewalDate: string;
    cost: number;
    recommendedAction: string | null;
    approvalStatus: string | null;
  }[];
  cancellationDeadlines: {
    name: string;
    deadline: string;
    renewalDate: string;
    cost: number;
  }[];
}

export interface CapitalReplacementReport {
  byYear: {
    fiscalYear: number;
    assets: {
      name: string;
      assetType: string;
      cost: number;
      location: string | null;
      department: string | null;
    }[];
  }[];
  riskItems: {
    name: string;
    assetTag: string | null;
    criticality: string;
    supportEndDate: string | null;
    warrantyEndDate: string | null;
  }[];
}

export interface SoftwareOptimizationReport {
  lowUtilization: {
    name: string;
    utilizationRate: number;
    qtPurchased: number;
    qtUsed: number;
    annualCost: number;
    potentialSavings: number;
  }[];
  terminationCandidates: {
    name: string;
    annualCost: number;
    action: string;
    score: number;
  }[];
}
