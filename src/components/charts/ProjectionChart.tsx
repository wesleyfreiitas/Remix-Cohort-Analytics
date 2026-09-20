import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CohortData } from '@/lib/cohortCalculations';
import { AdvancedMetrics } from '@/lib/metricsCalculations';
import {
  calculateRetentionProjection,
  calculateMRRProjection,
  formatBRL,
  ProjectionDataPoint,
  MRRProjectionDataPoint,
} from '@/lib/projectionCalculations';

interface ProjectionChartProps {
  cohortData: CohortData[];
  metrics: AdvancedMetrics;
  hasRevenueData: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    dataKey: string;
    payload: ProjectionDataPoint | MRRProjectionDataPoint;
  }>;
  label?: string;
  isMRR?: boolean;
}

function CustomTooltip({ active, payload, label, isMRR = false }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const formatValue = (val: number) => {
    if (isMRR) return formatBRL(val);
    return `${val.toFixed(1)}%`;
  };

  return (
    <div className="bg-background/95 backdrop-blur border border-border rounded-lg shadow-xl px-4 py-3 min-w-[180px]">
      <p className="text-foreground font-semibold mb-2 flex items-center gap-2">
        {label}
        {data.isProjection && (
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
            Projeção
          </Badge>
        )}
      </p>
      {data.actual !== null && (
        <p className="text-sm text-muted-foreground">
          Real: <span className="text-cyan-400 font-medium">{formatValue(data.actual)}</span>
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Projetado: <span className="text-primary font-medium">{formatValue(data.projected)}</span>
      </p>
      {data.isProjection && (
        <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
          <p>Otimista: <span className="text-emerald-400">{formatValue(data.optimistic)}</span></p>
          <p>Pessimista: <span className="text-amber-400">{formatValue(data.pessimistic)}</span></p>
        </div>
      )}
    </div>
  );
}

function ConfidenceBadge({ confidence, label }: { confidence: 'high' | 'medium' | 'low'; label: string }) {
  const config = {
    high: { icon: CheckCircle2, className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    medium: { icon: Info, className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    low: { icon: AlertTriangle, className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  };

  const { icon: Icon, className } = config[confidence];

  return (
    <Badge variant="outline" className={`${className} gap-1`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function NoDataMessage({ message }: { message: string }) {
  return (
    <div className="h-[300px] flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500/50" />
        <p className="font-medium">{message}</p>
        <p className="text-sm mt-1">Importe mais dados de cohort para habilitar projeções</p>
      </div>
    </div>
  );
}

export function ProjectionChart({ cohortData, metrics, hasRevenueData }: ProjectionChartProps) {
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true);

  const retentionProjection = useMemo(
    () => calculateRetentionProjection(cohortData, 6),
    [cohortData]
  );

  const mrrProjection = useMemo(() => {
    if (!hasRevenueData || !metrics.estimatedLTV) return null;
    const avgMRR = metrics.estimatedLTV / Math.max(1, metrics.avgLifetimeMonths);
    return calculateMRRProjection(cohortData, avgMRR, metrics.totalCustomers, 6);
  }, [cohortData, hasRevenueData, metrics]);

  const lastActualMonth = useMemo(() => {
    const lastActual = retentionProjection.data.findIndex(d => d.isProjection);
    return lastActual > 0 ? lastActual - 1 : retentionProjection.data.length - 1;
  }, [retentionProjection.data]);

  if (!retentionProjection.hasEnoughData) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="h-5 w-5 text-primary" />
                Projeção de Retenção
              </CardTitle>
              <CardDescription>Previsão baseada em tendências históricas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <NoDataMessage message={retentionProjection.trendDescription} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              Projeção de Métricas
            </CardTitle>
            <CardDescription>
              Previsão para os próximos 6 meses baseada em {cohortData.length} cohorts
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <ConfidenceBadge 
              confidence={retentionProjection.confidence} 
              label={retentionProjection.confidenceLabel} 
            />
            <div className="flex items-center gap-2">
              <Switch
                id="confidence-toggle"
                checked={showConfidenceInterval}
                onCheckedChange={setShowConfidenceInterval}
              />
              <Label htmlFor="confidence-toggle" className="text-sm text-muted-foreground">
                Intervalo
              </Label>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="retention" className="w-full">
          {hasRevenueData && mrrProjection?.hasEnoughData && (
            <TabsList className="mb-4 bg-muted/30">
              <TabsTrigger value="retention" className="data-[state=active]:bg-primary/20">
                Retenção
              </TabsTrigger>
              <TabsTrigger value="mrr" className="data-[state=active]:bg-primary/20">
                Receita (MRR)
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="retention">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={retentionProjection.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip isMRR={false} />} />
                  
                  {/* Reference line for "today" */}
                  <ReferenceLine
                    x={`M${lastActualMonth}`}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    label={{
                      value: 'Hoje',
                      position: 'top',
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 11,
                    }}
                  />

                  {/* Confidence interval area (only for projections) */}
                  {showConfidenceInterval && (
                    <Area
                      type="monotone"
                      dataKey="optimistic"
                      stroke="none"
                      fill="url(#confidenceGradient)"
                      animationDuration={1000}
                    />
                  )}
                  {showConfidenceInterval && (
                    <Area
                      type="monotone"
                      dataKey="pessimistic"
                      stroke="none"
                      fill="hsl(var(--background))"
                      animationDuration={1000}
                    />
                  )}

                  {/* Actual data line */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#22d3ee' }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                    animationDuration={1000}
                  />

                  {/* Projected line */}
                  <Line
                    type="monotone"
                    dataKey="projected"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if (!payload.isProjection) return <circle cx={cx} cy={cy} r={0} />;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="hsl(var(--primary))"
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 6 }}
                    animationDuration={1000}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Metrics summary */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-muted/20 rounded-lg p-4 border border-border/50">
                <p className="text-sm text-muted-foreground">Projeção M6</p>
                <p className="text-2xl font-bold text-primary">
                  {retentionProjection.projectedM6?.toFixed(1)}%
                </p>
              </div>
              <div className="bg-muted/20 rounded-lg p-4 border border-border/50">
                <p className="text-sm text-muted-foreground">Projeção M12</p>
                <p className="text-2xl font-bold text-primary">
                  {retentionProjection.projectedM12?.toFixed(1)}%
                </p>
              </div>
              <div className="bg-muted/20 rounded-lg p-4 border border-border/50">
                <p className="text-sm text-muted-foreground">R² do Modelo</p>
                <p className="text-2xl font-bold text-foreground">
                  {(retentionProjection.rSquared * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground text-center">
              {retentionProjection.trendDescription}
            </p>
          </TabsContent>

          {hasRevenueData && mrrProjection?.hasEnoughData && (
            <TabsContent value="mrr">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={mrrProjection.data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mrrConfidenceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(value) => formatBRL(value)}
                    />
                    <Tooltip content={<CustomTooltip isMRR={true} />} />

                    <ReferenceLine
                      x={`M${lastActualMonth}`}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="3 3"
                      label={{
                        value: 'Hoje',
                        position: 'top',
                        fill: 'hsl(var(--muted-foreground))',
                        fontSize: 11,
                      }}
                    />

                    {showConfidenceInterval && (
                      <Area
                        type="monotone"
                        dataKey="optimistic"
                        stroke="none"
                        fill="url(#mrrConfidenceGradient)"
                        animationDuration={1000}
                      />
                    )}
                    {showConfidenceInterval && (
                      <Area
                        type="monotone"
                        dataKey="pessimistic"
                        stroke="none"
                        fill="hsl(var(--background))"
                        animationDuration={1000}
                      />
                    )}

                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#22d3ee"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#22d3ee' }}
                      connectNulls={false}
                      animationDuration={1000}
                    />

                    <Line
                      type="monotone"
                      dataKey="projected"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        if (!payload.isProjection) return <circle cx={cx} cy={cy} r={0} />;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill="#10b981"
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        );
                      }}
                      animationDuration={1000}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-muted/20 rounded-lg p-4 border border-border/50">
                  <p className="text-sm text-muted-foreground">MRR Projetado M6</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {mrrProjection.projectedM6 !== null ? formatBRL(mrrProjection.projectedM6) : '-'}
                  </p>
                </div>
                <div className="bg-muted/20 rounded-lg p-4 border border-border/50">
                  <p className="text-sm text-muted-foreground">MRR Projetado M12</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {mrrProjection.projectedM12 !== null ? formatBRL(mrrProjection.projectedM12) : '-'}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground text-center">
                {mrrProjection.trendDescription}
              </p>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
