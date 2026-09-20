import { CohortData } from './cohortCalculations';
import { ProcessedCustomer } from '@/contexts/DataContext';

export interface AdvancedMetrics {
  retentionM1: number;
  retentionM3: number;
  retentionM6: number;
  retentionM12: number;
  avgMonthlyChurn: number;
  bestCohort: { label: string; retention: number } | null;
  worstCohort: { label: string; churn: number } | null;
  avgLifetimeMonths: number;
  estimatedLTV: number | null;
  earliestCohort: string;
  activePercentage: number;
  totalCustomers: number;
  activeCustomers: number;
}

export function calculateAverageRetentionAtMonth(
  cohorts: CohortData[],
  month: number
): number {
  const validCohorts = cohorts.filter(c =>
    c.retention.some(r => r.month === month)
  );
  if (validCohorts.length === 0) return 0;

  const sum = validCohorts.reduce((acc, c) => {
    const retention = c.retention.find(r => r.month === month);
    return acc + (retention?.percentage || 0);
  }, 0);

  return Math.round((sum / validCohorts.length) * 10) / 10;
}

export function calculateAverageMonthlyChurn(cohorts: CohortData[]): number {
  if (cohorts.length === 0) return 0;

  const churnRates = cohorts.map(c => {
    const m1 = c.retention.find(r => r.month === 1);
    return m1 ? (100 - m1.percentage) : 0;
  });

  const avg = churnRates.reduce((a, b) => a + b, 0) / churnRates.length;
  return Math.round(avg * 10) / 10;
}

export function findBestCohort(cohorts: CohortData[]): { label: string; retention: number } | null {
  if (cohorts.length === 0) return null;

  let best: { label: string; retention: number } | null = null;

  cohorts.forEach(c => {
    const m3 = c.retention.find(r => r.month === 3);
    if (m3 && (!best || m3.percentage > best.retention)) {
      best = { label: c.cohortLabel, retention: m3.percentage };
    }
  });

  return best;
}

export function findWorstCohort(cohorts: CohortData[]): { label: string; churn: number } | null {
  if (cohorts.length === 0) return null;

  let worst: { label: string; churn: number } | null = null;

  cohorts.forEach(c => {
    const m1 = c.retention.find(r => r.month === 1);
    const churn = m1 ? (100 - m1.percentage) : 0;
    if (!worst || churn > worst.churn) {
      worst = { label: c.cohortLabel, churn };
    }
  });

  return worst;
}

export function calculateAverageLifetime(customers: ProcessedCustomer[]): number {
  if (customers.length === 0) return 0;

  const lifetimes = customers.map(c => {
    const end = c.churnDate || new Date();
    const months = (end.getTime() - c.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return Math.max(0, months);
  });

  const avg = lifetimes.reduce((a, b) => a + b, 0) / lifetimes.length;
  return Math.round(avg * 10) / 10;
}

export function calculateEstimatedLTV(
  avgLifetimeMonths: number,
  customers: ProcessedCustomer[]
): number | null {
  const customersWithMRR = customers.filter(c => c.mrr !== null && c.mrr > 0);
  if (customersWithMRR.length === 0) return null;

  const avgMRR = customersWithMRR.reduce((acc, c) => acc + (c.mrr || 0), 0) / customersWithMRR.length;
  return Math.round(avgLifetimeMonths * avgMRR * 100) / 100;
}

export function getEarliestCohort(cohorts: CohortData[]): string {
  if (cohorts.length === 0) return '-';
  
  // Cohorts are already sorted chronologically
  return cohorts[0]?.cohortLabel || '-';
}

export function calculateAllMetrics(
  customers: ProcessedCustomer[],
  cohorts: CohortData[]
): AdvancedMetrics {
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.isActive).length;
  const activePercentage = totalCustomers > 0 
    ? Math.round((activeCustomers / totalCustomers) * 1000) / 10 
    : 0;

  const avgLifetimeMonths = calculateAverageLifetime(customers);

  return {
    retentionM1: calculateAverageRetentionAtMonth(cohorts, 1),
    retentionM3: calculateAverageRetentionAtMonth(cohorts, 3),
    retentionM6: calculateAverageRetentionAtMonth(cohorts, 6),
    retentionM12: calculateAverageRetentionAtMonth(cohorts, 12),
    avgMonthlyChurn: calculateAverageMonthlyChurn(cohorts),
    bestCohort: findBestCohort(cohorts),
    worstCohort: findWorstCohort(cohorts),
    avgLifetimeMonths,
    estimatedLTV: calculateEstimatedLTV(avgLifetimeMonths, customers),
    earliestCohort: getEarliestCohort(cohorts),
    activePercentage,
    totalCustomers,
    activeCustomers,
  };
}
