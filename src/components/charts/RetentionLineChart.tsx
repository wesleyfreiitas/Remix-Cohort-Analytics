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
import { CohortData } from "@/lib/cohortCalculations";
import { Checkbox } from "@/components/ui/checkbox";

const LINE_COLORS = [
  '#22d3ee', '#14b8a6', '#06b6d4', '#0d9488', '#67e8f9', '#2dd4bf'
];

interface RetentionLineChartProps {
  data: CohortData[];
}

interface RetentionChartData {
  month: string;
  [cohortLabel: string]: number | string;
}

function transformToLineChartData(cohorts: CohortData[]): RetentionChartData[] {
  if (cohorts.length === 0) return [];
  
  const maxMonths = Math.max(...cohorts.map(c => c.retention.length));
  const chartData: RetentionChartData[] = [];
  
  for (let i = 0; i < maxMonths; i++) {
    const dataPoint: RetentionChartData = { month: `M${i}` };
    
    cohorts.forEach(cohort => {
      const retention = cohort.retention.find(r => r.month === i);
      if (retention) {
        dataPoint[cohort.cohortLabel] = retention.percentage;
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
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl px-3 py-2">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(1)}%
        </p>
      ))}
    </div>
  );
}

export function RetentionLineChart({ data }: RetentionLineChartProps) {
  const [visibleCohorts, setVisibleCohorts] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    data.forEach(cohort => {
      initial[cohort.cohortLabel] = true;
    });
    return initial;
  });

  const chartData = useMemo(() => transformToLineChartData(data), [data]);
  
  const toggleCohort = (cohortLabel: string) => {
    setVisibleCohorts(prev => ({
      ...prev,
      [cohortLabel]: !prev[cohortLabel]
    }));
  };

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Curvas de Retenção por Cohort
        </h3>
        <p className="text-sm text-muted-foreground">
          Compare a retenção entre diferentes períodos
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
            <Tooltip content={<CustomTooltip />} />
            {data.map((cohort, index) => (
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
        {data.map((cohort, index) => (
          <label
            key={cohort.cohortKey}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Checkbox
              checked={visibleCohorts[cohort.cohortLabel]}
              onCheckedChange={() => toggleCohort(cohort.cohortLabel)}
              className="border-gray-500"
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
              {cohort.cohortLabel}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
