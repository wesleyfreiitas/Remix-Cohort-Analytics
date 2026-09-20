import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Loader2, FolderOpen } from 'lucide-react';
import { useAnalyses, Analysis } from '@/hooks/useAnalyses';
import { AnalysisCard } from './AnalysisCard';
import { useData } from '@/contexts/DataContext';
import { toast } from 'sonner';

export function AnalysisHistory() {
  const { 
    analyses, 
    isLoading, 
    loadAnalysis, 
    deleteAnalysis, 
    renameAnalysis,
    isDeleting,
    isRenaming,
  } = useAnalyses();
  
  const { 
    setProcessedDataFromAnalysis, 
    setColumnMapping,
    currentAnalysisId,
    setCurrentAnalysisId,
    setAnalysisName,
  } = useData();

  const navigate = useNavigate();
  
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

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
        
        setTimeout(() => {
          navigate("/cohort");
        }, 800);
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (analysisId: string) => {
    setDeletingId(analysisId);
    
    try {
      await deleteAnalysis(analysisId);
      
      // Clear current analysis if deleted
      if (currentAnalysisId === analysisId) {
        setCurrentAnalysisId(null);
        setAnalysisName(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleRename = async (analysisId: string, name: string) => {
    setRenamingId(analysisId);
    
    try {
      await renameAnalysis({ id: analysisId, name });
      
      // Update analysis name if it's the current one
      if (currentAnalysisId === analysisId) {
        setAnalysisName(name);
      }
    } finally {
      setRenamingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Carregando análises...</span>
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Análises Salvas</h3>
        </div>
        
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhuma análise salva</p>
          <p className="text-sm text-muted-foreground mt-1">
            Importe dados e salve sua análise para acessá-la posteriormente
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Análises Salvas</h3>
        </div>
        <span className="text-sm text-muted-foreground">
          {analyses.length} {analyses.length === 1 ? 'análise' : 'análises'}
        </span>
      </div>

      <div className="space-y-3">
        {analyses.map((analysis) => (
          <AnalysisCard
            key={analysis.id}
            analysis={analysis}
            onLoad={handleLoad}
            onRename={handleRename}
            onDelete={handleDelete}
            isLoading={loadingId === analysis.id}
            isDeleting={deletingId === analysis.id}
            isRenaming={renamingId === analysis.id}
            isActive={currentAnalysisId === analysis.id}
          />
        ))}
      </div>
    </div>
  );
}
