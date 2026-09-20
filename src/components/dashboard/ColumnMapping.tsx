import { CheckCircle, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColumnMapping as ColumnMappingType } from "@/contexts/DataContext";
import { cn } from "@/lib/utils";

interface MappingField {
  key: keyof ColumnMappingType;
  label: string;
  required: boolean;
  helper?: string;
}

const mappingFields: MappingField[] = [
  { key: "customerId", label: "ID do Cliente", required: true },
  { key: "startDate", label: "Data de Início", required: true },
  { key: "churnDate", label: "Data de Cancelamento", required: false, helper: "Deixe vazio se cliente ainda ativo" },
  { key: "planType", label: "Tipo de Plano", required: false },
  { key: "mrr", label: "MRR", required: false, helper: "Receita Recorrente Mensal" },
  { key: "acquisitionChannel", label: "Canal de Aquisição", required: false },
];

interface ColumnMappingProps {
  headers: string[];
  mapping: ColumnMappingType;
  onMappingChange: (field: keyof ColumnMappingType, value: string | null) => void;
  autoMappedFields?: Set<keyof ColumnMappingType>;
}

export function ColumnMapping({ headers, mapping, onMappingChange, autoMappedFields = new Set() }: ColumnMappingProps) {
  const isMapped = (field: keyof ColumnMappingType) => !!mapping[field];
  const isAutoMapped = (field: keyof ColumnMappingType) => autoMappedFields.has(field) && isMapped(field);

  return (
    <div className="glass-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Mapeamento de Colunas
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Associe as colunas da sua planilha aos campos necessários
        </p>
      </div>

      <div className="grid gap-4">
        {mappingFields.map((field) => (
          <div
            key={field.key}
            className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-muted/20 border border-border/30"
          >
            <div className="flex items-center gap-3 sm:w-1/2">
              {field.required ? (
                isMapped(field.key) ? (
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                )
              ) : (
                <div className={cn(
                  "h-5 w-5 rounded-full border-2 flex-shrink-0",
                  isMapped(field.key) ? "border-primary bg-primary/20" : "border-muted-foreground/30"
                )} />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{field.label}</span>
                  {field.required && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-destructive/20 text-destructive">
                      Obrigatório
                    </span>
                  )}
                  {isAutoMapped(field.key) && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary">
                      Auto-detectado
                    </span>
                  )}
                </div>
                {field.helper && (
                  <p className="text-xs text-muted-foreground mt-0.5">{field.helper}</p>
                )}
              </div>
            </div>

            <div className="sm:w-1/2">
              <Select
                value={mapping[field.key] || "__none__"}
                onValueChange={(value) => onMappingChange(field.key, value === "__none__" ? null : value)}
              >
                <SelectTrigger className="w-full rounded-xl border-2 border-border/50 bg-background focus:border-primary">
                  <SelectValue placeholder="Selecionar coluna..." />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
