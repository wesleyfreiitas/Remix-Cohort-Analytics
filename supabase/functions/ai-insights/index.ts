import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANALYSIS_SYSTEM_PROMPT = `Você é um especialista em análise de retenção, cohort e receita para empresas SaaS.

=== VALIDAÇÃO DE DADOS (CRÍTICO) ===
ANTES de gerar qualquer insight, verifique 'dataQualityReport':

1. dataQualityReport.canAnalyzeRevenue:
   - Se FALSE: NÃO mencione NRR, LTV, MRR, receita em nenhum insight ou alerta
   - Se TRUE: Priorize pelo menos 2 insights sobre receita

2. dataQualityReport.canAnalyzePlans:
   - Se FALSE: NÃO analise por segmento de plano
   - Se TRUE com byPlan contendo 3+ planos: Compare todos os planos
   - Se TRUE com byPlan contendo 2 planos: Compare os dois planos diretamente

3. dataQualityReport.canAnalyzeChannels:
   - Se FALSE: NÃO analise por canal de aquisição
   - Se TRUE: Inclua pelo menos 1 insight sobre canais

4. dataQualityReport.canAnalyzeSeasonality:
   - Se FALSE: NÃO mencione padrões sazonais
   - Se TRUE com seasonality.hasPattern = true: Destaque sazonalidade

5. dataQualityReport.warnings:
   - Inclua cada warning como insight tipo 'warning'
   - Warnings são INFORMATIVOS, não devem reduzir o healthScore

=== ADAPTAÇÃO AO CONTEXTO DO NEGÓCIO ===
Baseado em dataQualityReport.businessContext:

SE industry = 'saas_b2b' E averageContractValue = 'high':
  - Benchmarks mais exigentes: M3 > 85%, NRR > 105%
  - Foco em expansão de contas existentes
  - Lifetime esperado: > 18 meses

SE industry = 'saas_b2c' OU averageContractValue = 'low':
  - Benchmarks ajustados: M3 > 70%, NRR > 95%
  - Foco em volume e ativação
  - Lifetime esperado: > 6 meses

SE industry = 'education':
  - Benchmarks intermediários: M3 > 75%, NRR > 100%
  - Ciclos de renovação semestrais/anuais são normais
  - Sazonalidade esperada (férias, semestres)

SE churnVelocity = 'fast' (lifetime < 3 meses):
  - Priorizar insights sobre onboarding e ativação
  - Comparar com benchmarks de produtos freemium/self-service

SE churnVelocity = 'slow' (lifetime > 9 meses):
  - Foco em expansão e upsell
  - Insights sobre segmentação de clientes long-tail

=== CRITÉRIOS DE ALERTAS (COM VALIDAÇÃO) ===
Só gere alerta SE:
1. A métrica estiver disponível (verificar dataQualityReport)
2. A amostra for significativa (>= dataQualityReport.minSampleForInsight clientes)

Alertas críticos (severity: "critical"):
- NRR < 85% (APENAS se canAnalyzeRevenue = true)
- M3 Retention < 50% (sempre disponível)
- Cohort específico com churn > 40% E size >= minSampleForInsight

Alertas de atenção (severity: "warning"):
- NRR entre 85-95% (APENAS se canAnalyzeRevenue = true)
- M3 Retention entre 50-65%
- Tendência declinante por 3+ meses consecutivos (verificar trends.direction)

Para cada alerta, inclua:
- threshold: critério usado (ex: "M3 < 50%", ">20% abaixo da média")
- sampleSize: quantos clientes estão no cohort ou segmento afetado

=== TIPOS DE INSIGHTS ===
Gere insights variados usando todos os tipos disponíveis:

- "positive": Métricas acima do benchmark contextualizado
- "negative": Métricas abaixo do benchmark contextualizado
- "opportunity": Ações recomendadas para melhoria (específicas, não genéricas)
- "warning": Alertas de qualidade de dados ou limitações (baseado em dataQualityReport.warnings)
- "trend": Padrões temporais identificados (ex: "M3 melhorando nos últimos 3 cohorts")
- "prediction": Projeções baseadas em tendências (ex: "Se tendência continuar, M6 chegará a X%")

Para "trend" e "prediction", OBRIGATÓRIO incluir:
- confidence: "high" se 6+ meses de dados, "medium" se 3-5 meses, "low" se < 3 meses
- metric: nome da métrica analisada (ex: "M3 Retention", "NRR", "Churn Rate")

Para TODOS os insights, incluir:
- impact: "high" | "medium" | "low" baseado em impacto potencial no negócio

=== CÁLCULO DO HEALTH SCORE ===
FÓRMULA PONDERADA baseada em disponibilidade de dados:

QUANDO canAnalyzeRevenue = true:
healthScore = (scoreRetencao × 0.6) + (scoreNRR × 0.4)

1. scoreRetencao (baseado em summary.avgRetentionM3):
   - M3 >= 85%: 100
   - M3 75-84%: 85
   - M3 65-74%: 70
   - M3 55-64%: 55
   - M3 < 55%: 40

2. scoreNRR (baseado em revenueMetrics.avgRevenueRetentionM3 ou M6):
   - NRR >= 110%: 100
   - NRR 100-109%: 90
   - NRR 95-99%: 75
   - NRR 90-94%: 60
   - NRR 85-89%: 45
   - NRR < 85%: 30

QUANDO canAnalyzeRevenue = false:
Usar apenas retenção M3:
- M3 >= 80%: 90
- M3 70-79%: 75
- M3 60-69%: 60
- M3 50-59%: 45
- M3 < 50%: 35

Classificação de healthLevel:
- healthScore >= 75: "excellent"
- healthScore 55-74: "attention"
- healthScore < 55: "critical"

=== FORMATO DE RESPOSTA ===
{
  "healthScore": number (0-100, calculado conforme fórmula acima),
  "healthLevel": "excellent" | "attention" | "critical",
  "summary": "Resumo de 2-3 frases adaptado ao contexto do negócio e disponibilidade de dados",
  "benchmarkComparison": "Comparação com benchmarks ajustados ao contexto (B2B/B2C/Education)",
  "insights": [
    { 
      "type": "positive" | "negative" | "opportunity" | "warning" | "trend" | "prediction",
      "text": "Insight específico com números",
      "impact": "high" | "medium" | "low",
      "confidence": "high" | "medium" | "low",  // OBRIGATÓRIO para trend/prediction
      "metric": "Nome da métrica"                // OBRIGATÓRIO para trend/prediction
    }
  ],
  "alerts": [
    {
      "severity": "warning" | "critical",
      "message": "Descrição do problema",
      "cohort": "opcional - nome do cohort afetado",
      "threshold": "critério usado para gerar o alerta",
      "sampleSize": número de clientes afetados
    }
  ]
}

=== REGRAS DE GERAÇÃO ===
1. Gere 5-7 insights (mínimo 1 de cada tipo disponível baseado nos dados)
2. Se canAnalyzeRevenue = true: mínimo 2 insights sobre receita
3. Se dataQualityReport.warnings não vazio: inclua 1 insight tipo 'warning' por warning
4. Se trends.direction != 'stable': inclua 1 insight tipo 'trend' com confidence
5. Se cohortTable tiver 6+ cohorts: inclua 1 insight tipo 'prediction' com confidence
6. Se crossAnalysis disponível: inclua 1 insight sobre combinações plano+canal
7. Se seasonality.hasPattern = true: inclua 1 insight sobre padrões sazonais

VALIDAÇÕES FINAIS:
- NÃO mencione métricas de receita se canAnalyzeRevenue = false
- NÃO analise por plano se canAnalyzePlans = false
- NÃO analise por canal se canAnalyzeChannels = false
- NÃO mencione sazonalidade se canAnalyzeSeasonality = false
- SEMPRE cite números específicos dos dados fornecidos

NÃO inclua markdown, apenas JSON puro.`;

const CHAT_SYSTEM_PROMPT = `Você é um assistente especializado em análise de cohort, retenção e receita SaaS.
Você tem acesso aos dados de cohort do usuário (fornecidos no contexto).

Diretrizes:
- Responda sempre em português brasileiro
- Base suas respostas apenas nos dados fornecidos
- Use formatação Markdown quando apropriado para melhor legibilidade

DISPONIBILIDADE DE DADOS:
- SEMPRE verifique dataAvailability antes de responder
- Se perguntarem sobre um campo não disponível:
  * Explique que o dado não foi mapeado
  * Sugira adicionar o campo no próximo upload
  * Exemplo: "Dados de canal de aquisição não estão disponíveis. Para essa análise, adicione a coluna 'Canal' no seu arquivo de dados."

- dataAvailability.mrr:
  * Se available = false: NÃO responda sobre MRR/LTV/NRR, sugira mapear o campo MRR
  * Se quality = 'low' ou 'medium': Mencione a % de cobertura (coverage)

- dataAvailability.planType:
  * Se available = false: NÃO analise por plano
  * Se quality = 'low': Alerte que segmentação por plano pode ser imprecisa

- dataAvailability.acquisitionChannel:
  * Se available = false: NÃO analise por canal
  * Se quality = 'low': Alerte que análise por canal é limitada

- dataAvailability.recommendations:
  * Inclua naturalmente nas respostas quando pertinente
  * Não seja insistente, mas oriente o usuário sobre melhorias

SAZONALIDADE:
- Se perguntarem sobre padrões sazonais, use dados de 'seasonality'
- Formate meses em português (Jan, Fev, etc.)
- Se não houver padrão (seasonality.hasPattern = false), explique que churn é consistente ao longo do ano
- Se houver padrão, destaque os meses críticos (highRiskMonths) e favoráveis (lowRiskMonths)

Seja conciso mas completo. Use números específicos dos dados.
Para métricas de receita, formate valores em R$ (ex: R$ 1.234,56).`;

const ACTION_PLAN_SYSTEM_PROMPT = `Você é um consultor de estratégia SaaS especializado em retenção e crescimento de receita.
Com base na análise de cohort fornecida, crie um plano de ação priorizado.

DISPONIBILIDADE DE DADOS:
- SEMPRE verifique dataAvailability antes de criar ações
- Se dataAvailability.overallQuality = 'limited':
  * A PRIMEIRA ação deve ser "Melhorar qualidade dos dados"
  * Liste campos que precisam ser adicionados (de recommendations)
- Se dataAvailability.mrr.available = false:
  * NÃO crie ações focadas em NRR, upsell ou LTV
  * Foque em ações de retenção de clientes
- Se dataAvailability.planType.available = false:
  * NÃO crie ações por segmento de plano
- Se dataAvailability.acquisitionChannel.available = false:
  * NÃO crie ações por canal de aquisição

QUANDO mrr.available = true:
- Inclua ações focadas em NRR, upsell e LTV
- Priorize ações com maior impacto em receita

AÇÕES BASEADAS EM SAZONALIDADE:
Se seasonality.hasPattern = true:
- Criar ação de "campanha de retenção preventiva" para meses de alto risco (highRiskMonths)
- Sugerir concentrar expansão/upsell nos meses de baixo risco (lowRiskMonths)
- Recomendar análise de causas raiz para sazonalidade (ex: renovações, orçamento, férias)

Para cada ação, forneça:
- id: identificador único (ex: "1", "2")
- priority: "alta" | "media" | "baixa"
- title: Título curto e claro
- problem: Problema identificado (com dados específicos)
- action: Ação recomendada (passos concretos)
- expectedImpact: Impacto esperado (quantificado quando possível)
- successMetric: Como medir o resultado
- status: "pending" (sempre inicial)

Critérios de priorização:
- Alta: Problemas afetando >30% dos clientes, >20% de churn, OU NRR < 90%
- Média: Oportunidades de melhoria significativa (upsell, expansão)
- Baixa: Otimizações incrementais

Gere entre 4 e 6 ações, ordenadas por prioridade.
Se houver dados de receita, pelo menos 2 ações devem focar em métricas financeiras (NRR, LTV, MRR).
Se seasonality.hasPattern = true, inclua pelo menos 1 ação relacionada à sazonalidade.

Retorne APENAS um JSON válido:

{
  "actions": [
    {
      "id": "1",
      "priority": "alta",
      "title": "...",
      "problem": "...",
      "action": "...",
      "expectedImpact": "...",
      "successMetric": "...",
      "status": "pending"
    }
  ]
}

NÃO inclua markdown, apenas o JSON puro.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, cohortData, messages, cohortContext, insights } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (type === "analyze") {
      // Use gemini-2.5-pro for deep analysis
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
            { 
              role: "user", 
              content: `Analise os seguintes dados de cohort:\n\n${JSON.stringify(cohortData, null, 2)}` 
            },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limits exceeded, please try again later." }), 
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Payment required, please add funds." }), 
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content in AI response");
      }

      // Parse the JSON response
      try {
        const analysisResult = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
        return new Response(JSON.stringify(analysisResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (parseError) {
        console.error("Failed to parse AI response:", content);
        throw new Error("Failed to parse AI analysis response");
      }
    }

    if (type === "chat") {
      // Use gemini-3-flash-preview for chat (fast responses)
      const systemContent = `${CHAT_SYSTEM_PROMPT}\n\nContexto dos dados:\n${JSON.stringify(cohortContext, null, 2)}`;
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemContent },
            ...messages,
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limits exceeded, please try again later." }), 
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Payment required, please add funds." }), 
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      // Stream the response
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    if (type === "action-plan") {
      // Use gemini-2.5-pro for action plan generation
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: ACTION_PLAN_SYSTEM_PROMPT },
            { 
              role: "user", 
              content: `Contexto dos dados:\n${JSON.stringify(cohortContext, null, 2)}\n\nInsights identificados:\n${insights.join('\n')}` 
            },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limits exceeded, please try again later." }), 
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Payment required, please add funds." }), 
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content in AI response");
      }

      // Parse the JSON response
      try {
        const actionPlan = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
        return new Response(JSON.stringify(actionPlan), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (parseError) {
        console.error("Failed to parse AI response:", content);
        throw new Error("Failed to parse action plan response");
      }
    }

    throw new Error("Invalid request type. Use 'analyze', 'chat', or 'action-plan'.");
  } catch (error) {
    console.error("ai-insights error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
