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
import { BarChart3 } from "lucide-react";
import { ProcessedCustomer } from "@/contexts/DataContext";
import { Checkbox } from "@/components/ui/checkbox";

const LINE_COLORS = [
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#ec4899', // pink-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
];

interface RetentionByPlanChartProps {
  data: ProcessedCustomer[];
}

interface PlanRetentionData {
  planType: string;
  customers: number;
  retention: { month: number; percentage: number }[];
}

interface ChartDataPoint {
  month: string;
  [planType: string]: number | string;
}

function getMonthsDifference(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function calculateRetentionByPlan(customers: ProcessedCustomer[]): PlanRetentionData[] {
  // Group customers by plan type
  const planGroups = new Map<string, ProcessedCustomer[]>();
  
  customers.forEach(customer => {
    const planType = customer.planType || 'Sem Plano';
    const existing = planGroups.get(planType) || [];
    existing.push(customer);
    planGroups.set(planType, existing);
  });
  
  const result: PlanRetentionData[] = [];
  const now = new Date();
  const maxMonths = 12;
  
  planGroups.forEach((planCustomers, planType) => {
    const retentionCurve: { month: number; percentage: number }[] = [];
    
    for (let month = 0; month <= maxMonths; month++) {
      // Eligible customers = those with at least 'month' months since startDate
      const eligibleCustomers = planCustomers.filter(c => {
        const monthsFromStart = getMonthsDifference(new Date(c.startDate), now);
        return monthsFromStart >= month;
      });
      
      if (eligibleCustomers.length === 0) break;
      
      // Retained customers = those still active at month 'month'
      const retainedCustomers = eligibleCustomers.filter(c => {
        if (!c.churnDate) return true;
        const monthsUntilChurn = getMonthsDifference(new Date(c.startDate), new Date(c.churnDate));
        return monthsUntilChurn >= month;
      });
      
      const percentage = (retainedCustomers.length / eligibleCustomers.length) * 100;
      retentionCurve.push({ month, percentage: Math.round(percentage * 10) / 10 });
    }
    
    if (retentionCurve.length > 0) {
      result.push({
        planType,
        customers: planCustomers.length,
        retention: retentionCurve,
      });
    }
  });
  
  // Sort by number of customers (largest first)
  return result.sort((a, b) => b.customers - a.customers);
}

function transformToLineChartData(planData: PlanRetentionData[]): ChartDataPoint[] {
  if (planData.length === 0) return [];
  
  const maxMonths = Math.max(...planData.map(p => p.retention.length));
  const chartData: ChartDataPoint[] = [];
  
  for (let i = 0; i < maxMonths; i++) {
    const dataPoint: ChartDataPoint = { month: `M${i}` };
    
    planData.forEach(plan => {
      const retention = plan.retention.find(r => r.month === i);
      if (retention) {
        dataPoint[plan.planType] = retention.percentage;
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
  planData?: PlanRetentionData[];
}

function CustomTooltip({ active, payload, label, planData }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="bg-popover border border-border rounded-lg shadow-xl px-3 py-2">
      <p className="text-muted-foreground font-medium mb-1">{label}</p>
      {payload.map((entry, index) => {
        const plan = planData?.find(p => p.planType === entry.name);
        return (
          <div key={index} className="text-sm" style={{ color: entry.color }}>
            <span>{entry.name}: {entry.value.toFixed(1)}%</span>
            {plan && (
              <span className="text-muted-foreground ml-2">({plan.customers} clientes)</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RetentionByPlanChart({ data }: RetentionByPlanChartProps) {
  const planRetentionData = useMemo(() => calculateRetentionByPlan(data), [data]);
  
  const [visiblePlans, setVisiblePlans] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    planRetentionData.forEach(plan => {
      initial[plan.planType] = true;
    });
    return initial;
  });

  const chartData = useMemo(() => transformToLineChartData(planRetentionData), [planRetentionData]);
  
  const togglePlan = (planType: string) => {
    setVisiblePlans(prev => ({
      ...prev,
      [planType]: !prev[planType]
    }));
  };

  // Check if there's meaningful plan data (not just "Sem Plano")
  const hasValidPlanData = planRetentionData.length > 0 && 
    !(planRetentionData.length === 1 && planRetentionData[0].planType === 'Sem Plano');

  if (!hasValidPlanData) {
    return (
      <div className="glass-card p-6 animate-fade-in">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Retenção por Tipo de Plano
          </h3>
          <p className="text-sm text-muted-foreground">
            Compare a retenção entre diferentes planos
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 mb-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h4 className="text-base font-medium text-foreground mb-1">
            Dados de plano não disponíveis
          </h4>
          <p className="text-sm text-muted-foreground max-w-sm">
            Mapeie a coluna "Tipo de Plano" para visualizar esta análise
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Retenção por Tipo de Plano
        </h3>
        <p className="text-sm text-muted-foreground">
          Compare a retenção entre diferentes planos
        </p>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(107, 114, 128, 0.3)" />
            <XAxis 
              dataKey="month" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis 
              domain={[0, 100]}
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip planData={planRetentionData} />} />
            {planRetentionData.map((plan, index) => (
              visiblePlans[plan.planType] && (
                <Line
                  key={plan.planType}
                  type="monotone"
                  dataKey={plan.planType}
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
        {planRetentionData.map((plan, index) => (
          <label
            key={plan.planType}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Checkbox
              checked={visiblePlans[plan.planType]}
              onCheckedChange={() => togglePlan(plan.planType)}
              className="border-border"
              style={{ 
                backgroundColor: visiblePlans[plan.planType] 
                  ? LINE_COLORS[index % LINE_COLORS.length] 
                  : 'transparent'
              }}
            />
            <span 
              className="text-sm"
              style={{ color: LINE_COLORS[index % LINE_COLORS.length] }}
            >
              {plan.planType} ({plan.customers})
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
