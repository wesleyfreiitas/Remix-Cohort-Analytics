import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ProcessedCustomer } from "@/contexts/DataContext";

interface LifetimeDistributionChartProps {
  data: ProcessedCustomer[];
}

interface LifetimeBucket {
  range: string;
  min: number;
  max: number;
  active: number;
  churned: number;
  total: number;
}

function calculateLifetimeMonths(customer: ProcessedCustomer): number {
  const startDate = new Date(customer.startDate);
  const endDate = customer.churnDate ? new Date(customer.churnDate) : new Date();
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44); // Average days per month
  return Math.max(0, diffMonths);
}

function calculateLifetimeDistribution(customers: ProcessedCustomer[]): LifetimeBucket[] {
  const buckets: LifetimeBucket[] = [
    { range: '0-3m', min: 0, max: 3, active: 0, churned: 0, total: 0 },
    { range: '3-6m', min: 3, max: 6, active: 0, churned: 0, total: 0 },
    { range: '6-9m', min: 6, max: 9, active: 0, churned: 0, total: 0 },
    { range: '9-12m', min: 9, max: 12, active: 0, churned: 0, total: 0 },
    { range: '12-18m', min: 12, max: 18, active: 0, churned: 0, total: 0 },
    { range: '18-24m', min: 18, max: 24, active: 0, churned: 0, total: 0 },
    { range: '24m+', min: 24, max: Infinity, active: 0, churned: 0, total: 0 },
  ];

  customers.forEach(customer => {
    const lifetime = calculateLifetimeMonths(customer);
    const bucket = buckets.find(b => lifetime >= b.min && lifetime < b.max);
    if (bucket) {
      if (customer.isActive) {
        bucket.active++;
      } else {
        bucket.churned++;
      }
      bucket.total++;
    }
  });

  return buckets;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: LifetimeBucket;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  
  const data = payload[0].payload;
  const total = data.total;
  const activePercent = total > 0 ? ((data.active / total) * 100).toFixed(1) : '0';
  const churnedPercent = total > 0 ? ((data.churned / total) * 100).toFixed(1) : '0';
  
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl px-3 py-2">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      <p className="text-sm text-gray-400">
        Total: <span className="text-white font-medium">{total}</span> clientes
      </p>
      <div className="mt-1 space-y-0.5">
        <p className="text-sm" style={{ color: '#22d3ee' }}>
          Ativos: {data.active} ({activePercent}%)
        </p>
        <p className="text-sm" style={{ color: '#f87171' }}>
          Churned: {data.churned} ({churnedPercent}%)
        </p>
      </div>
    </div>
  );
}

export function LifetimeDistributionChart({ data }: LifetimeDistributionChartProps) {
  const chartData = useMemo(() => {
    return calculateLifetimeDistribution(data);
  }, [data]);

  const maxValue = useMemo(() => {
    const max = Math.max(...chartData.map(d => d.total), 0);
    return Math.ceil(max * 1.1); // 10% margin
  }, [chartData]);

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Distribuição de Lifetime
        </h3>
        <p className="text-sm text-muted-foreground">
          Tempo de permanência dos clientes por faixa
        </p>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(107, 114, 128, 0.3)" />
            <XAxis 
              dataKey="range" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis 
              domain={[0, maxValue]}
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="active" 
              stackId="a"
              fill="#22d3ee"
              radius={[0, 0, 0, 0]}
              name="Ativos"
              animationDuration={1000}
              animationBegin={0}
            />
            <Bar 
              dataKey="churned" 
              stackId="a"
              fill="#f87171"
              radius={[4, 4, 0, 0]}
              name="Churned"
              animationDuration={1000}
              animationBegin={200}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22d3ee' }} />
          <span className="text-muted-foreground">Ativos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f87171' }} />
          <span className="text-muted-foreground">Churned</span>
        </div>
      </div>
    </div>
  );
}
