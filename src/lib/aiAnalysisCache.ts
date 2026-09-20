import { AIAnalysisResult } from "@/services/aiInsightsService";
import { CohortContext } from "@/utils/prepareAIContext";
import type { ProcessedCustomer } from "@/contexts/DataContext";
import type { BusinessSettings } from "@/contexts/UserSettingsContext";

const CACHE_KEY = "ai_analysis_cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedAnalysis {
  hash: string;
  timestamp: number;
  analysis: AIAnalysisResult;
  context: CohortContext;
}

/**
 * Generates a stable hash based on the input data.
 * Uses djb2 algorithm for fast hashing.
 */
export function generateDataHash(
  data: ProcessedCustomer[],
  settings: BusinessSettings
): string {
  if (!data || data.length === 0) return "";

  // Components of the hash
  const components = [
    data.length.toString(),
    settings.industry,
    settings.averageContractValue,
    // Sample IDs (first and last)
    data[0]?.customerId || "",
    data[data.length - 1]?.customerId || "",
    // Extreme dates
    Math.min(...data.map((d) => d.startDate.getTime())).toString(),
    Math.max(...data.map((d) => d.startDate.getTime())).toString(),
    // Total MRR (rounded)
    Math.round(data.reduce((s, d) => s + (d.mrr || 0), 0)).toString(),
    // Churn count
    data.filter((d) => d.churnDate).length.toString(),
  ];

  // djb2 hash algorithm
  const str = components.join("|");
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash.toString(36);
}

/**
 * Retrieves cached analysis if available and valid.
 */
export function getCachedAnalysis(hash: string): CachedAnalysis | null {
  try {
    const stored = sessionStorage.getItem(CACHE_KEY);
    if (!stored) return null;

    const cached: CachedAnalysis = JSON.parse(stored);

    // Verify hash matches
    if (cached.hash !== hash) return null;

    // Verify TTL
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

/**
 * Saves analysis result to cache.
 */
export function setCachedAnalysis(
  hash: string,
  analysis: AIAnalysisResult,
  context: CohortContext
): void {
  const cached: CachedAnalysis = {
    hash,
    timestamp: Date.now(),
    analysis,
    context,
  };

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (e) {
    console.warn("Failed to cache AI analysis:", e);
  }
}

/**
 * Clears the analysis cache.
 */
export function clearAnalysisCache(): void {
  sessionStorage.removeItem(CACHE_KEY);
}
