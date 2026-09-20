import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useData } from './DataContext';
import { useUserSettings } from './UserSettingsContext';
import { analyzeData, AIAnalysisResult } from '@/services/aiInsightsService';
import { prepareContextForAI, CohortContext } from '@/utils/prepareAIContext';
import { generateDataHash, getCachedAnalysis, setCachedAnalysis } from '@/lib/aiAnalysisCache';

export interface ActionPlanItem {
  id: string;
  priority: 'alta' | 'media' | 'baixa';
  title: string;
  problem: string;
  action: string;
  expectedImpact: string;
  successMetric: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface AIPreloadContextType {
  analysis: AIAnalysisResult | null;
  cohortContext: CohortContext | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  preloadedActionPlan: ActionPlanItem[] | null;
  isGeneratingPlan: boolean;
  triggerAnalysis: (forceRefresh?: boolean) => Promise<void>;
  clearPreload: () => void;
  fromCache: boolean;
}

const AIPreloadContext = createContext<AIPreloadContextType | undefined>(undefined);

function mapPriority(priority: string): 'alta' | 'media' | 'baixa' {
  const p = priority?.toLowerCase();
  if (p === 'high' || p === 'alta') return 'alta';
  if (p === 'medium' || p === 'media' || p === 'média') return 'media';
  return 'baixa';
}

export function AIPreloadProvider({ children }: { children: React.ReactNode }) {
  const { processedData } = useData();
  const { businessSettings, setDetectedValues } = useUserSettings();
  
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [cohortContext, setCohortContext] = useState<CohortContext | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [preloadedActionPlan, setPreloadedActionPlan] = useState<ActionPlanItem[] | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const hasTriggeredRef = useRef(false);
  const lastDataHashRef = useRef<string | null>(null);

  const generatePlanInBackground = useCallback(async (ctx: CohortContext, analysisResult: AIAnalysisResult) => {
    setIsGeneratingPlan(true);
    try {
      const AI_INSIGHTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`;
      const response = await fetch(AI_INSIGHTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: 'action-plan',
          cohortContext: ctx,
          insights: analysisResult.insights.map(i => i.text),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const actionItems = Array.isArray(result) ? result : result?.actions || [];
        const mapped: ActionPlanItem[] = actionItems.map((item: any) => ({
          id: crypto.randomUUID(),
          priority: mapPriority(item.priority),
          title: item.title || '',
          problem: item.problem || item.description || '',
          action: item.action || item.description || '',
          expectedImpact: item.expectedImpact || '',
          successMetric: item.successMetric || item.timeframe || '',
          status: 'pending' as const,
        }));
        setPreloadedActionPlan(mapped);
      }
    } catch (error) {
      console.error('Error generating action plan in background:', error);
    } finally {
      setIsGeneratingPlan(false);
    }
  }, []);

  const triggerAnalysis = useCallback(async (forceRefresh = false) => {
    if (!processedData || processedData.length === 0) return;
    if (isAnalyzing) return;

    const dataHash = generateDataHash(processedData, businessSettings);

    // Skip if same data already analyzed (unless forcing refresh)
    if (!forceRefresh && dataHash === lastDataHashRef.current && analysis) {
      return;
    }

    // Check cache
    if (!forceRefresh) {
      const cached = getCachedAnalysis(dataHash);
      if (cached) {
        setCohortContext(cached.context);
        setAnalysis(cached.analysis);
        setFromCache(true);
        lastDataHashRef.current = dataHash;
        setDetectedValues(
          cached.context.dataQualityReport.businessContext.industry,
          cached.context.dataQualityReport.businessContext.averageContractValue
        );
        return;
      }
    }

    setIsAnalyzing(true);
    setFromCache(false);
    setAnalysisError(null);

    try {
      const context = prepareContextForAI(processedData, businessSettings);
      setDetectedValues(
        context.dataQualityReport.businessContext.industry,
        context.dataQualityReport.businessContext.averageContractValue
      );
      setCohortContext(context);

      const result = await analyzeData(context);
      setAnalysis(result);
      lastDataHashRef.current = dataHash;
      setCachedAnalysis(dataHash, result, context);
      
      // Generate action plan in background after analysis completes
      generatePlanInBackground(context, result);
    } catch (error) {
      console.error('Preload analysis error:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [processedData, businessSettings, isAnalyzing, setDetectedValues, analysis, generatePlanInBackground]);

  // Auto-trigger when processedData changes
  useEffect(() => {
    if (processedData && processedData.length > 0) {
      const dataHash = generateDataHash(processedData, businessSettings);
      
      // Only trigger if data actually changed
      if (dataHash !== lastDataHashRef.current && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        triggerAnalysis();
      }
    }
  }, [processedData, businessSettings, triggerAnalysis]);

  // Reset trigger flag when data is cleared
  useEffect(() => {
    if (!processedData || processedData.length === 0) {
      hasTriggeredRef.current = false;
      lastDataHashRef.current = null;
    }
  }, [processedData]);

  const clearPreload = useCallback(() => {
    setAnalysis(null);
    setCohortContext(null);
    setPreloadedActionPlan(null);
    setAnalysisError(null);
    hasTriggeredRef.current = false;
    lastDataHashRef.current = null;
    setFromCache(false);
  }, []);

  return (
    <AIPreloadContext.Provider value={{
      analysis,
      cohortContext,
      isAnalyzing,
      analysisError,
      preloadedActionPlan,
      isGeneratingPlan,
      triggerAnalysis,
      clearPreload,
      fromCache,
    }}>
      {children}
    </AIPreloadContext.Provider>
  );
}

export function useAIPreload() {
  const context = useContext(AIPreloadContext);
  if (context === undefined) {
    throw new Error('useAIPreload must be used within AIPreloadProvider');
  }
  return context;
}
