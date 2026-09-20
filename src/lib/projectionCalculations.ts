import { CohortData } from './cohortCalculations';

export interface ProjectionDataPoint {
  month: number;
  label: string;
  actual: number | null;
  projected: number;
  optimistic: number;
  pessimistic: number;
  isProjection: boolean;
}

export interface ProjectionResult {
  data: ProjectionDataPoint[];
  confidence: 'high' | 'medium' | 'low';
  confidenceLabel: string;
  methodology: string;
  projectedM6: number | null;
  projectedM12: number | null;
  rSquared: number;
  lambda: number;
  trendDescription: string;
  hasEnoughData: boolean;
}

export interface MRRProjectionDataPoint {
  month: number;
  label: string;
  actual: number | null;
  projected: number;
  optimistic: number;
  pessimistic: number;
  isProjection: boolean;
}

export interface MRRProjectionResult {
  data: MRRProjectionDataPoint[];
  confidence: 'high' | 'medium' | 'low';
  confidenceLabel: string;
  projectedM6: number | null;
  projectedM12: number | null;
  trendDescription: string;
  hasEnoughData: boolean;
}

/**
 * Calculate weighted average retention by month across all cohorts
 */
function aggregateRetentionByMonth(cohorts: CohortData[]): Map<number, { value: number; weight: number }> {
  const aggregated = new Map<number, { sum: number; weight: number }>();

  cohorts.forEach(cohort => {
    cohort.retention.forEach(r => {
      const existing = aggregated.get(r.month) || { sum: 0, weight: 0 };
      existing.sum += r.percentage * cohort.totalCustomers;
      existing.weight += cohort.totalCustomers;
      aggregated.set(r.month, existing);
    });
  });

  const result = new Map<number, { value: number; weight: number }>();
  aggregated.forEach((data, month) => {
    if (data.weight > 0) {
      result.set(month, { value: data.sum / data.weight, weight: data.weight });
    }
  });

  return result;
}

/**
 * Fit exponential decay model: retention(t) = 100 * e^(-λt)
 * Using linear regression on log-transformed data
 */
function fitExponentialModel(retentionData: Map<number, { value: number; weight: number }>): {
  lambda: number;
  rSquared: number;
  residualStdDev: number;
} {
  const points: { x: number; y: number; logY: number }[] = [];

  retentionData.forEach((data, month) => {
    if (data.value > 0 && month >= 0) {
      points.push({
        x: month,
        y: data.value,
        logY: Math.log(data.value / 100),
      });
    }
  });

  if (points.length < 2) {
    return { lambda: 0.1, rSquared: 0, residualStdDev: 10 };
  }

  // Linear regression on log-transformed data: ln(y/100) = -λx
  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumLogY = points.reduce((sum, p) => sum + p.logY, 0);
  const sumXLogY = points.reduce((sum, p) => sum + p.x * p.logY, 0);
  const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);

  // λ = -slope from linear regression
  const slope = (n * sumXLogY - sumX * sumLogY) / (n * sumX2 - sumX * sumX);
  const lambda = Math.max(0.01, -slope); // Ensure positive decay rate

  // Calculate R² for model fit
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / n;
  const ssTotal = points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
  
  const residuals = points.map(p => {
    const predicted = 100 * Math.exp(-lambda * p.x);
    return p.y - predicted;
  });
  
  const ssResidual = residuals.reduce((sum, r) => sum + r * r, 0);
  const rSquared = Math.max(0, 1 - ssResidual / ssTotal);

  // Calculate standard deviation of residuals for confidence interval
  const residualStdDev = Math.sqrt(ssResidual / Math.max(1, n - 1));

  return { lambda, rSquared, residualStdDev };
}

/**
 * Calculate retention projection using exponential decay model
 */
export function calculateRetentionProjection(
  cohorts: CohortData[],
  monthsToProject: number = 6
): ProjectionResult {
  // Need at least 3 cohorts with data
  if (cohorts.length < 3) {
    return {
      data: [],
      confidence: 'low',
      confidenceLabel: 'Dados Insuficientes',
      methodology: 'Mínimo de 3 cohorts necessário',
      projectedM6: null,
      projectedM12: null,
      rSquared: 0,
      lambda: 0,
      trendDescription: 'Dados insuficientes para projeção',
      hasEnoughData: false,
    };
  }

  const aggregated = aggregateRetentionByMonth(cohorts);
  const { lambda, rSquared, residualStdDev } = fitExponentialModel(aggregated);

  // Determine last month with actual data
  let lastActualMonth = 0;
  aggregated.forEach((_, month) => {
    if (month > lastActualMonth) lastActualMonth = month;
  });

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low';
  let confidenceLabel: string;
  
  if (lastActualMonth >= 12 && rSquared > 0.85) {
    confidence = 'high';
    confidenceLabel = 'Alta Confiança';
  } else if (lastActualMonth >= 6 && rSquared > 0.70) {
    confidence = 'medium';
    confidenceLabel = 'Média Confiança';
  } else {
    confidence = 'low';
    confidenceLabel = 'Baixa Confiança';
  }

  // Calculate confidence interval multiplier based on confidence level
  const confidenceMultiplier = confidence === 'high' ? 1.0 : confidence === 'medium' ? 1.5 : 2.0;

  // Generate data points (historical + projection)
  const data: ProjectionDataPoint[] = [];
  const totalMonths = lastActualMonth + monthsToProject + 1;

  for (let month = 0; month < totalMonths; month++) {
    const actualData = aggregated.get(month);
    const projected = Math.max(0, Math.min(100, 100 * Math.exp(-lambda * month)));
    const margin = residualStdDev * confidenceMultiplier * (1 + month * 0.1); // Increase uncertainty over time
    
    data.push({
      month,
      label: `M${month}`,
      actual: actualData ? Math.round(actualData.value * 10) / 10 : null,
      projected: Math.round(projected * 10) / 10,
      optimistic: Math.min(100, Math.round((projected + margin) * 10) / 10),
      pessimistic: Math.max(0, Math.round((projected - margin) * 10) / 10),
      isProjection: month > lastActualMonth,
    });
  }

  // Calculate projected values for M6 and M12
  const projectedM6 = Math.round(100 * Math.exp(-lambda * 6) * 10) / 10;
  const projectedM12 = Math.round(100 * Math.exp(-lambda * 12) * 10) / 10;

  // Determine trend description
  let trendDescription: string;
  const monthlyDecay = (1 - Math.exp(-lambda)) * 100;
  
  if (monthlyDecay < 3) {
    trendDescription = `Excelente retenção: apenas ${monthlyDecay.toFixed(1)}% de perda mensal`;
  } else if (monthlyDecay < 8) {
    trendDescription = `Retenção saudável: ${monthlyDecay.toFixed(1)}% de churn mensal`;
  } else if (monthlyDecay < 15) {
    trendDescription = `Atenção: ${monthlyDecay.toFixed(1)}% de churn mensal`;
  } else {
    trendDescription = `Crítico: ${monthlyDecay.toFixed(1)}% de perda mensal - ação necessária`;
  }

  return {
    data,
    confidence,
    confidenceLabel,
    methodology: `Regressão exponencial (λ = ${lambda.toFixed(4)})`,
    projectedM6,
    projectedM12,
    rSquared: Math.round(rSquared * 100) / 100,
    lambda,
    trendDescription,
    hasEnoughData: true,
  };
}

/**
 * Calculate MRR projection based on retention and average MRR
 */
export function calculateMRRProjection(
  cohorts: CohortData[],
  averageMRR: number,
  totalCustomers: number,
  monthsToProject: number = 6
): MRRProjectionResult {
  if (!averageMRR || averageMRR <= 0 || cohorts.length < 3) {
    return {
      data: [],
      confidence: 'low',
      confidenceLabel: 'Dados Insuficientes',
      projectedM6: null,
      projectedM12: null,
      trendDescription: 'Dados de MRR insuficientes',
      hasEnoughData: false,
    };
  }

  const retentionProjection = calculateRetentionProjection(cohorts, monthsToProject);
  
  if (!retentionProjection.hasEnoughData) {
    return {
      data: [],
      confidence: 'low',
      confidenceLabel: 'Dados Insuficientes',
      projectedM6: null,
      projectedM12: null,
      trendDescription: 'Dados insuficientes para projeção',
      hasEnoughData: false,
    };
  }

  const baseMRR = averageMRR * totalCustomers;
  
  const data: MRRProjectionDataPoint[] = retentionProjection.data.map(point => ({
    month: point.month,
    label: point.label,
    actual: point.actual !== null ? Math.round((point.actual / 100) * baseMRR) : null,
    projected: Math.round((point.projected / 100) * baseMRR),
    optimistic: Math.round((point.optimistic / 100) * baseMRR),
    pessimistic: Math.round((point.pessimistic / 100) * baseMRR),
    isProjection: point.isProjection,
  }));

  return {
    data,
    confidence: retentionProjection.confidence,
    confidenceLabel: retentionProjection.confidenceLabel,
    projectedM6: retentionProjection.projectedM6 !== null 
      ? Math.round((retentionProjection.projectedM6 / 100) * baseMRR) 
      : null,
    projectedM12: retentionProjection.projectedM12 !== null 
      ? Math.round((retentionProjection.projectedM12 / 100) * baseMRR) 
      : null,
    trendDescription: retentionProjection.trendDescription,
    hasEnoughData: true,
  };
}

/**
 * Format currency in Brazilian Real
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
