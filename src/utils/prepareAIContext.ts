import { ProcessedCustomer } from "@/contexts/DataContext";
import type { BusinessSettings } from "@/contexts/UserSettingsContext";

// ============================================================================
// TYPES
// ============================================================================

export type SubscriptionData = ProcessedCustomer;

export interface FieldAvailability {
  available: boolean;
  coverage: number; // 0-100
  quality: 'high' | 'medium' | 'low' | 'none';
  uniqueValues?: number;
}

export interface DataAvailability {
  mrr: FieldAvailability;
  planType: FieldAvailability;
  acquisitionChannel: FieldAvailability;
  overallQuality: 'excellent' | 'good' | 'limited';
  recommendations: string[];
}

export interface SeasonalityData {
  byMonth: Array<{
    month: number;
    monthName: string;
    totalChurns: number;
    avgChurnRate: number;
    isHighRisk: boolean;
    isLowRisk: boolean;
  }>;
  highRiskMonths: string[];
  lowRiskMonths: string[];
  hasPattern: boolean;
  peakMonth: string | null;
  valleyMonth: string | null;
  variationPercent: number;
}

// ============================================================================
// DATA QUALITY REPORT (for AI validation)
// ============================================================================

export interface DataQualityReport {
  // Analysis capabilities
  canAnalyzeRevenue: boolean;
  canAnalyzePlans: boolean;
  canAnalyzeChannels: boolean;
  canAnalyzeSeasonality: boolean;
  
  // Confidence limits
  minSampleForInsight: number;
  minCohortMonthsForTrend: number;
  
  // Quality warnings
  warnings: string[];
  
  // Business context (auto-detected)
  businessContext: {
    industry: 'saas_b2b' | 'saas_b2c' | 'education' | 'unknown';
    averageContractValue: 'low' | 'medium' | 'high';
    churnVelocity: 'fast' | 'normal' | 'slow';
  };
}

export interface CohortContext {
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    churnRate: number;
    avgRetentionM1: number;
    avgRetentionM3: number;
    avgRetentionM6: number;
    avgRetentionM12: number;
    avgLifetimeMonths: number;
    // Revenue metrics
    hasRevenueData: boolean;
    avgMRR: number | null;
    totalMRR: number | null;
    estimatedLTV: number | null;
  };
  revenueMetrics: {
    avgRevenueRetentionM1: number;
    avgRevenueRetentionM3: number;
    avgRevenueRetentionM6: number;
    avgRevenueRetentionM12: number;
  } | null;
  cohortTable: Array<{
    cohort: string;
    size: number;
    retentionByMonth: number[];
    initialMRR: number | null;
    revenueRetention: number[] | null;
  }>;
  byPlan: Record<string, ExtendedSegment>;
  byChannel: Record<string, ExtendedSegment>;
  crossAnalysis: {
    segments: Array<{
      plan: string;
      channel: string;
      count: number;
      churnRate: number;
      retentionM3: number;
      avgMRR: number | null;
    }>;
    bestCombination: { plan: string; channel: string; retention: number } | null;
    worstCombination: { plan: string; channel: string; retention: number } | null;
  } | null;
  trends: {
    direction: 'improving' | 'declining' | 'stable';
    bestCohort: string;
    worstCohort: string;
  };
  dataAvailability: DataAvailability;
  seasonality: SeasonalityData | null;
  dataQualityReport: DataQualityReport;
}

export interface ExtendedSegment {
  count: number;
  churnRate: number;
  avgLifetime: number;
  avgMRR: number | null;
  totalMRR: number | null;
  retentionM1: number;
  retentionM3: number;
  retentionM6: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                   'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const MAX_COHORTS = 12;
const MIN_SEGMENT_SIZE = 5;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getMonthDiff(startDate: Date, endDate: Date): number {
  return (endDate.getFullYear() - startDate.getFullYear()) * 12 
       + (endDate.getMonth() - startDate.getMonth());
}

function formatCohortMonth(date: Date): string {
  return `${MONTHS_PT[date.getMonth()]} ${date.getFullYear()}`;
}

function getCohortKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function calculateRetention(
  customers: SubscriptionData[],
  cohortStartDate: Date,
  targetMonth: number
): number {
  const total = customers.length;
  if (total === 0) return 0;
  
  // Calculate target date (cohort start + N months)
  const targetDate = new Date(cohortStartDate);
  targetDate.setMonth(targetDate.getMonth() + targetMonth);
  const targetMonthEnd = new Date(targetDate);
  targetMonthEnd.setMonth(targetMonthEnd.getMonth() + 1);
  
  // Customer is retained if no churn OR churn after target date
  const retained = customers.filter(c => {
    if (!c.churnDate) return true;
    return c.churnDate >= targetMonthEnd;
  }).length;
  
  return Math.round((retained / total) * 1000) / 10;
}

function calculateAverageLifetime(customers: SubscriptionData[]): number {
  if (customers.length === 0) return 0;
  
  const lifetimes = customers.map(c => {
    const end = c.churnDate || new Date();
    const months = getMonthDiff(c.startDate, end);
    return Math.max(0, months);
  });
  
  return Math.round(lifetimes.reduce((a, b) => a + b, 0) / lifetimes.length * 10) / 10;
}

function calculateTrendDirection(
  recentAvg: number, 
  previousAvg: number
): 'improving' | 'declining' | 'stable' {
  const diff = recentAvg - previousAvg;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

// ============================================================================
// REVENUE HELPER FUNCTIONS
// ============================================================================

function calculateRevenueRetentionForCohort(
  customers: SubscriptionData[],
  cohortStartDate: Date
): number[] {
  const customersWithMRR = customers.filter(c => c.mrr !== null && c.mrr !== undefined && c.mrr > 0);
  if (customersWithMRR.length === 0) return [];
  
  const initialMRR = customersWithMRR.reduce((sum, c) => sum + (c.mrr || 0), 0);
  const retention: number[] = [];
  const now = new Date();
  const monthsUntilNow = getMonthDiff(cohortStartDate, now);
  
  for (let month = 0; month <= Math.min(monthsUntilNow, 12); month++) {
    const targetDate = addMonths(cohortStartDate, month);
    const targetMonthEnd = addMonths(targetDate, 1);
    
    if (targetDate > now) break;
    
    const activeCustomers = customersWithMRR.filter(customer => {
      if (!customer.churnDate) return true;
      return customer.churnDate >= targetMonthEnd;
    });
    
    const retainedMRR = activeCustomers.reduce((sum, c) => sum + (c.mrr || 0), 0);
    const percentage = initialMRR > 0 ? (retainedMRR / initialMRR) * 100 : 0;
    
    retention.push(Math.round(percentage * 10) / 10);
  }
  
  return retention;
}

function calculateMRRSummary(customers: SubscriptionData[], avgLifetime: number): {
  hasRevenueData: boolean;
  avgMRR: number | null;
  totalMRR: number | null;
  estimatedLTV: number | null;
} {
  const customersWithMRR = customers.filter(c => c.mrr !== null && c.mrr !== undefined && c.mrr > 0);
  const hasRevenueData = customersWithMRR.length > 0;
  
  if (!hasRevenueData) {
    return { hasRevenueData, avgMRR: null, totalMRR: null, estimatedLTV: null };
  }
  
  const activeWithMRR = customersWithMRR.filter(c => c.isActive);
  
  if (activeWithMRR.length === 0) {
    return { hasRevenueData, avgMRR: null, totalMRR: null, estimatedLTV: null };
  }
  
  const totalMRR = activeWithMRR.reduce((sum, c) => sum + (c.mrr || 0), 0);
  const avgMRR = totalMRR / activeWithMRR.length;
  const estimatedLTV = avgMRR * avgLifetime;
  
  return {
    hasRevenueData,
    avgMRR: Math.round(avgMRR * 100) / 100,
    totalMRR: Math.round(totalMRR * 100) / 100,
    estimatedLTV: Math.round(estimatedLTV * 100) / 100,
  };
}

function calculateRevenueMetrics(
  cohortMap: Map<string, CohortGroup>
): CohortContext['revenueMetrics'] {
  const now = new Date();
  const retentionsM1: number[] = [];
  const retentionsM3: number[] = [];
  const retentionsM6: number[] = [];
  const retentionsM12: number[] = [];
  
  cohortMap.forEach(cohort => {
    const customersWithMRR = cohort.customers.filter(c => c.mrr !== null && c.mrr !== undefined && c.mrr > 0);
    if (customersWithMRR.length === 0) return;
    
    const monthsExisted = getMonthDiff(cohort.startDate, now);
    const revenueRetention = calculateRevenueRetentionForCohort(customersWithMRR, cohort.startDate);
    
    if (monthsExisted >= 1 && revenueRetention[1] !== undefined) {
      retentionsM1.push(revenueRetention[1]);
    }
    if (monthsExisted >= 3 && revenueRetention[3] !== undefined) {
      retentionsM3.push(revenueRetention[3]);
    }
    if (monthsExisted >= 6 && revenueRetention[6] !== undefined) {
      retentionsM6.push(revenueRetention[6]);
    }
    if (monthsExisted >= 12 && revenueRetention[12] !== undefined) {
      retentionsM12.push(revenueRetention[12]);
    }
  });
  
  // If no cohorts have revenue data, return null
  if (retentionsM1.length === 0 && retentionsM3.length === 0) {
    return null;
  }
  
  const avg = (arr: number[]) => arr.length > 0 
    ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 
    : 0;
  
  return {
    avgRevenueRetentionM1: avg(retentionsM1),
    avgRevenueRetentionM3: avg(retentionsM3),
    avgRevenueRetentionM6: avg(retentionsM6),
    avgRevenueRetentionM12: avg(retentionsM12),
  };
}

// ============================================================================
// INTERNAL PROCESSING FUNCTIONS
// ============================================================================

interface CohortGroup {
  customers: SubscriptionData[];
  startDate: Date;
}

function groupByCohort(customers: SubscriptionData[]): Map<string, CohortGroup> {
  const cohorts = new Map<string, CohortGroup>();
  
  customers.forEach(customer => {
    const key = getCohortKey(customer.startDate);
    if (!cohorts.has(key)) {
      cohorts.set(key, { 
        customers: [], 
        startDate: new Date(customer.startDate.getFullYear(), customer.startDate.getMonth(), 1)
      });
    }
    cohorts.get(key)!.customers.push(customer);
  });
  
  return cohorts;
}

function calculateAverageRetentionAtMonth(
  cohortMap: Map<string, CohortGroup>,
  month: number
): number {
  const now = new Date();
  const retentions: number[] = [];
  
  cohortMap.forEach(cohort => {
    // Only include cohorts that have existed long enough
    const monthsExisted = getMonthDiff(cohort.startDate, now);
    if (monthsExisted >= month) {
      retentions.push(calculateRetention(cohort.customers, cohort.startDate, month));
    }
  });
  
  if (retentions.length === 0) return 0;
  return Math.round(retentions.reduce((a, b) => a + b, 0) / retentions.length * 10) / 10;
}

function calculateSummaryMetrics(
  customers: SubscriptionData[],
  cohortMap: Map<string, CohortGroup>
): CohortContext['summary'] {
  const total = customers.length;
  const active = customers.filter(c => c.isActive).length;
  const churned = total - active;
  const avgLifetime = calculateAverageLifetime(customers);
  
  const mrrSummary = calculateMRRSummary(customers, avgLifetime);
  
  return {
    totalCustomers: total,
    activeCustomers: active,
    churnRate: total > 0 ? Math.round((churned / total) * 1000) / 10 : 0,
    avgRetentionM1: calculateAverageRetentionAtMonth(cohortMap, 1),
    avgRetentionM3: calculateAverageRetentionAtMonth(cohortMap, 3),
    avgRetentionM6: calculateAverageRetentionAtMonth(cohortMap, 6),
    avgRetentionM12: calculateAverageRetentionAtMonth(cohortMap, 12),
    avgLifetimeMonths: avgLifetime,
    ...mrrSummary,
  };
}

function buildCohortTable(cohortMap: Map<string, CohortGroup>): CohortContext['cohortTable'] {
  const now = new Date();
  const sortedKeys = Array.from(cohortMap.keys()).sort().slice(-MAX_COHORTS);
  
  return sortedKeys.map(key => {
    const cohort = cohortMap.get(key)!;
    const { customers, startDate } = cohort;
    
    const retentionByMonth: number[] = [];
    for (let m = 0; m <= 12; m++) {
      const monthDate = new Date(startDate);
      monthDate.setMonth(monthDate.getMonth() + m);
      
      // Only calculate if the month has passed
      if (monthDate <= now) {
        retentionByMonth.push(calculateRetention(customers, startDate, m));
      }
    }
    
    // Calculate revenue metrics for cohort
    const customersWithMRR = customers.filter(c => c.mrr !== null && c.mrr !== undefined && c.mrr > 0);
    const initialMRR = customersWithMRR.length > 0
      ? Math.round(customersWithMRR.reduce((s, c) => s + (c.mrr || 0), 0) * 100) / 100
      : null;
    
    const revenueRetention = initialMRR !== null
      ? calculateRevenueRetentionForCohort(customersWithMRR, startDate)
      : null;
    
    return {
      cohort: formatCohortMonth(startDate),
      size: customers.length,
      retentionByMonth,
      initialMRR,
      revenueRetention,
    };
  });
}

function calculateRetentionForSegment(
  customers: SubscriptionData[],
  month: number
): number {
  if (customers.length === 0) return 0;
  
  const now = new Date();
  const eligibleCustomers = customers.filter(c => {
    const monthsFromStart = getMonthDiff(c.startDate, now);
    return monthsFromStart >= month;
  });
  
  if (eligibleCustomers.length === 0) return 0;
  
  const retained = eligibleCustomers.filter(c => {
    if (!c.churnDate) return true;
    const monthsUntilChurn = getMonthDiff(c.startDate, c.churnDate);
    return monthsUntilChurn >= month;
  });
  
  return Math.round((retained.length / eligibleCustomers.length) * 1000) / 10;
}

function segmentByAttribute(
  customers: SubscriptionData[],
  attribute: 'planType' | 'acquisitionChannel',
  minCount: number = MIN_SEGMENT_SIZE
): Record<string, ExtendedSegment> {
  const groups = new Map<string, SubscriptionData[]>();
  
  customers.forEach(c => {
    const key = c[attribute] || (attribute === 'planType' ? 'Sem plano' : 'Sem canal');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  });
  
  const result: Record<string, ExtendedSegment> = {};
  
  groups.forEach((groupCustomers, key) => {
    // Filter segments with few customers for token efficiency
    if (groupCustomers.length < minCount) return;
    
    const churned = groupCustomers.filter(c => c.churnDate).length;
    
    // Calculate MRR metrics for segment
    const activeWithMRR = groupCustomers.filter(c => c.isActive && c.mrr !== null && c.mrr !== undefined && c.mrr > 0);
    const totalMRR = activeWithMRR.length > 0
      ? Math.round(activeWithMRR.reduce((s, c) => s + (c.mrr || 0), 0) * 100) / 100
      : null;
    const avgMRR = activeWithMRR.length > 0
      ? Math.round((totalMRR! / activeWithMRR.length) * 100) / 100
      : null;
    
    result[key] = {
      count: groupCustomers.length,
      churnRate: Math.round((churned / groupCustomers.length) * 1000) / 10,
      avgLifetime: calculateAverageLifetime(groupCustomers),
      avgMRR,
      totalMRR,
      retentionM1: calculateRetentionForSegment(groupCustomers, 1),
      retentionM3: calculateRetentionForSegment(groupCustomers, 3),
      retentionM6: calculateRetentionForSegment(groupCustomers, 6),
    };
  });
  
  return result;
}

function calculateCrossAnalysis(
  customers: SubscriptionData[]
): CohortContext['crossAnalysis'] {
  // Verificar se temos ambos plano e canal
  const customersWithBoth = customers.filter(
    c => c.planType && c.planType.trim() !== '' && 
         c.acquisitionChannel && c.acquisitionChannel.trim() !== ''
  );
  
  if (customersWithBoth.length < MIN_SEGMENT_SIZE * 2) return null;
  
  // Agrupar por combinação plano+canal
  const groups = new Map<string, SubscriptionData[]>();
  
  customersWithBoth.forEach(c => {
    const key = `${c.planType}|${c.acquisitionChannel}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  });
  
  const segments: NonNullable<CohortContext['crossAnalysis']>['segments'] = [];
  let best: { plan: string; channel: string; retention: number } | null = null;
  let worst: { plan: string; channel: string; retention: number } | null = null;
  
  groups.forEach((groupCustomers, key) => {
    if (groupCustomers.length < MIN_SEGMENT_SIZE) return;
    
    const [plan, channel] = key.split('|');
    const retentionM3 = calculateRetentionForSegment(groupCustomers, 3);
    const churned = groupCustomers.filter(c => c.churnDate).length;
    
    const activeWithMRR = groupCustomers.filter(c => c.isActive && c.mrr && c.mrr > 0);
    const avgMRR = activeWithMRR.length > 0
      ? Math.round(activeWithMRR.reduce((s, c) => s + (c.mrr || 0), 0) / activeWithMRR.length * 100) / 100
      : null;
    
    segments.push({
      plan,
      channel,
      count: groupCustomers.length,
      churnRate: Math.round((churned / groupCustomers.length) * 1000) / 10,
      retentionM3,
      avgMRR,
    });
    
    // Track best/worst
    if (retentionM3 > 0) {
      if (!best || retentionM3 > best.retention) {
        best = { plan, channel, retention: retentionM3 };
      }
      if (!worst || retentionM3 < worst.retention) {
        worst = { plan, channel, retention: retentionM3 };
      }
    }
  });
  
  // Ordenar por retenção (melhor primeiro)
  segments.sort((a, b) => b.retentionM3 - a.retentionM3);
  
  return {
    segments: segments.slice(0, 10), // Top 10 combinações
    bestCombination: best,
    worstCombination: worst,
  };
}

function analyzeTrends(cohortTable: CohortContext['cohortTable']): CohortContext['trends'] {
  if (cohortTable.length < 3) {
    return { direction: 'stable', bestCohort: '-', worstCohort: '-' };
  }
  
  // Compare last 3 cohorts with previous 3 (using M3)
  const getM3 = (c: CohortContext['cohortTable'][0]) => c.retentionByMonth[3] || 0;
  
  const recent = cohortTable.slice(-3);
  const previous = cohortTable.slice(-6, -3);
  
  const recentAvg = recent.reduce((a, c) => a + getM3(c), 0) / recent.length;
  const previousAvg = previous.length > 0 
    ? previous.reduce((a, c) => a + getM3(c), 0) / previous.length 
    : recentAvg;
  
  // Find best and worst cohort
  let bestCohort = '';
  let bestRetention = -1;
  let worstCohort = '';
  let worstRetention = 101;
  
  cohortTable.forEach(c => {
    const m3 = getM3(c);
    if (m3 > bestRetention) {
      bestRetention = m3;
      bestCohort = c.cohort;
    }
    if (m3 < worstRetention && m3 > 0) {
      worstRetention = m3;
      worstCohort = c.cohort;
    }
  });
  
  return {
    direction: calculateTrendDirection(recentAvg, previousAvg),
    bestCohort,
    worstCohort,
  };
}

// ============================================================================
// SEASONALITY ANALYSIS
// ============================================================================

function calculateSeasonality(customers: SubscriptionData[]): SeasonalityData | null {
  // Filter only churned customers
  const churnedCustomers = customers.filter(c => c.churnDate);
  if (churnedCustomers.length < 12) return null; // Minimum for valid analysis
  
  // Group churns by month of year (0-11)
  const churnsByMonth = new Map<number, number>();
  for (let i = 0; i < 12; i++) churnsByMonth.set(i, 0);
  
  churnedCustomers.forEach(c => {
    const month = c.churnDate!.getMonth();
    churnsByMonth.set(month, (churnsByMonth.get(month) || 0) + 1);
  });
  
  // Calculate total customers exposed to each month
  const exposureByMonth = new Map<number, number>();
  for (let i = 0; i < 12; i++) exposureByMonth.set(i, 0);
  
  const now = new Date();
  customers.forEach(c => {
    const startMonth = c.startDate.getMonth();
    const startYear = c.startDate.getFullYear();
    const endDate = c.churnDate || now;
    const endMonth = endDate.getMonth();
    const endYear = endDate.getFullYear();
    
    // Calculate total months customer was active
    const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    
    // For customers active less than 12 months, count their specific months
    if (totalMonths <= 12) {
      let month = startMonth;
      for (let i = 0; i < totalMonths; i++) {
        exposureByMonth.set(month, (exposureByMonth.get(month) || 0) + 1);
        month = (month + 1) % 12;
      }
    } else {
      // For customers active more than 12 months, all months have exposure
      for (let i = 0; i < 12; i++) {
        exposureByMonth.set(i, (exposureByMonth.get(i) || 0) + 1);
      }
    }
  });
  
  // Calculate churn rate by month
  const byMonth: SeasonalityData['byMonth'] = [];
  let totalRate = 0;
  let validMonthsCount = 0;
  
  MONTHS_PT.forEach((monthName, month) => {
    const churns = churnsByMonth.get(month) || 0;
    const exposure = exposureByMonth.get(month) || 1;
    const rate = exposure > 0 ? (churns / exposure) * 100 : 0;
    
    if (exposure > 0) {
      totalRate += rate;
      validMonthsCount++;
    }
    
    byMonth.push({
      month,
      monthName,
      totalChurns: churns,
      avgChurnRate: Math.round(rate * 10) / 10,
      isHighRisk: false, // Will be calculated later
      isLowRisk: false,
    });
  });
  
  const avgRate = validMonthsCount > 0 ? totalRate / validMonthsCount : 0;
  const highThreshold = avgRate * 1.5;
  const lowThreshold = avgRate * 0.5;
  
  // Mark risk months and identify patterns
  const highRiskMonths: string[] = [];
  const lowRiskMonths: string[] = [];
  let peakMonth: string | null = null;
  let valleyMonth: string | null = null;
  let maxRate = -1;
  let minRate = Infinity;
  
  byMonth.forEach(m => {
    if (m.avgChurnRate > highThreshold) {
      m.isHighRisk = true;
      highRiskMonths.push(m.monthName);
    }
    if (m.avgChurnRate < lowThreshold && m.avgChurnRate > 0) {
      m.isLowRisk = true;
      lowRiskMonths.push(m.monthName);
    }
    if (m.avgChurnRate > maxRate) {
      maxRate = m.avgChurnRate;
      peakMonth = m.monthName;
    }
    if (m.avgChurnRate < minRate && m.avgChurnRate > 0) {
      minRate = m.avgChurnRate;
      valleyMonth = m.monthName;
    }
  });
  
  const variationPercent = minRate > 0 
    ? Math.round(((maxRate - minRate) / minRate) * 100) 
    : 0;
  
  // Determine if there's a significant pattern (variation > 50%)
  const hasPattern = variationPercent > 50 || highRiskMonths.length >= 2;
  
  return {
    byMonth,
    highRiskMonths,
    lowRiskMonths,
    hasPattern,
    peakMonth,
    valleyMonth,
    variationPercent,
  };
}

// ============================================================================
// DATA AVAILABILITY ANALYSIS
// ============================================================================

function analyzeDataAvailability(customers: SubscriptionData[]): DataAvailability {
  const total = customers.length;
  if (total === 0) {
    return {
      mrr: { available: false, coverage: 0, quality: 'none' },
      planType: { available: false, coverage: 0, quality: 'none', uniqueValues: 0 },
      acquisitionChannel: { available: false, coverage: 0, quality: 'none', uniqueValues: 0 },
      overallQuality: 'limited',
      recommendations: ['Carregue dados de clientes para iniciar a análise'],
    };
  }

  // Analyze MRR
  const withMRR = customers.filter(c => c.mrr !== null && c.mrr !== undefined && c.mrr > 0);
  const mrrCoverage = (withMRR.length / total) * 100;

  // Analyze Plan
  const withPlan = customers.filter(c => c.planType && c.planType.trim() !== '');
  const planCoverage = (withPlan.length / total) * 100;
  const uniquePlans = new Set(withPlan.map(c => c.planType)).size;

  // Analyze Channel
  const withChannel = customers.filter(c => c.acquisitionChannel && c.acquisitionChannel.trim() !== '');
  const channelCoverage = (withChannel.length / total) * 100;
  const uniqueChannels = new Set(withChannel.map(c => c.acquisitionChannel)).size;

  const getQuality = (coverage: number): 'high' | 'medium' | 'low' | 'none' => {
    if (coverage === 0) return 'none';
    if (coverage >= 80) return 'high';
    if (coverage >= 50) return 'medium';
    return 'low';
  };

  // Generate recommendations
  const recommendations: string[] = [];
  if (mrrCoverage === 0) {
    recommendations.push('Adicione a coluna MRR para análises de receita (NRR, LTV)');
  } else if (mrrCoverage < 80) {
    recommendations.push(`MRR está preenchido em apenas ${mrrCoverage.toFixed(0)}% dos clientes`);
  }
  if (channelCoverage === 0) {
    recommendations.push('Adicione Canal de Aquisição para análise de performance por fonte');
  }
  if (planCoverage === 0) {
    recommendations.push('Adicione Tipo de Plano para segmentação por produto');
  }

  // Calculate overall quality
  const avgCoverage = (mrrCoverage + planCoverage + channelCoverage) / 3;
  const overallQuality: 'excellent' | 'good' | 'limited' = 
    avgCoverage >= 70 ? 'excellent' 
    : avgCoverage >= 40 ? 'good' 
    : 'limited';

  return {
    mrr: {
      available: mrrCoverage > 0,
      coverage: Math.round(mrrCoverage * 10) / 10,
      quality: getQuality(mrrCoverage),
    },
    planType: {
      available: planCoverage > 0,
      coverage: Math.round(planCoverage * 10) / 10,
      quality: getQuality(planCoverage),
      uniqueValues: uniquePlans,
    },
    acquisitionChannel: {
      available: channelCoverage > 0,
      coverage: Math.round(channelCoverage * 10) / 10,
      quality: getQuality(channelCoverage),
      uniqueValues: uniqueChannels,
    },
    overallQuality,
    recommendations,
  };
}

// ============================================================================
// DATA QUALITY REPORT BUILDER
// ============================================================================

function buildDataQualityReport(
  customers: SubscriptionData[],
  dataAvailability: DataAvailability,
  summary: CohortContext['summary'],
  seasonality: SeasonalityData | null,
  userSettings?: BusinessSettings
): DataQualityReport {
  const warnings: string[] = [];
  
  // Check if can analyze each dimension
  const canAnalyzeRevenue = dataAvailability.mrr.available && 
                            dataAvailability.mrr.coverage >= 50;
  const canAnalyzePlans = dataAvailability.planType.available && 
                          (dataAvailability.planType.uniqueValues || 0) >= 2;
  const canAnalyzeChannels = dataAvailability.acquisitionChannel.available &&
                             dataAvailability.acquisitionChannel.coverage >= 30;
  const canAnalyzeSeasonality = seasonality !== null && 
                                customers.filter(c => c.churnDate).length >= 12;
  
  // Detect business context based on data (auto-detection)
  const avgMRR = summary.avgMRR || 0;
  const avgLifetime = summary.avgLifetimeMonths;
  
  // Auto-detect values
  const autoDetectedContractValue: 'low' | 'medium' | 'high' = 
    avgMRR < 100 ? 'low' : avgMRR < 500 ? 'medium' : 'high';
  
  const churnVelocity: 'fast' | 'normal' | 'slow' =
    avgLifetime < 3 ? 'fast' : avgLifetime < 9 ? 'normal' : 'slow';
  
  // Auto-detect industry based on patterns
  let autoDetectedIndustry: 'saas_b2b' | 'saas_b2c' | 'education' | 'unknown' = 'unknown';
  if (avgMRR > 200 && avgLifetime > 6) {
    autoDetectedIndustry = 'saas_b2b';
  } else if (avgMRR < 100 && avgLifetime < 6) {
    autoDetectedIndustry = 'saas_b2c';
  } else if (avgMRR >= 100 && avgMRR <= 500 && avgLifetime >= 6) {
    autoDetectedIndustry = 'education';
  }
  
  // Apply user settings if explicit (not 'auto')
  let industry: 'saas_b2b' | 'saas_b2c' | 'education' | 'unknown' = autoDetectedIndustry;
  if (userSettings?.industry && userSettings.industry !== 'auto') {
    if (userSettings.industry === 'other') {
      industry = 'unknown';
    } else {
      industry = userSettings.industry;
    }
  }
  
  let averageContractValue: 'low' | 'medium' | 'high' = autoDetectedContractValue;
  if (userSettings?.averageContractValue && userSettings.averageContractValue !== 'auto') {
    averageContractValue = userSettings.averageContractValue;
  }
  
  // Generate specific warnings
  if (!canAnalyzeRevenue && dataAvailability.mrr.available) {
    warnings.push(`MRR disponível em apenas ${dataAvailability.mrr.coverage.toFixed(0)}% dos clientes - insights de receita podem ser imprecisos`);
  }
  if (!canAnalyzeRevenue && !dataAvailability.mrr.available) {
    warnings.push('Dados de MRR não disponíveis - análise de receita (NRR, LTV) não será possível');
  }
  if (customers.length < 100) {
    warnings.push(`Base pequena (${customers.length} clientes) - insights estatísticos têm maior margem de erro`);
  }
  if (customers.length < 50) {
    warnings.push('Amostra muito pequena para análises de tendência confiáveis');
  }
  if (!canAnalyzeChannels && dataAvailability.acquisitionChannel.available) {
    warnings.push(`Canal de aquisição disponível em apenas ${dataAvailability.acquisitionChannel.coverage.toFixed(0)}% dos clientes`);
  }
  if (churnVelocity === 'fast') {
    warnings.push('Churn acelerado detectado (lifetime médio < 3 meses) - priorize análise de onboarding');
  }
  
  // Calculate minimum sample sizes
  const minSampleForInsight = Math.max(10, Math.round(customers.length * 0.05));
  const minCohortMonthsForTrend = customers.length >= 100 ? 3 : 4;
  
  return {
    canAnalyzeRevenue,
    canAnalyzePlans,
    canAnalyzeChannels,
    canAnalyzeSeasonality,
    minSampleForInsight,
    minCohortMonthsForTrend,
    warnings,
    businessContext: {
      industry,
      averageContractValue,
      churnVelocity,
    },
  };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export function prepareContextForAI(
  rawData: SubscriptionData[],
  userSettings?: BusinessSettings
): CohortContext {
  // 1. Group customers by cohort (start month)
  const cohortMap = groupByCohort(rawData);
  
  // 2. Calculate summary metrics (includes revenue metrics)
  const summary = calculateSummaryMetrics(rawData, cohortMap);
  
  // 3. Build cohort table (last 12 months, includes revenue retention)
  const cohortTable = buildCohortTable(cohortMap);
  
  // 4. Segment by plan (>5 customers, includes MRR and retention periods)
  const byPlan = segmentByAttribute(rawData, 'planType', MIN_SEGMENT_SIZE);
  
  // 5. Segment by channel (>5 customers, includes MRR and retention periods)
  const byChannel = segmentByAttribute(rawData, 'acquisitionChannel', MIN_SEGMENT_SIZE);
  
  // 6. Calculate cross-analysis (plan × channel)
  const crossAnalysis = calculateCrossAnalysis(rawData);
  
  // 7. Identify trends
  const trends = analyzeTrends(cohortTable);
  
  // 8. Calculate aggregate revenue metrics (NRR)
  const revenueMetrics = calculateRevenueMetrics(cohortMap);
  
  // 9. Analyze data availability and quality
  const dataAvailability = analyzeDataAvailability(rawData);
  
  // 10. Analyze seasonality patterns
  const seasonality = calculateSeasonality(rawData);
  
  // 11. Build data quality report for AI (now accepts userSettings)
  const dataQualityReport = buildDataQualityReport(rawData, dataAvailability, summary, seasonality, userSettings);
  
  return { 
    summary, 
    revenueMetrics, 
    cohortTable, 
    byPlan, 
    byChannel, 
    crossAnalysis, 
    trends, 
    dataAvailability, 
    seasonality,
    dataQualityReport,
  };
}
