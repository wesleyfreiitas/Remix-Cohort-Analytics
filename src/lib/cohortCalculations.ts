import { ProcessedCustomer } from '@/contexts/DataContext';

const MONTHS_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export interface RetentionData {
  month: number;
  retained: number;
  percentage: number;
}

export interface CohortData {
  cohortKey: string;
  cohortLabel: string;
  totalCustomers: number;
  retention: RetentionData[];
}

export function formatCohortMonth(date: Date): string {
  const month = MONTHS_PT[date.getMonth()];
  const year = date.getFullYear();
  return `${month} ${year}`;
}

export function getCohortKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function groupCustomersByCohort(customers: ProcessedCustomer[]): Map<string, ProcessedCustomer[]> {
  const cohorts = new Map<string, ProcessedCustomer[]>();
  
  customers.forEach(customer => {
    const key = getCohortKey(customer.startDate);
    const existing = cohorts.get(key) || [];
    existing.push(customer);
    cohorts.set(key, existing);
  });
  
  return cohorts;
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

export function calculateRetention(
  customers: ProcessedCustomer[],
  cohortStartDate: Date
): RetentionData[] {
  const totalCustomers = customers.length;
  const retention: RetentionData[] = [];
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
    
    const retainedCustomers = customers.filter(customer => {
      // Customer is retained if:
      // 1. They have no churn date (still active)
      // 2. OR their churn date is after the target month end
      if (!customer.churnDate) {
        return true;
      }
      return customer.churnDate >= targetMonthEnd;
    });
    
    const retained = retainedCustomers.length;
    const percentage = totalCustomers > 0 ? (retained / totalCustomers) * 100 : 0;
    
    retention.push({
      month,
      retained,
      percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
    });
  }
  
  return retention;
}

export function calculateCohortData(customers: ProcessedCustomer[]): CohortData[] {
  const cohorts = groupCustomersByCohort(customers);
  const cohortData: CohortData[] = [];
  
  // Sort cohort keys chronologically
  const sortedKeys = Array.from(cohorts.keys()).sort();
  
  sortedKeys.forEach(key => {
    const cohortCustomers = cohorts.get(key)!;
    const firstCustomer = cohortCustomers[0];
    const cohortStartDate = firstCustomer.startDate;
    
    cohortData.push({
      cohortKey: key,
      cohortLabel: formatCohortMonth(cohortStartDate),
      totalCustomers: cohortCustomers.length,
      retention: calculateRetention(cohortCustomers, cohortStartDate),
    });
  });
  
  return cohortData;
}

export function getRetentionColor(percentage: number, isM0: boolean): { bg: string; text: string } {
  if (isM0) return { bg: 'bg-cyan-500/30', text: 'text-cyan-400' };
  if (percentage >= 80) return { bg: 'bg-emerald-500/30', text: 'text-emerald-400' };
  if (percentage >= 60) return { bg: 'bg-yellow-500/30', text: 'text-yellow-400' };
  if (percentage >= 40) return { bg: 'bg-orange-500/30', text: 'text-orange-400' };
  return { bg: 'bg-red-500/30', text: 'text-red-400' };
}

export function exportToCsv(data: CohortData[]): string {
  const maxMonths = Math.max(...data.map(d => d.retention.length));
  const headers = ['Cohort', 'Clientes'];
  
  for (let i = 0; i < maxMonths; i++) {
    headers.push(`M${i}`);
  }
  
  const rows = data.map(cohort => {
    const row = [cohort.cohortLabel, String(cohort.totalCustomers)];
    
    for (let i = 0; i < maxMonths; i++) {
      const retention = cohort.retention.find(r => r.month === i);
      row.push(retention ? `${retention.percentage}%` : '-');
    }
    
    return row.join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}
