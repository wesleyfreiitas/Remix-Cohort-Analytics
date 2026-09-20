import { CohortContext } from "@/utils/prepareAIContext";

// ============================================================================
// INTERFACES
// ============================================================================

export interface GeminiConfig {
  model: 'google/gemini-2.5-pro' | 'google/gemini-3-flash-preview' | 'google/gemini-2.5-flash';
  temperature?: number;
  maxTokens?: number;
}

export interface AnalysisResult {
  healthScore: number;
  healthLevel: 'excellent' | 'attention' | 'critical';
  summary: string;
  benchmarkComparison: string;
  insights: Array<{
    type: 'positive' | 'negative' | 'opportunity' | 'warning' | 'trend' | 'prediction';
    text: string;
    impact?: 'high' | 'medium' | 'low';
    confidence?: 'high' | 'medium' | 'low';
    metric?: string;
  }>;
  alerts: Array<{
    severity: 'warning' | 'critical';
    message: string;
    cohort?: string;
    threshold?: string;
    sampleSize?: number;
  }>;
}

export interface ActionItem {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
  timeframe: string;
  category: 'retention' | 'acquisition' | 'engagement' | 'pricing';
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Re-export CohortContext for backwards compatibility
export type { CohortContext };

// ============================================================================
// CONSTANTS
// ============================================================================

const AI_INSIGHTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-insights`;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const FALLBACK_MESSAGE = "Não foi possível processar sua solicitação. Tente novamente.";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  initialDelay: number = INITIAL_RETRY_DELAY
): Promise<T> {
  let lastError: Error = new Error(FALLBACK_MESSAGE);
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.error(`[GeminiService] Attempt ${attempt + 1} failed:`, lastError.message);
      
      // Don't retry for rate limit or payment errors
      if (lastError.message === 'RATE_LIMIT' || lastError.message === 'PAYMENT_REQUIRED') {
        throw lastError;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`[GeminiService] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

function handleError(error: Error): never {
  console.error('[GeminiService]', error.message);
  
  if (error.message === 'RATE_LIMIT') {
    throw new Error('Limite de requisições atingido. Aguarde alguns minutos.');
  }
  
  if (error.message === 'PAYMENT_REQUIRED') {
    throw new Error('Créditos de IA esgotados. Adicione créditos em Configurações.');
  }
  
  throw new Error(FALLBACK_MESSAGE);
}

// ============================================================================
// MAIN API FUNCTIONS
// ============================================================================

export async function generateAnalysis(context: CohortContext): Promise<AnalysisResult> {
  return fetchWithRetry(async () => {
    const response = await fetch(AI_INSIGHTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        type: "analyze",
        cohortData: context,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("RATE_LIMIT");
      if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to analyze data");
    }

    return response.json();
  }).catch(handleError);
}

export async function chatWithData(
  message: string,
  context: CohortContext,
  history: Message[]
): Promise<string> {
  return fetchWithRetry(async () => {
    const messages = [
      ...history,
      { role: 'user' as const, content: message },
    ];

    const response = await fetch(AI_INSIGHTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        type: "chat",
        messages,
        cohortContext: context,
      }),
    });

    if (!response.ok || !response.body) {
      if (response.status === 429) throw new Error("RATE_LIMIT");
      if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
      throw new Error("Failed to start chat stream");
    }

    // Read the entire stream and return the complete response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let textBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) fullContent += content;
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    return fullContent;
  }).catch(handleError);
}

export async function generateActionPlan(
  context: CohortContext,
  insights: string[]
): Promise<ActionItem[]> {
  return fetchWithRetry(async () => {
    const response = await fetch(AI_INSIGHTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        type: "action-plan",
        cohortContext: context,
        insights,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("RATE_LIMIT");
      if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to generate action plan");
    }

    return response.json();
  }).catch(handleError);
}

// ============================================================================
// STREAMING CHAT (for UI with real-time updates)
// ============================================================================

export async function streamChatWithData(
  message: string,
  context: CohortContext,
  history: Message[],
  onDelta: (text: string) => void,
  onDone: () => void
): Promise<void> {
  const messages = [
    ...history,
    { role: 'user' as const, content: message },
  ];

  const response = await fetch(AI_INSIGHTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      type: "chat",
      messages,
      cohortContext: context,
    }),
  });

  if (!response.ok || !response.body) {
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error("Failed to start chat stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}
