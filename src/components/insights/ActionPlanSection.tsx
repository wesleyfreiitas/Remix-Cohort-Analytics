import { useState, useMemo, useCallback, useEffect } from "react";
import { Target, ChevronDown, RefreshCw, FileText, Copy, Cloud, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ActionCard, ActionPlanItem } from "./ActionCard";
import { CohortContext } from "@/utils/prepareAIContext";
import { exportActionPlanAsPdf, copyActionPlanAsText } from "@/lib/exportUtils";
import { useActionPlans } from "@/hooks/useActionPlans";
import { useAuth } from "@/hooks/useAuth";

interface ActionPlanSectionProps {
  cohortContext: CohortContext | null;
  insights: Array<{ type: string; text: string }>;
  actions: ActionPlanItem[];
  onActionsChange: (actions: ActionPlanItem[]) => void;
  analysisId?: string | null;
  isGenerating?: boolean;
}

type FilterType = 'all' | 'high' | 'in_progress' | 'completed';

const filters = [
  { value: 'all' as const, label: 'Todas' },
  { value: 'high' as const, label: 'Alta Prioridade' },
  { value: 'in_progress' as const, label: 'Em Andamento' },
  { value: 'completed' as const, label: 'Concluídas' }
];

export function ActionPlanSection({ cohortContext, insights, actions, onActionsChange, analysisId, isGenerating: externalIsGenerating }: ActionPlanSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [hasLoadedFromDb, setHasLoadedFromDb] = useState(false);
  
  const isGenerating = externalIsGenerating || isGeneratingLocal;

  const {
    actionPlans: dbActionPlans,
    isLoading: isLoadingDb,
    bulkSaveActionPlans,
    updateActionPlan,
    archiveActionPlan,
    isSaving,
  } = useActionPlans(analysisId || undefined);

  // Load actions from database on mount (only once)
  useEffect(() => {
    if (!hasLoadedFromDb && !isLoadingDb && dbActionPlans.length > 0 && actions.length === 0) {
      onActionsChange(dbActionPlans);
      setHasLoadedFromDb(true);
      setIsOpen(true);
    } else if (!isLoadingDb && dbActionPlans.length === 0) {
      setHasLoadedFromDb(true);
    }
  }, [dbActionPlans, isLoadingDb, hasLoadedFromDb, actions.length, onActionsChange]);

  const filteredActions = useMemo(() => {
    switch (activeFilter) {
      case 'high':
        return actions.filter(a => a.priority === 'alta');
      case 'in_progress':
        return actions.filter(a => a.status === 'in_progress');
      case 'completed':
        return actions.filter(a => a.status === 'completed');
      default:
        return actions;
    }
  }, [actions, activeFilter]);

  const handleGenerate = useCallback(async () => {
    if (!cohortContext) return;

    setIsGeneratingLocal(true);
    try {
      const insightTexts = insights.map(i => i.text);
      
      // Call the edge function directly
      const AI_INSIGHTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`;
      const response = await fetch(AI_INSIGHTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: "action-plan",
          cohortContext,
          insights: insightTexts,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error("Limite de requisições atingido. Aguarde alguns minutos.");
        if (response.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos em Configurações.");
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate action plan");
      }

      const result = await response.json();
      
      // Handle both array response and object with actions property
      const actionItems = Array.isArray(result) ? result : result?.actions || [];
      
      // Map to ActionPlanItem format if needed - use crypto.randomUUID for unique IDs
      const mappedActions: ActionPlanItem[] = actionItems.map((item: any) => ({
        id: crypto.randomUUID(),
        priority: mapPriority(item.priority),
        title: item.title || '',
        problem: item.problem || item.description || '',
        action: item.action || item.description || '',
        expectedImpact: item.expectedImpact || '',
        successMetric: item.successMetric || item.timeframe || '',
        status: 'pending' as const,
      }));

      // Save to database if user is authenticated
      if (user) {
        try {
          await bulkSaveActionPlans({ plans: mappedActions, targetAnalysisId: analysisId });
          toast({
            title: "Plano gerado e salvo",
            description: `${mappedActions.length} ações criadas e sincronizadas.`,
          });
        } catch (saveError) {
          console.error("Error saving action plan:", saveError);
          toast({
            title: "Plano gerado",
            description: `${mappedActions.length} ações criadas (não foi possível sincronizar).`,
          });
        }
      } else {
        toast({
          title: "Plano gerado",
          description: `${mappedActions.length} ações criadas com sucesso.`,
        });
      }

      onActionsChange(mappedActions);
      setIsOpen(true);
    } catch (error) {
      console.error("Error generating action plan:", error);
      toast({
        title: "Erro ao gerar plano",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLocal(false);
    }
  }, [cohortContext, insights, toast, user, bulkSaveActionPlans, analysisId, onActionsChange]);

  const handleStatusChange = useCallback(async (id: string, status: ActionPlanItem['status']) => {
    // Optimistic update
    onActionsChange(actions.map(action =>
      action.id === id ? { ...action, status } : action
    ));

    // Persist to database
    if (user) {
      try {
        await updateActionPlan({ id, updates: { status } });
      } catch (error) {
        console.error("Error updating status:", error);
        // Revert on error
        onActionsChange(actions);
        toast({
          title: "Erro ao atualizar",
          description: "Não foi possível salvar a alteração.",
          variant: "destructive",
        });
      }
    }
  }, [actions, onActionsChange, user, updateActionPlan, toast]);

  const handleEdit = useCallback((id: string) => {
    toast({
      title: "Editar ação",
      description: "Funcionalidade em desenvolvimento.",
    });
  }, [toast]);

  const handleArchive = useCallback(async (id: string) => {
    // Optimistic update
    onActionsChange(actions.filter(action => action.id !== id));

    // Persist to database (soft delete)
    if (user) {
      try {
        await archiveActionPlan(id);
        toast({
          title: "Ação arquivada",
          description: "A ação foi removida do plano.",
        });
      } catch (error) {
        console.error("Error archiving action:", error);
        // Revert on error
        onActionsChange(actions);
        toast({
          title: "Erro ao arquivar",
          description: "Não foi possível arquivar a ação.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Ação arquivada",
        description: "A ação foi removida do plano.",
      });
    }
  }, [actions, onActionsChange, user, archiveActionPlan, toast]);

  const handleExportPdf = useCallback(() => {
    if (actions.length === 0) return;
    exportActionPlanAsPdf(actions);
    toast({
      title: "PDF exportado",
      description: "O arquivo foi baixado com sucesso.",
    });
  }, [actions, toast]);

  const handleCopyText = useCallback(async () => {
    if (actions.length === 0) return;
    const text = copyActionPlanAsText(actions);
    await navigator.clipboard.writeText(text);
    toast({
      title: "Texto copiado",
      description: "O plano foi copiado para a área de transferência.",
    });
  }, [actions, toast]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-card/30 backdrop-blur-sm rounded-xl border border-border/50">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-card/50 transition-colors rounded-t-xl">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Plano de Ação Recomendado
              </h2>
              {actions.length > 0 && (
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/50">
                  {actions.length} {actions.length === 1 ? 'ação' : 'ações'}
                </Badge>
              )}
              {user && actions.length > 0 && (
                <Badge variant="outline" className={cn(
                  "text-muted-foreground border-muted-foreground/30",
                  isSaving && "animate-pulse"
                )}>
                  {isSaving ? (
                    <>
                      <Cloud className="h-3 w-3 mr-1 animate-pulse" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Cloud className="h-3 w-3 mr-1" />
                      Sincronizado
                    </>
                  )}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerate();
                }}
                disabled={isGenerating || !cohortContext}
                className="bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-500 hover:to-teal-500 text-gray-900 font-medium"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isGenerating && "animate-spin")} />
                Gerar Novo Plano
              </Button>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4">
            {/* Filter tabs */}
            {actions.length > 0 && (
              <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterType)}>
                <TabsList className="bg-background/50">
                  {filters.map((filter) => (
                    <TabsTrigger key={filter.value} value={filter.value}>
                      {filter.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {/* Loading state */}
            {isGenerating && (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-card/50 rounded-xl p-4 border-l-4 border-l-muted">
                    <Skeleton className="h-6 w-1/3 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isGenerating && actions.length === 0 && (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Clique em "Gerar Novo Plano" para criar recomendações
                </p>
              </div>
            )}

            {/* Action cards */}
            {!isGenerating && filteredActions.length > 0 && (
              <div className="space-y-4">
                {filteredActions.map((action) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    onStatusChange={handleStatusChange}
                    onEdit={handleEdit}
                    onArchive={handleArchive}
                  />
                ))}
              </div>
            )}

            {/* No results for filter */}
            {!isGenerating && actions.length > 0 && filteredActions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Nenhuma ação encontrada para o filtro selecionado.
                </p>
              </div>
            )}

            {/* Export buttons */}
            {actions.length > 0 && (
              <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPdf}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Exportar PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyText}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copiar Texto
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Helper to map priority strings to our expected format
function mapPriority(priority: string): 'alta' | 'media' | 'baixa' {
  const p = priority?.toLowerCase();
  if (p === 'high' || p === 'alta') return 'alta';
  if (p === 'medium' || p === 'media' || p === 'média') return 'media';
  return 'baixa';
}
