import * as XLSX from 'xlsx';

// Types for export functions
interface InsightExport {
  type: string;
  text: string;
  impact?: string;
  confidence?: string;
  metric?: string;
}

interface AlertExport {
  severity: 'warning' | 'critical';
  message: string;
  cohort?: string;
  threshold?: string;
}

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

// Helper functions
const translateType = (type: string): string => {
  const typeMap: Record<string, string> = {
    positive: 'Positivo',
    negative: 'Negativo',
    opportunity: 'Oportunidade',
    warning: 'Alerta',
    trend: 'Tendência',
    prediction: 'Previsão',
  };
  return typeMap[type] || type;
};

const translateLevel = (level: string): string => {
  const levelMap: Record<string, string> = {
    excellent: 'Excelente',
    attention: 'Atenção',
    critical: 'Crítico',
  };
  return levelMap[level] || level;
};

const translatePriority = (priority: string): string => {
  const priorityMap: Record<string, string> = {
    alta: 'ALTA',
    media: 'MÉDIA',
    baixa: 'BAIXA',
  };
  return priorityMap[priority] || priority;
};

const translateStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
  };
  return statusMap[status] || status;
};

// ============================================================================
// EXCEL EXPORT FUNCTIONS
// ============================================================================

export function exportInsightsAsExcel(
  healthScore: number,
  healthLevel: string,
  summary: string,
  benchmarkComparison: string,
  insights: InsightExport[],
  alerts: AlertExport[],
  actions: ActionPlanItemExport[]
): void {
  const workbook = XLSX.utils.book_new();
  const dateStr = new Date().toLocaleDateString('pt-BR');

  // Sheet 1: Summary
  const summaryData = [
    ['RELATÓRIO DE INSIGHTS - COHORT ANALYTICS'],
    [''],
    ['Data de Geração', dateStr],
    [''],
    ['DIAGNÓSTICO GERAL'],
    ['Health Score', healthScore],
    ['Nível', translateLevel(healthLevel)],
    [''],
    ['Resumo Executivo'],
    [summary],
    [''],
    ['Comparação com Benchmark'],
    [benchmarkComparison],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

  // Sheet 2: Insights (Descobertas)
  const insightsData = [
    ['Tipo', 'Descoberta', 'Impacto', 'Confiança', 'Métrica'],
    ...insights.map((i) => [
      translateType(i.type),
      i.text,
      i.impact || '-',
      i.confidence || '-',
      i.metric || '-',
    ]),
  ];
  const insightsSheet = XLSX.utils.aoa_to_sheet(insightsData);
  insightsSheet['!cols'] = [
    { wch: 15 },
    { wch: 60 },
    { wch: 10 },
    { wch: 12 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, insightsSheet, 'Descobertas');

  // Sheet 3: Alerts
  const alertsData = [
    ['Severidade', 'Mensagem', 'Cohort Afetado', 'Threshold'],
    ...alerts.map((a) => [
      a.severity === 'critical' ? 'Crítico' : 'Aviso',
      a.message,
      a.cohort || '-',
      a.threshold || '-',
    ]),
  ];
  const alertsSheet = XLSX.utils.aoa_to_sheet(alertsData);
  alertsSheet['!cols'] = [{ wch: 12 }, { wch: 50 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, alertsSheet, 'Alertas');

  // Sheet 4: Action Plan (if there are actions)
  if (actions.length > 0) {
    const actionsData = [
      [
        'Prioridade',
        'Título',
        'Problema',
        'Ação Recomendada',
        'Impacto Esperado',
        'Métrica de Sucesso',
        'Status',
      ],
      ...actions.map((a) => [
        translatePriority(a.priority),
        a.title,
        a.problem,
        a.action,
        a.expectedImpact,
        a.successMetric,
        translateStatus(a.status),
      ]),
    ];
    const actionsSheet = XLSX.utils.aoa_to_sheet(actionsData);
    actionsSheet['!cols'] = [
      { wch: 12 },
      { wch: 30 },
      { wch: 40 },
      { wch: 40 },
      { wch: 30 },
      { wch: 25 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, actionsSheet, 'Plano de Ação');
  }

  const filename = `insights-cohort-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export function exportActionPlanAsExcel(actions: ActionPlanItemExport[]): void {
  const workbook = XLSX.utils.book_new();

  const actionsData = [
    [
      'Prioridade',
      'Título',
      'Problema',
      'Ação Recomendada',
      'Impacto Esperado',
      'Métrica de Sucesso',
      'Status',
    ],
    ...actions.map((a) => [
      translatePriority(a.priority),
      a.title,
      a.problem,
      a.action,
      a.expectedImpact,
      a.successMetric,
      translateStatus(a.status),
    ]),
  ];

  const actionsSheet = XLSX.utils.aoa_to_sheet(actionsData);
  actionsSheet['!cols'] = [
    { wch: 12 },
    { wch: 30 },
    { wch: 40 },
    { wch: 40 },
    { wch: 30 },
    { wch: 25 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(workbook, actionsSheet, 'Plano de Ação');

  const filename = `plano-acao-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

// ============================================================================
// CSV EXPORT FUNCTIONS (for Google Sheets)
// ============================================================================

export function generateInsightsCsv(
  healthScore: number,
  healthLevel: string,
  summary: string,
  insights: InsightExport[],
  alerts: AlertExport[],
  actions: ActionPlanItemExport[]
): string {
  const lines: string[] = [];

  // Section: Summary
  lines.push('=== RESUMO ===');
  lines.push(`Health Score,${healthScore}`);
  lines.push(`Nível,${translateLevel(healthLevel)}`);
  lines.push(`Resumo,"${summary.replace(/"/g, '""')}"`);
  lines.push('');

  // Section: Insights
  lines.push('=== DESCOBERTAS ===');
  lines.push('Tipo,Texto,Impacto,Confiança,Métrica');
  insights.forEach((i) => {
    lines.push(
      `${translateType(i.type)},"${i.text.replace(/"/g, '""')}",${i.impact || '-'},${i.confidence || '-'},${i.metric || '-'}`
    );
  });
  lines.push('');

  // Section: Alerts
  lines.push('=== ALERTAS ===');
  lines.push('Severidade,Mensagem,Cohort');
  alerts.forEach((a) => {
    lines.push(
      `${a.severity === 'critical' ? 'Crítico' : 'Aviso'},"${a.message.replace(/"/g, '""')}",${a.cohort || '-'}`
    );
  });
  lines.push('');

  // Section: Action Plan
  if (actions.length > 0) {
    lines.push('=== PLANO DE AÇÃO ===');
    lines.push(
      'Prioridade,Título,Problema,Ação,Impacto Esperado,Métrica de Sucesso,Status'
    );
    actions.forEach((a) => {
      lines.push(
        `${translatePriority(a.priority)},"${a.title.replace(/"/g, '""')}","${a.problem.replace(/"/g, '""')}","${a.action.replace(/"/g, '""')}","${a.expectedImpact.replace(/"/g, '""')}","${a.successMetric.replace(/"/g, '""')}",${translateStatus(a.status)}`
      );
    });
  }

  return lines.join('\n');
}

// ============================================================================
// GOOGLE SHEETS INTEGRATION
// ============================================================================

export async function openGoogleSheetsWithData(csvContent: string): Promise<void> {
  // Copy CSV to clipboard
  await navigator.clipboard.writeText(csvContent);

  // Open Google Sheets in a new tab
  window.open('https://sheets.new', '_blank');
}

// ============================================================================
// FULL TEXT EXPORT (for clipboard)
// ============================================================================

export function generateInsightsText(
  healthScore: number,
  healthLevel: string,
  summary: string,
  benchmarkComparison: string,
  insights: InsightExport[],
  alerts: AlertExport[],
  actions: ActionPlanItemExport[]
): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════');
  lines.push('RELATÓRIO DE INSIGHTS - COHORT ANALYTICS');
  lines.push(`Data: ${new Date().toLocaleDateString('pt-BR')}`);
  lines.push('═══════════════════════════════════════════════');
  lines.push('');

  lines.push('📊 DIAGNÓSTICO GERAL');
  lines.push('───────────────────────────────────────────────');
  lines.push(`Health Score: ${healthScore}/100 (${translateLevel(healthLevel)})`);
  lines.push('');
  lines.push('Resumo:');
  lines.push(summary);
  lines.push('');
  lines.push('Comparação com Benchmark:');
  lines.push(benchmarkComparison);
  lines.push('');

  lines.push('💡 DESCOBERTAS');
  lines.push('───────────────────────────────────────────────');
  insights.forEach((i, idx) => {
    lines.push(`${idx + 1}. [${translateType(i.type).toUpperCase()}] ${i.text}`);
    if (i.impact) lines.push(`   Impacto: ${i.impact}`);
    if (i.metric) lines.push(`   Métrica: ${i.metric}`);
    lines.push('');
  });

  if (alerts.length > 0) {
    lines.push('⚠️ ALERTAS');
    lines.push('───────────────────────────────────────────────');
    alerts.forEach((a, idx) => {
      const icon = a.severity === 'critical' ? '🔴' : '🟡';
      lines.push(`${idx + 1}. ${icon} ${a.message}`);
      if (a.cohort) lines.push(`   Cohort: ${a.cohort}`);
      lines.push('');
    });
  }

  if (actions.length > 0) {
    lines.push('🎯 PLANO DE AÇÃO');
    lines.push('───────────────────────────────────────────────');
    actions.forEach((a, idx) => {
      lines.push(`${idx + 1}. ${a.title} [${translatePriority(a.priority)}]`);
      lines.push(`   Problema: ${a.problem}`);
      lines.push(`   Ação: ${a.action}`);
      lines.push(`   Impacto: ${a.expectedImpact}`);
      lines.push(`   Métrica: ${a.successMetric}`);
      lines.push(`   Status: ${translateStatus(a.status)}`);
      lines.push('');
    });
  }

  return lines.join('\n');
}
