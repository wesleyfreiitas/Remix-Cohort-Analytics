import { useState } from 'react';
import { Save, Loader2, Target } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface SaveAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description?: string, linkActionPlan?: boolean) => Promise<void>;
  isSaving: boolean;
  defaultName?: string;
  hasActionPlan?: boolean;
  actionPlanCount?: number;
}

export function SaveAnalysisModal({
  open,
  onOpenChange,
  onSave,
  isSaving,
  defaultName = '',
  hasActionPlan = false,
  actionPlanCount = 0,
}: SaveAnalysisModalProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [linkActionPlan, setLinkActionPlan] = useState(true);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    await onSave(
      name.trim(), 
      description.trim() || undefined, 
      hasActionPlan && actionPlanCount > 0 ? linkActionPlan : undefined
    );
    setName('');
    setDescription('');
    setLinkActionPlan(true);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSaving) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setName(defaultName);
        setDescription('');
        setLinkActionPlan(true);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-primary" />
            Salvar Análise
          </DialogTitle>
          <DialogDescription>
            Salve sua análise atual para acessá-la posteriormente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome da Análise <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Ex: Análise de Clientes Q1 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Ex: Importação de janeiro a março com todos os planos"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              rows={3}
            />
          </div>

          {hasActionPlan && actionPlanCount > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="link-action-plan"
                  checked={linkActionPlan}
                  onCheckedChange={(checked) => setLinkActionPlan(!!checked)}
                  disabled={isSaving}
                />
                <Label 
                  htmlFor="link-action-plan" 
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Target className="h-4 w-4 text-primary" />
                  Vincular plano de ação ({actionPlanCount} {actionPlanCount === 1 ? 'ação' : 'ações'})
                </Label>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                As ações estratégicas serão salvas junto com esta análise
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="bg-gradient-to-r from-primary to-teal-400"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
