import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { CohortData, exportToCsv } from './cohortCalculations';
import { AdvancedMetrics } from './metricsCalculations';

// Type for action plan items
interface ActionPlanItemExport {
  id: string;
  priority: 'alta' | 'media' | 'baixa';
  title: string;
  problem: string;
  action: string;
  expectedImpact: string;
  successMetric: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export async function exportTableAsPng(elementId: string, filename: string = 'cohort-table'): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Elemento não encontrado');
  }

  try {
    const dataUrl = await toPng(element, {
      backgroundColor: '#0a0a0f',
      quality: 1,
      pixelRatio: 2,
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Erro ao exportar PNG:', error);
    throw error;
  }
}

export function exportCohortCsv(data: CohortData[], filename: string = 'cohort-data'): void {
  const csvContent = exportToCsv(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

export async function generatePdfReport(
  cohorts: CohortData[],
  metrics: AdvancedMetrics,
  filename: string = 'relatorio-cohort'
): Promise<void> {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Title
  pdf.setFontSize(24);
  pdf.setTextColor(34, 211, 238); // cyan-400
  pdf.text('Relatório de Análise de Cohort', pageWidth / 2, 20, { align: 'center' });
  
  // Date
  pdf.setFontSize(10);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 28, { align: 'center' });
  
  // Metrics Summary
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Resumo de Métricas', 20, 45);
  
  pdf.setFontSize(11);
  pdf.setTextColor(200, 200, 200);
  
  const metricsData = [
    [`Total de Clientes: ${metrics.totalCustomers.toLocaleString('pt-BR')}`, `Clientes Ativos: ${metrics.activeCustomers.toLocaleString('pt-BR')} (${metrics.activePercentage}%)`],
    [`Retenção M1: ${metrics.retentionM1}%`, `Retenção M3: ${metrics.retentionM3}%`],
    [`Retenção M6: ${metrics.retentionM6}%`, `Retenção M12: ${metrics.retentionM12}%`],
    [`Churn Médio Mensal: ${metrics.avgMonthlyChurn}%`, `Tempo Médio de Vida: ${metrics.avgLifetimeMonths} meses`],
  ];
  
  if (metrics.estimatedLTV) {
    metricsData.push([`LTV Estimado: R$ ${metrics.estimatedLTV.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']);
  }
  
  if (metrics.bestCohort) {
    metricsData.push([`Melhor Cohort: ${metrics.bestCohort.label} (${metrics.bestCohort.retention}% M3)`, '']);
  }
  
  if (metrics.worstCohort) {
    metricsData.push([`Maior Churn: ${metrics.worstCohort.label} (${metrics.worstCohort.churn}%)`, '']);
  }
  
  let yPos = 55;
  metricsData.forEach(row => {
    pdf.text(row[0], 20, yPos);
    if (row[1]) {
      pdf.text(row[1], 120, yPos);
    }
    yPos += 8;
  });
  
  // Cohort Table
  yPos += 10;
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Tabela de Retenção por Cohort', 20, yPos);
  
  yPos += 10;
  pdf.setFontSize(9);
  
  // Table header
  const maxMonths = Math.max(...cohorts.map(c => c.retention.length));
  const headers = ['Cohort', 'Clientes'];
  for (let i = 0; i <= Math.min(maxMonths - 1, 12); i++) {
    headers.push(`M${i}`);
  }
  
  const colWidth = (pageWidth - 40) / headers.length;
  
  pdf.setTextColor(34, 211, 238);
  headers.forEach((header, i) => {
    pdf.text(header, 20 + (i * colWidth), yPos);
  });
  
  yPos += 6;
  pdf.setTextColor(200, 200, 200);
  
  // Table rows
  cohorts.forEach((cohort, rowIndex) => {
    if (yPos > 180) {
      pdf.addPage();
      yPos = 20;
    }
    
    pdf.text(cohort.cohortLabel, 20, yPos);
    pdf.text(String(cohort.totalCustomers), 20 + colWidth, yPos);
    
    for (let i = 0; i <= Math.min(maxMonths - 1, 12); i++) {
      const retention = cohort.retention.find(r => r.month === i);
      const value = retention ? `${retention.percentage}%` : '-';
      pdf.text(value, 20 + ((i + 2) * colWidth), yPos);
    }
    
    yPos += 6;
  });
  
  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text('Cohort Analytics - Relatório gerado automaticamente', pageWidth / 2, 200, { align: 'center' });
  
  pdf.save(`${filename}.pdf`);
}

// ============================================================================
// ACTION PLAN EXPORT FUNCTIONS
// ============================================================================

const priorityColors = {
  alta: { r: 239, g: 68, b: 68 },   // red-500
  media: { r: 234, g: 179, b: 8 },  // yellow-500
  baixa: { r: 34, g: 197, b: 94 },  // green-500
};

const priorityLabels = {
  alta: 'ALTA',
  media: 'MÉDIA',
  baixa: 'BAIXA',
};

const statusLabels = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluída',
};

export function exportActionPlanAsPdf(actions: ActionPlanItemExport[]): void {
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Title
  pdf.setFontSize(18);
  pdf.setTextColor(34, 211, 238);
  pdf.text('Plano de Ação - Retenção', pageWidth / 2, 20, { align: 'center' });
  
  // Date
  pdf.setFontSize(10);
  pdf.setTextColor(150, 150, 150);
  pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 28, { align: 'center' });
  
  let yPos = 40;
  const leftMargin = 20;
  const maxWidth = pageWidth - 40;
  
  actions.forEach((action, index) => {
    // Check if we need a new page
    if (yPos > 260) {
      pdf.addPage();
      yPos = 20;
    }
    
    // Priority badge
    const color = priorityColors[action.priority];
    pdf.setFontSize(9);
    pdf.setTextColor(color.r, color.g, color.b);
    pdf.text(`[${priorityLabels[action.priority]}]`, leftMargin, yPos);
    
    // Title
    pdf.setFontSize(12);
    pdf.setTextColor(50, 50, 50);
    const titleX = leftMargin + 22;
    pdf.text(action.title, titleX, yPos);
    
    yPos += 8;
    
    // Content sections
    pdf.setFontSize(10);
    
    // Problem
    pdf.setTextColor(100, 100, 100);
    pdf.text('Problema:', leftMargin, yPos);
    pdf.setTextColor(80, 80, 80);
    const problemLines = pdf.splitTextToSize(action.problem, maxWidth - 25);
    pdf.text(problemLines, leftMargin + 25, yPos);
    yPos += problemLines.length * 5 + 3;
    
    // Action
    pdf.setTextColor(100, 100, 100);
    pdf.text('Ação:', leftMargin, yPos);
    pdf.setTextColor(80, 80, 80);
    const actionLines = pdf.splitTextToSize(action.action, maxWidth - 25);
    pdf.text(actionLines, leftMargin + 25, yPos);
    yPos += actionLines.length * 5 + 3;
    
    // Expected Impact
    pdf.setTextColor(100, 100, 100);
    pdf.text('Impacto:', leftMargin, yPos);
    pdf.setTextColor(34, 211, 238);
    const impactLines = pdf.splitTextToSize(action.expectedImpact, maxWidth - 25);
    pdf.text(impactLines, leftMargin + 25, yPos);
    yPos += impactLines.length * 5 + 3;
    
    // Success Metric
    pdf.setTextColor(100, 100, 100);
    pdf.text('Métrica:', leftMargin, yPos);
    pdf.setTextColor(80, 80, 80);
    const metricLines = pdf.splitTextToSize(action.successMetric, maxWidth - 25);
    pdf.text(metricLines, leftMargin + 25, yPos);
    yPos += metricLines.length * 5 + 3;
    
    // Status
    pdf.setTextColor(100, 100, 100);
    pdf.text('Status:', leftMargin, yPos);
    pdf.setTextColor(80, 80, 80);
    pdf.text(statusLabels[action.status], leftMargin + 25, yPos);
    
    yPos += 12;
    
    // Separator line
    if (index < actions.length - 1) {
      pdf.setDrawColor(200, 200, 200);
      pdf.line(leftMargin, yPos - 4, pageWidth - leftMargin, yPos - 4);
    }
  });
  
  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text('Cohort Analytics - Plano de Ação', pageWidth / 2, 290, { align: 'center' });
  
  pdf.save('plano-de-acao.pdf');
}

export function copyActionPlanAsText(actions: ActionPlanItemExport[]): string {
  return actions.map((action, i) => `${i + 1}. ${action.title} [${priorityLabels[action.priority]}]

Problema: ${action.problem}
Ação: ${action.action}
Impacto Esperado: ${action.expectedImpact}
Métrica de Sucesso: ${action.successMetric}
Status: ${statusLabels[action.status]}`).join('\n\n---\n\n');
}
