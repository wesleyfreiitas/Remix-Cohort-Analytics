import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { CohortData } from "@/lib/cohortCalculations";

interface ChurnBarChartProps {
  data: CohortData[];
}

interface ChurnChartData {
  cohort: string;
  churn: number;
  fill: string;
}

function getChurnColor(churn: number): string {
  if (churn < 10) return '#22d3ee';  // cyan-400
  if (churn < 20) return '#2dd4bf';  // teal-400
  if (churn < 30) return '#facc15';  // yellow-400
  return '#f87171';  // red-400
}

function calculateChurnData(cohorts: CohortData[]): ChurnChartData[] {
  return cohorts.map(cohort => {
    // Pegar o último mês com dados de retenção
    const lastRetention = cohort.retention[cohort.retention.length - 1];
    const churn = lastRetention ? (100 - lastRetention.percentage) : 0;
    
    return {
      cohort: cohort.cohortLabel,
      churn: Math.round(churn * 10) / 10,
      fill: getChurnColor(churn),
    };
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChurnChartData;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  
  const data = payload[0].payload;
  
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl px-3 py-2">
      <p className="text-gray-300 font-medium">{data.cohort}</p>
      <p className="text-sm" style={{ color: data.fill }}>
        Churn acumulado: {data.churn}%
      </p>
    </div>
  );
}

export function ChurnBarChart({ data }: ChurnBarChartProps) {
  const { chartData, maxChurn } = useMemo(() => {
    const processedData = calculateChurnData(data);
    const max = Math.max(...processedData.map(d => d.churn), 0);
    // Arredondar para cima no próximo múltiplo de 5, com margem de 20%
    const maxWithMargin = Math.ceil((max * 1.2) / 5) * 5;
    return { 
      chartData: processedData, 
      maxChurn: Math.max(maxWithMargin, 10) // mínimo de 10% para não ficar muito comprimido
    };
  }, [data]);

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Churn Acumulado por Cohort
        </h3>
        <p className="text-sm text-muted-foreground">
          Percentual total de cancelamentos até o momento
        </p>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(107, 114, 128, 0.3)" />
            <XAxis 
              dataKey="cohort" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              domain={[0, maxChurn]}
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="churn" 
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
              animationBegin={0}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22d3ee' }} />
          <span className="text-muted-foreground">&lt; 10%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#2dd4bf' }} />
          <span className="text-muted-foreground">10-20%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#facc15' }} />
          <span className="text-muted-foreground">20-30%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f87171' }} />
          <span className="text-muted-foreground">&gt; 30%</span>
        </div>
      </div>
    </div>
  );
}
