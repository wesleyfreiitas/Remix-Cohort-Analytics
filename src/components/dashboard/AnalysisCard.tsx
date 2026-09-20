import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, Loader2, Pencil, Trash2, Upload, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Analysis } from '@/hooks/useAnalyses';

interface AnalysisCardProps {
  analysis: Analysis;
  onLoad: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
  isRenaming?: boolean;
  isActive?: boolean;
}

export function AnalysisCard({
  analysis,
  onLoad,
  onRename,
  onDelete,
  isLoading,
  isDeleting,
  isRenaming,
  isActive,
}: AnalysisCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(analysis.name);

  const handleRename = () => {
    if (editName.trim() && editName !== analysis.name) {
      onRename(analysis.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(analysis.name);
    setIsEditing(false);
  };

  const timeAgo = formatDistanceToNow(analysis.updatedAt, {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div className={`rounded-xl border p-4 transition-colors ${
      isActive 
        ? 'border-primary/50 bg-primary/5' 
        : 'border-border bg-card hover:border-primary/30'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleRename}
                  disabled={isRenaming}
                >
                  {isRenaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCancelEdit}
                  disabled={isRenaming}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground truncate">
                    {analysis.name}
                  </h4>
                  {isActive && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary flex-shrink-0">
                      Ativa
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {analysis.fileName || 'Sem arquivo'} • {analysis.totalCustomers.toLocaleString('pt-BR')} clientes
                </p>
              </>
            )}
            
            <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLoad(analysis.id)}
            disabled={isLoading || isActive}
            className="h-8"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" />
                Carregar
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setIsEditing(true)}
            disabled={isEditing || isRenaming}
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir análise?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A análise "{analysis.name}" e todos os seus dados serão permanentemente excluídos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(analysis.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {analysis.description && (
        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
          {analysis.description}
        </p>
      )}
    </div>
  );
}
