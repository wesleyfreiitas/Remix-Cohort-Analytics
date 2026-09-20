import { useState } from "react";
import { Download, FileImage, FileText, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { CohortData } from "@/lib/cohortCalculations";
import { AdvancedMetrics } from "@/lib/metricsCalculations";
import { exportTableAsPng, exportCohortCsv, generatePdfReport } from "@/lib/exportUtils";

interface ExportMenuProps {
  cohorts: CohortData[];
  metrics: AdvancedMetrics;
  tableElementId?: string;
}

export function ExportMenu({ cohorts, metrics, tableElementId = "cohort-table" }: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPng = async () => {
    if (cohorts.length === 0) {
      toast({
        title: "Sem dados para exportar",
        description: "Importe uma planilha primeiro para exportar.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      await exportTableAsPng(tableElementId);
      toast({
        title: "Exportado com sucesso!",
        description: "A tabela foi salva como imagem PNG.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar a tabela como imagem.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = () => {
    if (cohorts.length === 0) {
      toast({
        title: "Sem dados para exportar",
        description: "Importe uma planilha primeiro para exportar.",
        variant: "destructive",
      });
      return;
    }

    try {
      exportCohortCsv(cohorts);
      toast({
        title: "Exportado com sucesso!",
        description: "Os dados foram salvos em formato CSV.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar os dados.",
        variant: "destructive",
      });
    }
  };

  const handleExportPdf = async () => {
    if (cohorts.length === 0) {
      toast({
        title: "Sem dados para exportar",
        description: "Importe uma planilha primeiro para exportar.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      await generatePdfReport(cohorts, metrics);
      toast({
        title: "Exportado com sucesso!",
        description: "O relatório completo foi salvo em PDF.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar o relatório PDF.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "Exportando..." : "Exportar"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleExportPng}>
          <FileImage className="h-4 w-4 mr-2" />
          Tabela (PNG)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCsv}>
          <Table2 className="h-4 w-4 mr-2" />
          Dados (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPdf}>
          <FileText className="h-4 w-4 mr-2" />
          Relatório Completo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
