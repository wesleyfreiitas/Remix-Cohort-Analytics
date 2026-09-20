import { Download, FileSpreadsheet, Sheet, Copy, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { AIAnalysisResult } from "@/services/aiInsightsService";
import { ActionPlanItem } from "./ActionCard";
import {
  exportInsightsAsExcel,
  exportActionPlanAsExcel,
  generateInsightsCsv,
  openGoogleSheetsWithData,
  generateInsightsText,
} from "@/lib/insightsExportUtils";

interface InsightsExportMenuProps {
  analysis: AIAnalysisResult | null;
  actions: ActionPlanItem[];
  disabled?: boolean;
}

export function InsightsExportMenu({
  analysis,
  actions,
  disabled = false,
}: InsightsExportMenuProps) {
  const { toast } = useToast();

  const handleExportFullExcel = () => {
    if (!analysis) return;

    exportInsightsAsExcel(
      analysis.healthScore,
      analysis.healthLevel,
      analysis.summary,
      analysis.benchmarkComparison,
      analysis.insights,
      analysis.alerts,
      actions
    );

    toast({
      title: "Excel exportado",
      description: "O relatório completo foi baixado com sucesso.",
    });
  };

  const handleExportActionPlanExcel = () => {
    if (actions.length === 0) {
      toast({
        title: "Sem plano de ação",
        description: "Gere um plano de ação primeiro.",
        variant: "destructive",
      });
      return;
    }

    exportActionPlanAsExcel(actions);

    toast({
      title: "Excel exportado",
      description: "O plano de ação foi baixado com sucesso.",
    });
  };

  const handleOpenGoogleSheets = async () => {
    if (!analysis) return;

    const csvContent = generateInsightsCsv(
      analysis.healthScore,
      analysis.healthLevel,
      analysis.summary,
      analysis.insights,
      analysis.alerts,
      actions
    );

    await openGoogleSheetsWithData(csvContent);

    toast({
      title: "Dados copiados!",
      description: "Cole (Ctrl+V ou Cmd+V) na planilha que foi aberta.",
    });
  };

  const handleCopyAll = async () => {
    if (!analysis) return;

    const text = generateInsightsText(
      analysis.healthScore,
      analysis.healthLevel,
      analysis.summary,
      analysis.benchmarkComparison,
      analysis.insights,
      analysis.alerts,
      actions
    );

    await navigator.clipboard.writeText(text);

    toast({
      title: "Texto copiado",
      description: "O relatório foi copiado para a área de transferência.",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || !analysis}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover">
        <DropdownMenuItem onClick={handleExportFullExcel} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          Relatório Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleExportActionPlanExcel}
          className="gap-2 cursor-pointer"
          disabled={actions.length === 0}
        >
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          Plano de Ação Excel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleOpenGoogleSheets} className="gap-2 cursor-pointer">
          <Sheet className="h-4 w-4 text-accent-foreground" />
          Abrir no Google Sheets
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyAll} className="gap-2 cursor-pointer">
          <Copy className="h-4 w-4 text-muted-foreground" />
          Copiar Tudo (Texto)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
