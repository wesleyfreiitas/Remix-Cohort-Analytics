import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const TEMPLATE_HEADERS = [
  'customer_id',
  'subscription_start_date',
  'subscription_end_date',
  'plan_type',
  'mrr',
  'acquisition_channel'
];

const TEMPLATE_DATA = [
  ['CLI001', '2024-01-15', '', 'Premium', '297', 'Orgânico'],
  ['CLI002', '2024-01-20', '2024-04-20', 'Básico', '97', 'Google Ads'],
  ['CLI003', '2024-02-01', '', 'Premium', '297', 'Indicação'],
  ['CLI004', '2024-02-10', '2024-03-10', 'Básico', '97', 'Instagram'],
  ['CLI005', '2024-02-15', '', 'Enterprise', '997', 'Comercial'],
];

const INSTRUCTIONS_DATA = [
  ['Campo', 'Descrição', 'Formato', 'Obrigatório'],
  ['customer_id', 'Identificador único do cliente', 'Texto ou número', 'Sim'],
  ['subscription_start_date', 'Data de início da assinatura', 'AAAA-MM-DD', 'Sim'],
  ['subscription_end_date', 'Data de cancelamento (vazio se ativo)', 'AAAA-MM-DD', 'Não'],
  ['plan_type', 'Nome do plano contratado', 'Texto', 'Não'],
  ['mrr', 'Receita recorrente mensal em R$', 'Número', 'Não'],
  ['acquisition_channel', 'Canal de aquisição do cliente', 'Texto', 'Não'],
  [],
  ['Dicas importantes:'],
  ['• Mantenha os nomes das colunas exatamente como no modelo'],
  ['• Use o formato de data AAAA-MM-DD (ex: 2024-01-15)'],
  ['• Deixe subscription_end_date vazio para clientes ativos'],
  ['• Remova as linhas de exemplo antes de importar seus dados'],
];

export function downloadTemplateCsv(): void {
  const csvContent = [
    TEMPLATE_HEADERS.join(','),
    ...TEMPLATE_DATA.map(row => row.join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'modelo_cohort_analytics.csv';
  link.click();
  
  URL.revokeObjectURL(link.href);
  toast.success('Download iniciado!');
}

export function downloadTemplateExcel(): void {
  const workbook = XLSX.utils.book_new();
  
  // Aba Dados
  const dataSheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_DATA]);
  XLSX.utils.book_append_sheet(workbook, dataSheet, 'Dados');
  
  // Aba Instruções
  const instructionsSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS_DATA);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instruções');
  
  // Download
  XLSX.writeFile(workbook, 'modelo_cohort_analytics.xlsx');
  toast.success('Download iniciado!');
}
