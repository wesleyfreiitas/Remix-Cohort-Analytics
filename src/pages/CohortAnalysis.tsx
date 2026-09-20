import { useRef, useMemo, useState, useCallback } from 'react';
import { Image, Download, Users, UserCheck, TrendingUp, Clock, Save, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toPng } from 'html-to-image';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { CohortTable } from '@/components/cohort/CohortTable';
import { RevenueCohortTable } from '@/components/cohort/RevenueCohortTable';
import { EmptyState } from '@/components/cohort/EmptyState';
import { RetentionLineChart } from '@/components/charts/RetentionLineChart';
import { ChurnBarChart } from '@/components/charts/ChurnBarChart';
import { LifetimeDistributionChart } from '@/components/charts/LifetimeDistributionChart';
import { RetentionByPlanChart } from '@/components/charts/RetentionByPlanChart';
import { MRRByCohortChart } from '@/components/charts/MRRByCohortChart';
import { RetentionComparisonChart } from '@/components/charts/RetentionComparisonChart';
import { ProjectionChart } from '@/components/charts/ProjectionChart';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { AdvancedMetrics } from '@/components/dashboard/AdvancedMetrics';
import { FilterPanel, FilterState } from '@/components/dashboard/FilterPanel';
import { ExportMenu } from '@/components/dashboard/ExportMenu';
import { SaveAnalysisModal } from '@/components/dashboard/SaveAnalysisModal';
import { ComparativeAnalysisCard, SeasonalityCard } from '@/components/insights';
import { useData, ProcessedCustomer } from '@/contexts/DataContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useAnalyses } from '@/hooks/useAnalyses';
import { useActionPlans } from '@/hooks/useActionPlans';
import { useAuth } from '@/hooks/useAuth';
import { calculateCohortData, exportToCsv } from '@/lib/cohortCalculations';
import { calculateRevenueCohortData } from '@/lib/revenueCohortCalculations';
import { calculateAllMetrics, AdvancedMetrics as AdvancedMetricsType } from '@/lib/metricsCalculations';
import { prepareContextForAI } from '@/utils/prepareAIContext';
import { toast } from 'sonner';

const initialFilters: FilterState = {
  planTypes: [],
  channels: [],
  startDate: null,
  endDate: null,
};

const emptyMetrics: AdvancedMetricsType = {
  retentionM1: 0,
  retentionM3: 0,
  retentionM6: 0,
  retentionM12: 0,
  avgMonthlyChurn: 0,
  bestCohort: null,
  worstCohort: null,
  avgLifetimeMonths: 0,
  estimatedLTV: null,
  earliestCohort: '-',
  activePercentage: 0,
  totalCustomers: 0,
  activeCustomers: 0,
};

export default function CohortAnalysis() {
  const { processedData, columnMapping, analysisName, setCurrentAnalysisId, setAnalysisName } = useData();
  const { businessSettings, setDetectedValues } = useUserSettings();
  const { saveAnalysis, isSaving } = useAnalyses();
  const { actionPlans, linkActionsToAnalysis, isLinking } = useActionPlans();
  const { user } = useAuth();
  
  const tableRef = useRef<HTMLDivElement>(null);
  const [monthsLimit, setMonthsLimit] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Get available filter options from data
  const availablePlanTypes = useMemo(() => {
    if (!processedData) return [];
    const types = new Set<string>();
    processedData.forEach(c => {
      if (c.planType) types.add(c.planType);
    });
    return Array.from(types).sort();
  }, [processedData]);

  const availableChannels = useMemo(() => {
    if (!processedData) return [];
    const channels = new Set<string>();
    processedData.forEach(c => {
      if (c.acquisitionChannel) channels.add(c.acquisitionChannel);
    });
    return Array.from(channels).sort();
  }, [processedData]);

  // Apply filters to data
  const filteredData = useMemo(() => {
    if (!processedData) return null;

    return processedData.filter((customer: ProcessedCustomer) => {
      // Filter by plan type
      if (filters.planTypes.length > 0 && customer.planType) {
        if (!filters.planTypes.includes(customer.planType)) return false;
      }

      // Filter by acquisition channel
      if (filters.channels.length > 0 && customer.acquisitionChannel) {
        if (!filters.channels.includes(customer.acquisitionChannel)) return false;
      }

      // Filter by date range
      if (filters.startDate && customer.startDate < filters.startDate) return false;
      if (filters.endDate && customer.startDate > filters.endDate) return false;

      return true;
    });
  }, [processedData, filters]);

  // Calculate cohort data from filtered data
  const cohortData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    return calculateCohortData(filteredData);
  }, [filteredData]);

  // Calculate revenue cohort data from filtered data
  const revenueCohortData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    return calculateRevenueCohortData(filteredData);
  }, [filteredData]);

  // Calculate all metrics
  const metrics = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return emptyMetrics;
    return calculateAllMetrics(filteredData, cohortData);
  }, [filteredData, cohortData]);

  // Calculate cohort context for comparative analysis
  const cohortContext = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;
    const context = prepareContextForAI(filteredData, businessSettings);
    
    // Update detected values for Settings page display
    setDetectedValues(
      context.dataQualityReport.businessContext.industry,
      context.dataQualityReport.businessContext.averageContractValue
    );
    
    return context;
  }, [filteredData, businessSettings, setDetectedValues]);

  const hasData = filteredData && filteredData.length > 0;

  const handleApplyFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const handleSaveAnalysis = async (name: string, description?: string, linkActionPlan?: boolean) => {
    if (!processedData) return;
    
    const analysisId = await saveAnalysis({
      name,
      description,
      fileName: undefined,
      columnMapping,
      customers: processedData,
    });
    
    // Link orphan action plans to this analysis if requested
    if (linkActionPlan && analysisId && actionPlans.length > 0) {
      await linkActionsToAnalysis({ analysisId });
      toast.success(`Análise salva com ${actionPlans.length} ações vinculadas!`);
    }
    
    // Update context with the saved analysis
    if (analysisId) {
      setCurrentAnalysisId(analysisId);
      setAnalysisName(name);
    }
  };
  
  const handleExportPng = async () => {
    if (!tableRef.current) return;
    
    try {
      const dataUrl = await toPng(tableRef.current, {
        backgroundColor: '#111827',
        pixelRatio: 2,
      });
      
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.download = `cohort-analysis-${date}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('Imagem exportada com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PNG:', error);
      toast.error('Erro ao exportar imagem');
    }
  };
  
  const handleExportCsv = () => {
    if (cohortData.length === 0) return;
    
    try {
      const csvContent = exportToCsv(cohortData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.download = `cohort-analysis-${date}.csv`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar CSV');
    }
  };

  // Format LTV for display
  const formattedLTV = metrics.estimatedLTV
    ? `LTV estimado: R$ ${metrics.estimatedLTV.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : undefined;
  
  return (
    <MainLayout>
      <div className="space-y-8 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gradient">Análise de Cohort</h1>
              {analysisName && (
                <span className="px-3 py-1 text-sm rounded-full bg-primary/20 text-primary">
                  {analysisName}
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              Visualize a retenção dos seus clientes ao longo do tempo
            </p>
          </div>
          
          {hasData && (
            <div className="flex items-center gap-3 flex-wrap">
              <Select 
                value={monthsLimit?.toString() ?? 'all'} 
                onValueChange={(v) => setMonthsLimit(v === 'all' ? null : Number(v))}
              >
                <SelectTrigger className="w-[160px] border-border bg-background/50 text-foreground">
                  <SelectValue placeholder="Meses" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem value="6">Últimos 6 meses</SelectItem>
                  <SelectItem value="12">Últimos 12 meses</SelectItem>
                  <SelectItem value="24">Últimos 24 meses</SelectItem>
                  <SelectItem value="all">Todos os meses</SelectItem>
                </SelectContent>
              </Select>

              {user && (
                <Button
                  variant="outline"
                  onClick={() => setShowSaveModal(true)}
                  className="border-primary/50 text-primary hover:bg-primary/10"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              )}

              <ExportMenu 
                cohorts={cohortData} 
                metrics={metrics}
              />

              <Button
                variant="outline"
                onClick={handleExportPng}
                className="border-border text-primary hover:bg-muted"
              >
                <Image className="h-4 w-4 mr-2" />
                PNG
              </Button>
              <Button
                variant="outline"
                onClick={handleExportCsv}
                className="border-border text-primary hover:bg-muted"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          )}
        </div>
        
        {/* Content */}
        {hasData ? (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-fade-in">
              <MetricCard
                title="Total de Clientes"
                value={metrics.totalCustomers.toLocaleString("pt-BR")}
                subtitle={`desde ${metrics.earliestCohort}`}
                icon={<Users className="h-6 w-6" />}
                largeValue
              />
              <MetricCard
                title="Clientes Ativos"
                value={metrics.activeCustomers.toLocaleString("pt-BR")}
                subtitle="Ativos no período"
                icon={<UserCheck className="h-6 w-6" />}
                badge={{
                  text: `${metrics.activePercentage}% do total`,
                  variant: metrics.activePercentage > 50 ? "success" : "warning"
                }}
                largeValue
              />
              <MetricCard
                title="Retenção Média M3"
                value={`${metrics.retentionM3}%`}
                subtitle="vs período anterior"
                icon={<TrendingUp className="h-6 w-6" />}
                trend={metrics.retentionM3 > 0 ? { 
                  value: 2.5, 
                  isPositive: metrics.retentionM3 >= 70 
                } : undefined}
                largeValue
              />
              <MetricCard
                title="Tempo Médio de Vida"
                value={`${metrics.avgLifetimeMonths} meses`}
                subtitle="Meses"
                secondarySubtitle={formattedLTV}
                icon={<Clock className="h-6 w-6" />}
                largeValue
              />
            </div>

            {/* Advanced Metrics */}
            <AdvancedMetrics metrics={metrics} />

            {/* Filter Panel */}
            <FilterPanel
              availablePlanTypes={availablePlanTypes}
              availableChannels={availableChannels}
              filters={filters}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
            />

            {/* Tabela com scroll próprio - isolada com Tabs */}
            <div className="w-full overflow-hidden">
              <Tabs defaultValue="customers" className="w-full">
                <TabsList className="mb-4 bg-gray-800/50 border border-gray-700/50">
                  <TabsTrigger value="customers" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                    <Users className="h-4 w-4 mr-2" />
                    Clientes
                  </TabsTrigger>
                  <TabsTrigger value="revenue" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Receita
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="customers">
                  <CohortTable ref={tableRef} data={cohortData} monthsLimit={monthsLimit} />
                </TabsContent>
                <TabsContent value="revenue">
                  <RevenueCohortTable data={revenueCohortData} monthsLimit={monthsLimit} />
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Gráfico de Projeções */}
            <div className="w-full animate-fade-in">
              <ProjectionChart 
                cohortData={cohortData} 
                metrics={metrics}
                hasRevenueData={!!metrics.estimatedLTV}
              />
            </div>

            {/* Gráficos - respeitam largura do viewport */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in w-full">
              <div className="min-w-0">
                <RetentionLineChart data={cohortData} />
              </div>
              <div className="min-w-0">
                <ChurnBarChart data={cohortData} />
              </div>
            </div>

            {/* Análise Comparativa por Segmento */}
            {cohortContext && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full animate-fade-in">
                <ComparativeAnalysisCard context={cohortContext} isLoading={false} />
                <RetentionComparisonChart context={cohortContext} isLoading={false} />
              </div>
            )}

            {/* Análise de Sazonalidade */}
            {cohortContext?.seasonality && (
              <div className="w-full animate-fade-in">
                <SeasonalityCard seasonality={cohortContext.seasonality} isLoading={false} />
              </div>
            )}

            {/* Gráfico de Distribuição de Lifetime - full width */}
            <div className="w-full animate-fade-in">
              <LifetimeDistributionChart data={filteredData} />
            </div>

            {/* Gráfico de Retenção por Plano - full width */}
            <div className="w-full animate-fade-in">
              <RetentionByPlanChart data={filteredData} />
            </div>

            {/* Gráfico de MRR por Cohort - full width */}
            <div className="w-full animate-fade-in">
              <MRRByCohortChart data={filteredData} />
            </div>
          </>
        ) : (
          <EmptyState />
        )}

        {/* Save Analysis Modal */}
        <SaveAnalysisModal
          open={showSaveModal}
          onOpenChange={setShowSaveModal}
          onSave={handleSaveAnalysis}
          isSaving={isSaving || isLinking}
          hasActionPlan={actionPlans.length > 0}
          actionPlanCount={actionPlans.length}
        />
      </div>
    </MainLayout>
  );
}
