import { Calendar, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SeasonalityData } from "@/utils/prepareAIContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface SeasonalityCardProps {
  seasonality: SeasonalityData | null;
  isLoading: boolean;
}

export function SeasonalityCard({ seasonality, isLoading }: SeasonalityCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-700/50">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!seasonality) {
    return (
      <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-700/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-lg">Sazonalidade de Churn</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 text-amber-400/50" />
            <p className="text-sm text-center">
              Dados insuficientes para análise sazonal
              <br />
              <span className="text-xs">(mínimo 12 churns necessários)</span>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate average rate for reference line
  const avgRate = seasonality.byMonth.reduce((sum, m) => sum + m.avgChurnRate, 0) / 12;

  // Custom dot component for colored dots based on risk
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    
    let fill = "hsl(var(--primary))"; // cyan
    if (payload.isHighRisk) fill = "hsl(0, 84%, 60%)"; // red
    if (payload.isLowRisk) fill = "hsl(142, 71%, 45%)"; // green
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={fill}
        stroke="hsl(var(--background))"
        strokeWidth={2}
      />
    );
  };

  return (
    <Card className="bg-gray-900/80 backdrop-blur-xl border-gray-700/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-lg">Sazonalidade de Churn</CardTitle>
          </div>
          {seasonality.hasPattern && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Padrão Detectado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <div className="h-[200px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={seasonality.byMonth} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <XAxis
                dataKey="monthName"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, "auto"]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [`${value}%`, "Taxa de Churn"]}
              />
              <ReferenceLine
                y={avgRate}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="avgChurnRate"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 7, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        <div className="mt-4 space-y-2 text-sm">
          {seasonality.hasPattern ? (
            <>
              {seasonality.highRiskMonths.length > 0 && (
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-muted-foreground">
                    <span className="text-red-400 font-medium">Meses críticos:</span>{" "}
                    {seasonality.highRiskMonths.join(", ")}
                  </p>
                </div>
              )}
              {seasonality.lowRiskMonths.length > 0 && (
                <div className="flex items-start gap-2">
                  <TrendingDown className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                  <p className="text-muted-foreground">
                    <span className="text-green-400 font-medium">Meses favoráveis:</span>{" "}
                    {seasonality.lowRiskMonths.join(", ")}
                  </p>
                </div>
              )}
              <p className="text-muted-foreground mt-2 text-xs">
                Variação de{" "}
                <span className="font-bold text-foreground">{seasonality.variationPercent}%</span>{" "}
                entre pico ({seasonality.peakMonth}) e vale ({seasonality.valleyMonth})
              </p>
            </>
          ) : (
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-400"></span>
              Churn distribuído uniformemente ao longo do ano
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
