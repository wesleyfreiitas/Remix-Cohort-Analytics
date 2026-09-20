import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DollarSign } from "lucide-react";
import { ProcessedCustomer } from "@/contexts/DataContext";
import { Checkbox } from "@/components/ui/checkbox";

const LINE_COLORS = [
  '#22d3ee', '#14b8a6', '#06b6d4', '#0d9488', '#67e8f9', '#2dd4bf'
];

interface MRRByCohortChartProps {
  data: ProcessedCustomer[];
}

interface CohortMRRData {
  cohortKey: string;
  cohortLabel: string;
  customers: number;
  mrrEvolution: { month: number; mrr: number }[];
  initialMRR: number;
}

interface ChartDataPoint {
  month: string;
  [cohortLabel: string]: number | string;
}

function getMonthsDifference(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function formatCohortMonth(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

function getCohortKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function calculateMRRByCohort(customers: ProcessedCustomer[]): CohortMRRData[] {
  // 1. Filter customers with valid MRR
  const customersWithMRR = customers.filter(c => c.mrr !== null && c.mrr > 0);
  
  if (customersWithMRR.length === 0) return [];
  
  // 2. Group by cohort (acquisition month)
  const cohortGroups = new Map<string, ProcessedCustomer[]>();
  
  customersWithMRR.forEach(customer => {
    const cohortKey = getCohortKey(new Date(customer.startDate));
    const existing = cohortGroups.get(cohortKey) || [];
    existing.push(customer);
    cohortGroups.set(cohortKey, existing);
  });
  
  const result: CohortMRRData[] = [];
  const now = new Date();
  
  cohortGroups.forEach((cohortCustomers, cohortKey) => {
    const cohortStartDate = new Date(cohortCustomers[0].startDate);
    // Normalize to first of month
    cohortStartDate.setDate(1);
    
    const maxMonths = Math.min(12, getMonthsDifference(cohortStartDate, now));
    
    const mrrEvolution: { month: number; mrr: number }[] = [];
    const initialMRR = cohortCustomers.reduce((sum, c) => sum + (c.mrr || 0), 0);
    
    for (let month = 0; month <= maxMonths; month++) {
      // Calculate target date for this month
      const targetDate = new Date(cohortStartDate);
      targetDate.setMonth(targetDate.getMonth() + month);
      
      // Calculate MRR of customers still active at month M
      const activeMRR = cohortCustomers
        .filter(c => {
          // Customer is active if no churn date or churn after target
          if (!c.churnDate) return true;
          const churnDate = new Date(c.churnDate);
          return churnDate > targetDate;
        })
        .reduce((sum, c) => sum + (c.mrr || 0), 0);
      
      mrrEvolution.push({ 
        month, 
        mrr: Math.round(activeMRR * 100) / 100 
      });
    }
    
    result.push({
      cohortKey,
      cohortLabel: formatCohortMonth(cohortStartDate),
      customers: cohortCustomers.length,
      mrrEvolution,
      initialMRR: Math.round(initialMRR * 100) / 100,
    });
  });
  
  // Sort chronologically and take latest 6 cohorts
  return result
    .sort((a, b) => a.cohortKey.localeCompare(b.cohortKey))
    .slice(-6);
}

function transformToLineChartData(cohortData: CohortMRRData[]): ChartDataPoint[] {
  if (cohortData.length === 0) return [];
  
  const maxMonths = Math.max(...cohortData.map(c => c.mrrEvolution.length));
  const chartData: ChartDataPoint[] = [];
  
  for (let i = 0; i < maxMonths; i++) {
    const dataPoint: ChartDataPoint = { month: `M${i}` };
    
    cohortData.forEach(cohort => {
      const evolution = cohort.mrrEvolution.find(e => e.month === i);
      if (evolution) {
        dataPoint[cohort.cohortLabel] = evolution.mrr;
      }
    });
    
    chartData.push(dataPoint);
  }
  
  return chartData;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
  cohortData?: CohortMRRData[];
}

function CustomTooltip({ active, payload, label, cohortData }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl px-3 py-2">
      <p className="text-muted-foreground font-medium mb-1">{label}</p>
      {payload.map((entry, index) => {
        const cohort = cohortData?.find(c => c.cohortLabel === entry.name);
        const retentionPct = cohort && cohort.initialMRR > 0 
          ? ((entry.value / cohort.initialMRR) * 100).toFixed(1)
          : null;
        
        return (
          <div key={index} className="text-sm" style={{ color: entry.color }}>
            <span>{entry.name}: {formatCurrency(entry.value)}</span>
            {retentionPct && (
              <span className="text-muted-foreground ml-2">
                ({retentionPct}% do M0)
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MRRByCohortChart({ data }: MRRByCohortChartProps) {
  const cohortMRRData = useMemo(() => calculateMRRByCohort(data), [data]);
  
  const [visibleCohorts, setVisibleCohorts] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    cohortMRRData.forEach(cohort => {
      initial[cohort.cohortLabel] = true;
    });
    return initial;
  });

  const chartData = useMemo(() => transformToLineChartData(cohortMRRData), [cohortMRRData]);
  
  const toggleCohort = (cohortLabel: string) => {
    setVisibleCohorts(prev => ({
      ...prev,
      [cohortLabel]: !prev[cohortLabel]
    }));
  };

  // Check if there's valid MRR data
  const hasMRRData = cohortMRRData.length > 0;

  if (!hasMRRData) {
    return (
      <div className="glass-card p-6 animate-fade-in">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            MRR por Cohort
          </h3>
          <p className="text-sm text-muted-foreground">
            Evolução da receita recorrente por mês de aquisição
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 mb-4">
            <DollarSign className="h-8 w-8 text-muted-foreground" />
          </div>
          <h4 className="text-base font-medium text-foreground mb-1">
            Dados de MRR não disponíveis
          </h4>
          <p className="text-sm text-muted-foreground max-w-sm">
            Mapeie a coluna "MRR" para visualizar esta análise
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          MRR por Cohort
        </h3>
        <p className="text-sm text-muted-foreground">
          Evolução da receita recorrente por mês de aquisição
        </p>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(107, 114, 128, 0.3)" />
            <XAxis 
              dataKey="month" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip cohortData={cohortMRRData} />} />
            {cohortMRRData.map((cohort, index) => (
              visibleCohorts[cohort.cohortLabel] && (
                <Line
                  key={cohort.cohortKey}
                  type="monotone"
                  dataKey={cohort.cohortLabel}
                  stroke={LINE_COLORS[index % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4, fill: LINE_COLORS[index % LINE_COLORS.length] }}
                  activeDot={{ r: 6 }}
                  animationDuration={1000}
                  animationBegin={0}
                />
              )
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Interactive Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {cohortMRRData.map((cohort, index) => (
          <label
            key={cohort.cohortKey}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Checkbox
              checked={visibleCohorts[cohort.cohortLabel]}
              onCheckedChange={() => toggleCohort(cohort.cohortLabel)}
              className="border-border"
              style={{ 
                backgroundColor: visibleCohorts[cohort.cohortLabel] 
                  ? LINE_COLORS[index % LINE_COLORS.length] 
                  : 'transparent'
              }}
            />
            <span 
              className="text-sm"
              style={{ color: LINE_COLORS[index % LINE_COLORS.length] }}
            >
              {cohort.cohortLabel} ({formatCurrency(cohort.initialMRR)})
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
