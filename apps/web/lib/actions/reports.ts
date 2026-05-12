'use server';

import { apiServer } from '@/lib/api';
import type {
  ExecutiveBudgetReport,
  RenewalReviewReport,
  CapitalReplacementReport,
  SoftwareOptimizationReport,
} from '@lifecycleiq/shared';

export async function getExecutiveBudgetReport(): Promise<ExecutiveBudgetReport> {
  return apiServer('/api/v1/reports/executive-budget');
}

export async function getRenewalReviewReport(): Promise<RenewalReviewReport> {
  return apiServer('/api/v1/reports/renewal-review');
}

export async function getCapitalReplacementReport(): Promise<CapitalReplacementReport> {
  return apiServer('/api/v1/reports/capital-replacement');
}

export async function getSoftwareOptimizationReport(): Promise<SoftwareOptimizationReport> {
  return apiServer('/api/v1/reports/software-optimization');
}
