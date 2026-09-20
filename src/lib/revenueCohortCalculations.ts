import { ProcessedCustomer } from '@/contexts/DataContext';
import { groupCustomersByCohort, formatCohortMonth } from './cohortCalculations';

export interface RevenueRetentionData {
  month: number;
  retainedMRR: number;
  initialMRR: number;
  percentage: number;
}

export interface RevenueCohortData {
  cohortKey: string;
  cohortLabel: string;
  initialMRR: number;
  retention: RevenueRetentionData[];
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function getMonthsDifference(startDate: Date, endDate: Date): number {
  return (endDate.getFullYear() - startDate.getFullYear()) * 12 
       + (endDate.getMonth() - startDate.getMonth());
}

export function calculateRevenueRetention(
  customers: ProcessedCustomer[],
  cohortStartDate: Date
): RevenueRetentionData[] {
  const initialMRR = customers.reduce((sum, c) => sum + (c.mrr || 0), 0);
  const retention: RevenueRetentionData[] = [];
  const cohortMonthStart = getMonthStart(cohortStartDate);
  const now = new Date();
  const monthsUntilNow = getMonthsDifference(cohortMonthStart, now);
  
  for (let month = 0; month <= monthsUntilNow; month++) {
    const targetDate = addMonths(cohortMonthStart, month);
    const targetMonthEnd = addMonths(targetDate, 1);
    
    // Don't calculate future months
    if (targetDate > now) {
      break;
    }
    
    const activeCustomers = customers.filter(customer => {
      // Customer is retained if:
      // 1. They have no churn date (still active)
      // 2. OR their churn date is after the target month end
      if (!customer.churnDate) {
        return true;
      }
      return customer.churnDate >= targetMonthEnd;
    });
    
    const retainedMRR = activeCustomers.reduce((sum, c) => sum + (c.mrr || 0), 0);
    const percentage = initialMRR > 0 ? (retainedMRR / initialMRR) * 100 : 0;
    
    retention.push({
      month,
      retainedMRR: Math.round(retainedMRR * 100) / 100,
      initialMRR,
      percentage: Math.round(percentage * 10) / 10,
    });
  }
  
  return retention;
}

export function calculateRevenueCohortData(customers: ProcessedCustomer[]): RevenueCohortData[] {
  // Filter only customers with valid MRR
  const customersWithMRR = customers.filter(c => c.mrr !== null && c.mrr !== undefined && c.mrr > 0);
  
  if (customersWithMRR.length === 0) {
    return [];
  }
  
  const cohorts = groupCustomersByCohort(customersWithMRR);
  const cohortData: RevenueCohortData[] = [];
  
  // Sort cohort keys chronologically
  const sortedKeys = Array.from(cohorts.keys()).sort();
  
  sortedKeys.forEach(key => {
    const cohortCustomers = cohorts.get(key)!;
    const firstCustomer = cohortCustomers[0];
    const cohortStartDate = firstCustomer.startDate;
    const initialMRR = cohortCustomers.reduce((sum, c) => sum + (c.mrr || 0), 0);
    
    cohortData.push({
      cohortKey: key,
      cohortLabel: formatCohortMonth(cohortStartDate),
      initialMRR: Math.round(initialMRR * 100) / 100,
      retention: calculateRevenueRetention(cohortCustomers, cohortStartDate),
    });
  });
  
  return cohortData;
}

export function formatMRR(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatMRRCompact(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}
