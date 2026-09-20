import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { CohortContext } from "@/utils/prepareAIContext";

interface RetentionComparisonChartProps {
  context: CohortContext;
  isLoading?: boolean;
}

type ViewMode = "plan" | "channel";

export function RetentionComparisonChart({ context, isLoading = false }: RetentionComparisonChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("plan");

  const hasPlanData = Object.keys(context.byPlan).length > 0;
  const hasChannelData = Object.keys(context.byChannel).length > 0;

  if (isLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasPlanData && !hasChannelData) {
    return null;
  }

  const data = viewMode === "plan" ? context.byPlan : context.byChannel;
  
  const chartData = Object.entries(data).map(([name, segment]) => ({
    name,
    m1: segment.retentionM1,
    m3: segment.retentionM3,
    m6: segment.retentionM6,
  }));

  // Sort by M3 retention descending
  chartData.sort((a, b) => b.m3 - a.m3);

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold text-foreground">
            Retenção por Período (M1, M3, M6)
          </CardTitle>
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="bg-muted/50 p-1 rounded-lg"
          >
            <ToggleGroupItem 
              value="plan" 
              disabled={!hasPlanData}
              className="text-sm data-[state=on]:bg-background data-[state=on]:text-foreground px-4"
            >
              Por Plano
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="channel" 
              disabled={!hasChannelData}
              className="text-sm data-[state=on]:bg-background data-[state=on]:text-foreground px-4"
            >
              Por Canal
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Dados de {viewMode === "plan" ? "plano" : "canal"} não disponíveis
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 100]}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
              />
              <Legend 
                wrapperStyle={{ paddingTop: "20px" }}
                formatter={(value) => <span style={{ color: "hsl(var(--muted-foreground))" }}>{value}</span>}
              />
              <Bar 
                dataKey="m1" 
                name="M1" 
                fill="hsl(187, 92%, 59%)" 
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
              <Bar 
                dataKey="m3" 
                name="M3" 
                fill="hsl(166, 84%, 40%)" 
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
              <Bar 
                dataKey="m6" 
                name="M6" 
                fill="hsl(262, 83%, 58%)" 
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
