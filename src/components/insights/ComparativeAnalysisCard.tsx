import { BarChart3, TrendingUp, TrendingDown, Star, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CohortContext, ExtendedSegment } from "@/utils/prepareAIContext";

interface ComparativeAnalysisCardProps {
  context: CohortContext;
  isLoading?: boolean;
}

function RetentionCell({ value }: { value: number }) {
  const getColor = (v: number) => {
    if (v >= 80) return "bg-emerald-500/20 text-emerald-400";
    if (v >= 60) return "bg-cyan-500/20 text-cyan-400";
    if (v >= 40) return "bg-amber-500/20 text-amber-400";
    return "bg-red-500/20 text-red-400";
  };

  return (
    <span className={`inline-flex px-2 py-1 rounded-md font-medium text-sm ${getColor(value)}`}>
      {value.toFixed(1)}%
    </span>
  );
}

function SegmentTable({ 
  data, 
  type 
}: { 
  data: Record<string, ExtendedSegment>; 
  type: 'plan' | 'channel' 
}) {
  const entries = Object.entries(data);
  
  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Dados de {type === 'plan' ? 'plano' : 'canal'} não disponíveis ou insuficientes
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/50 hover:bg-transparent">
          <TableHead className="text-muted-foreground">{type === 'plan' ? 'Plano' : 'Canal'}</TableHead>
          <TableHead className="text-muted-foreground text-center">Clientes</TableHead>
          <TableHead className="text-muted-foreground text-center">M1</TableHead>
          <TableHead className="text-muted-foreground text-center">M3</TableHead>
          <TableHead className="text-muted-foreground text-center">M6</TableHead>
          <TableHead className="text-muted-foreground text-right">MRR Médio</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map(([name, segment]) => (
          <TableRow key={name} className="border-border/30 hover:bg-muted/10">
            <TableCell className="font-medium text-foreground">{name}</TableCell>
            <TableCell className="text-center text-muted-foreground">{segment.count}</TableCell>
            <TableCell className="text-center"><RetentionCell value={segment.retentionM1} /></TableCell>
            <TableCell className="text-center"><RetentionCell value={segment.retentionM3} /></TableCell>
            <TableCell className="text-center"><RetentionCell value={segment.retentionM6} /></TableCell>
            <TableCell className="text-right text-foreground">
              {segment.avgMRR ? `R$ ${segment.avgMRR.toLocaleString('pt-BR')}` : '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CrossAnalysisTable({ context }: { context: CohortContext }) {
  const { crossAnalysis } = context;
  
  if (!crossAnalysis || crossAnalysis.segments.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>Análise cruzada requer dados de plano E canal de aquisição.</p>
        <p className="text-sm mt-2">Mapeie ambos os campos para visualizar esta análise.</p>
      </div>
    );
  }

  const isBest = (plan: string, channel: string) => 
    crossAnalysis.bestCombination?.plan === plan && crossAnalysis.bestCombination?.channel === channel;
  
  const isWorst = (plan: string, channel: string) => 
    crossAnalysis.worstCombination?.plan === plan && crossAnalysis.worstCombination?.channel === channel;

  return (
    <div className="space-y-4">
      {/* Best/Worst Summary */}
      <div className="flex flex-wrap gap-3">
        {crossAnalysis.bestCombination && (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1">
            <Star className="h-3 w-3 mr-1.5" />
            Melhor: {crossAnalysis.bestCombination.plan} + {crossAnalysis.bestCombination.channel} ({crossAnalysis.bestCombination.retention.toFixed(1)}%)
          </Badge>
        )}
        {crossAnalysis.worstCombination && (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1">
            <AlertTriangle className="h-3 w-3 mr-1.5" />
            Atenção: {crossAnalysis.worstCombination.plan} + {crossAnalysis.worstCombination.channel} ({crossAnalysis.worstCombination.retention.toFixed(1)}%)
          </Badge>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-muted-foreground">Plano</TableHead>
            <TableHead className="text-muted-foreground">Canal</TableHead>
            <TableHead className="text-muted-foreground text-center">Clientes</TableHead>
            <TableHead className="text-muted-foreground text-center">Retenção M3</TableHead>
            <TableHead className="text-muted-foreground text-right">MRR Médio</TableHead>
            <TableHead className="text-muted-foreground text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {crossAnalysis.segments.map((segment, idx) => (
            <TableRow 
              key={`${segment.plan}-${segment.channel}`} 
              className={`border-border/30 hover:bg-muted/10 ${
                isBest(segment.plan, segment.channel) ? 'bg-emerald-500/5' : 
                isWorst(segment.plan, segment.channel) ? 'bg-red-500/5' : ''
              }`}
            >
              <TableCell className="font-medium text-foreground">{segment.plan}</TableCell>
              <TableCell className="text-foreground">{segment.channel}</TableCell>
              <TableCell className="text-center text-muted-foreground">{segment.count}</TableCell>
              <TableCell className="text-center"><RetentionCell value={segment.retentionM3} /></TableCell>
              <TableCell className="text-right text-foreground">
                {segment.avgMRR ? `R$ ${segment.avgMRR.toLocaleString('pt-BR')}` : '-'}
              </TableCell>
              <TableCell className="text-right">
                {isBest(segment.plan, segment.channel) && (
                  <TrendingUp className="h-4 w-4 text-emerald-400 inline" />
                )}
                {isWorst(segment.plan, segment.channel) && (
                  <TrendingDown className="h-4 w-4 text-red-400 inline" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ComparativeAnalysisCard({ context, isLoading = false }: ComparativeAnalysisCardProps) {
  const hasPlanData = Object.keys(context.byPlan).length > 0;
  const hasChannelData = Object.keys(context.byChannel).length > 0;
  const hasCrossData = context.crossAnalysis && context.crossAnalysis.segments.length > 0;

  if (isLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasPlanData && !hasChannelData) {
    return (
      <Card className="bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            Análise Comparativa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <p>Mapeie os campos de Plano e/ou Canal de Aquisição para visualizar a análise comparativa.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const defaultTab = hasPlanData ? "byPlan" : hasChannelData ? "byChannel" : "cross";

  return (
    <Card className="bg-card/80 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <BarChart3 className="h-5 w-5 text-cyan-400" />
          Análise Comparativa de Retenção
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger value="byPlan" disabled={!hasPlanData}>Por Plano</TabsTrigger>
            <TabsTrigger value="byChannel" disabled={!hasChannelData}>Por Canal</TabsTrigger>
            <TabsTrigger value="cross" disabled={!hasCrossData}>Plano × Canal</TabsTrigger>
          </TabsList>
          
          <TabsContent value="byPlan" className="mt-4">
            <SegmentTable data={context.byPlan} type="plan" />
          </TabsContent>
          
          <TabsContent value="byChannel" className="mt-4">
            <SegmentTable data={context.byChannel} type="channel" />
          </TabsContent>
          
          <TabsContent value="cross" className="mt-4">
            <CrossAnalysisTable context={context} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
