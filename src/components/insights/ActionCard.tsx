import { Circle, Clock, CheckCircle, MoreVertical, Edit, Archive, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

interface ActionCardProps {
  action: ActionPlanItem;
  onStatusChange: (id: string, status: ActionPlanItem['status']) => void;
  onEdit?: (id: string) => void;
  onArchive?: (id: string) => void;
}

const priorityStyles = {
  alta: {
    border: 'border-l-4 border-l-red-500',
    badge: 'bg-red-500/20 text-red-400 border-red-500/50',
    label: 'Alta'
  },
  media: {
    border: 'border-l-4 border-l-yellow-500',
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    label: 'Média'
  },
  baixa: {
    border: 'border-l-4 border-l-green-500',
    badge: 'bg-green-500/20 text-green-400 border-green-500/50',
    label: 'Baixa'
  }
};

const statusOptions = [
  { value: 'pending', label: 'Pendente', icon: Circle },
  { value: 'in_progress', label: 'Em Andamento', icon: Clock },
  { value: 'completed', label: 'Concluída', icon: CheckCircle }
] as const;

export function ActionCard({ action, onStatusChange, onEdit, onArchive }: ActionCardProps) {
  const priority = priorityStyles[action.priority];
  const currentStatus = statusOptions.find(s => s.value === action.status) || statusOptions[0];
  const StatusIcon = currentStatus.icon;

  return (
    <div className={cn(
      "bg-card/50 backdrop-blur-sm rounded-xl p-4",
      priority.border,
      action.status === 'completed' && "opacity-60"
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* Content */}
        <div className="flex-1 space-y-3">
          {/* Header with title and priority */}
          <div className="flex items-center gap-3">
            <h3 className={cn(
              "text-lg font-semibold text-foreground",
              action.status === 'completed' && "line-through"
            )}>
              {action.title}
            </h3>
            <Badge variant="outline" className={priority.badge}>
              {priority.label}
            </Badge>
          </div>

          {/* Problem */}
          <p className="text-sm">
            <span className="font-medium text-muted-foreground">Problema: </span>
            <span className="text-muted-foreground/80">{action.problem}</span>
          </p>

          {/* Action */}
          <p className="text-sm">
            <span className="font-medium text-muted-foreground">Ação: </span>
            <span className="text-foreground/80">{action.action}</span>
          </p>

          {/* Expected Impact */}
          <p className="text-sm">
            <span className="font-medium text-muted-foreground">Impacto esperado: </span>
            <span className="text-cyan-400">{action.expectedImpact}</span>
          </p>

          {/* Success Metric */}
          <p className="text-sm">
            <span className="font-medium text-muted-foreground">Métrica de sucesso: </span>
            <span className="text-muted-foreground/80">{action.successMetric}</span>
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-end gap-2">
          {/* Status selector */}
          <Select
            value={action.status}
            onValueChange={(value: ActionPlanItem['status']) => onStatusChange(action.id, value)}
          >
            <SelectTrigger className="w-[160px] h-8 bg-background/50 border-border/50">
              <div className="flex items-center gap-2">
                <StatusIcon className="h-4 w-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Context menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(action.id)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onArchive?.(action.id)}>
                <Archive className="h-4 w-4 mr-2" />
                Arquivar
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ListTodo className="h-4 w-4 mr-2" />
                Criar tarefa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
