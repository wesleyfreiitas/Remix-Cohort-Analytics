
# Plano: Adicionar Redirecionamento ao Carregar Análise Salva

## Problema Identificado

A navegação automática foi implementada apenas no `FileUpload.tsx` para quando o usuário faz upload e processa dados novos. 

**Porém**, quando o usuário carrega uma análise salva clicando em "Carregar", o fluxo usa o `AnalysisHistory.tsx` que **não tem o redirecionamento**.

### Código Atual (`AnalysisHistory.tsx`, linha 31-47):
```typescript
const handleLoad = async (analysisId: string) => {
  setLoadingId(analysisId);
  
  try {
    const result = await loadAnalysis(analysisId);
    
    if (result) {
      setColumnMapping(result.analysis.columnMapping);
      setProcessedDataFromAnalysis(result.customers);
      setCurrentAnalysisId(result.analysis.id);
      setAnalysisName(result.analysis.name);
      toast.success(`Análise "${result.analysis.name}" carregada com sucesso!`);
      // ← FALTA O REDIRECIONAMENTO AQUI!
    }
  } finally {
    setLoadingId(null);
  }
};
```

## Solução

Adicionar `useNavigate` e redirecionar para `/cohort` após carregar a análise salva, seguindo o mesmo padrão do `FileUpload.tsx`.

## Implementação

### Arquivo: `src/components/dashboard/AnalysisHistory.tsx`

**Mudança 1**: Importar `useNavigate`
```typescript
import { useNavigate } from 'react-router-dom';
```

**Mudança 2**: Inicializar o hook
```typescript
const navigate = useNavigate();
```

**Mudança 3**: Adicionar redirecionamento na função `handleLoad`
```typescript
const handleLoad = async (analysisId: string) => {
  setLoadingId(analysisId);
  
  try {
    const result = await loadAnalysis(analysisId);
    
    if (result) {
      setColumnMapping(result.analysis.columnMapping);
      setProcessedDataFromAnalysis(result.customers);
      setCurrentAnalysisId(result.analysis.id);
      setAnalysisName(result.analysis.name);
      
      toast.success(`Análise "${result.analysis.name}" carregada com sucesso!`, {
        description: "Redirecionando para análise de cohort...",
      });
      
      // Redirecionar após pequeno delay
      setTimeout(() => {
        navigate("/cohort");
      }, 800);
    }
  } finally {
    setLoadingId(null);
  }
};
```

## Fluxo Resultante

```text
┌────────────────────────────────────────────────────────────────────────┐
│                         Dashboard                                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Análises Salvas                                                       │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ Analise de Teste  [Ativa]           [Carregar] [✏️] [🗑️]      │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                         │                              │
│                                         ▼                              │
│                                    Clique em "Carregar"                │
│                                         │                              │
│                                         ▼                              │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │ ✓ Análise "Analise de Teste" carregada com sucesso!        │       │
│  │   Redirecionando para análise de cohort...                 │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                         │                              │
│                                         │ (800ms delay)                │
│                                         ▼                              │
│                                navigate("/cohort")                     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    CohortAnalysis (/cohort)                            │
├────────────────────────────────────────────────────────────────────────┤
│  • Dados da análise já carregados                                      │
│  • Gráficos e métricas visíveis                                        │
│  • IA processando em background                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/AnalysisHistory.tsx` | Adicionar `useNavigate` e redirecionamento após carregar análise |

## Resultado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Upload novo + "Processar Dados" | ✅ Redireciona | ✅ Redireciona |
| Carregar análise salva | ❌ Permanece no Dashboard | ✅ Redireciona para Cohort |
