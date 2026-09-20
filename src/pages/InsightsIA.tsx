import { useEffect, useState } from "react";
import { Sparkles, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/MainLayout";
import { useData } from "@/contexts/DataContext";
import { useAIPreload, ActionPlanItem } from "@/contexts/AIPreloadContext";
import {
  HealthScoreCard,
  InsightsCard,
  AlertsCard,
  ChatInterface,
  EmptyInsightsState,
  ActionPlanSection,
  InsightsExportMenu,
} from "@/components/insights";

export default function InsightsIA() {
  const { processedData } = useData();
  const { 
    analysis, 
    cohortContext, 
    isAnalyzing, 
    triggerAnalysis,
    preloadedActionPlan,
    isGeneratingPlan,
    fromCache 
  } = useAIPreload();

  const [actionPlanItems, setActionPlanItems] = useState<ActionPlanItem[]>([]);

  // Initialize action plan from preloaded data
  useEffect(() => {
    if (preloadedActionPlan && preloadedActionPlan.length > 0 && actionPlanItems.length === 0) {
      setActionPlanItems(preloadedActionPlan);
    }
  }, [preloadedActionPlan, actionPlanItems.length]);

  if (!processedData || processedData.length === 0) {
    return (
      <MainLayout>
        <EmptyInsightsState />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">Insights Inteligentes</h1>
              <Badge className="bg-gradient-to-r from-cyan-400 to-teal-400 text-gray-900 border-0">
                <Sparkles className="h-3 w-3 mr-1" />
                Powered by Gemini
              </Badge>
              {fromCache && !isAnalyzing && (
                <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                  <Clock className="h-3 w-3 mr-1" />
                  Cache
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Análise automatizada dos seus dados de cohort
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InsightsExportMenu
              analysis={analysis}
              actions={actionPlanItems}
              disabled={isAnalyzing || !analysis}
            />
            <Button
              onClick={() => triggerAnalysis(true)}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-500 hover:to-teal-500 text-gray-900 font-medium"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? "animate-spin" : ""}`} />
              Analisar Dados
            </Button>
          </div>
        </div>

        {/* Chat compacto no topo */}
        {cohortContext && <ChatInterface cohortContext={cohortContext} />}

        {/* Cards em grid de 3 colunas - full width */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <HealthScoreCard
            score={analysis?.healthScore ?? 0}
            level={analysis?.healthLevel ?? "attention"}
            summary={analysis?.summary ?? ""}
            benchmarkComparison={analysis?.benchmarkComparison ?? ""}
            isLoading={isAnalyzing}
          />

          <InsightsCard
            insights={analysis?.insights ?? []}
            isLoading={isAnalyzing}
          />

          <AlertsCard
            alerts={analysis?.alerts ?? []}
            isLoading={isAnalyzing}
          />
        </div>

        {/* Action Plan Section - Full width below main grid */}
        {cohortContext && (
          <ActionPlanSection
            cohortContext={cohortContext}
            insights={analysis?.insights ?? []}
            actions={actionPlanItems}
            onActionsChange={setActionPlanItems}
            analysisId={null}
            isGenerating={isGeneratingPlan}
          />
        )}
      </div>
    </MainLayout>
  );
}
