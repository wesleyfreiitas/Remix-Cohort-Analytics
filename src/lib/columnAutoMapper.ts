import { ColumnMapping } from '@/contexts/DataContext';

/**
 * Normaliza string para comparação: 
 * - lowercase
 * - remove acentos
 * - remove caracteres especiais
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, ''); // Remove caracteres especiais
}

/**
 * Mapa de sinônimos para cada campo.
 * Cada chave representa um campo do mapeamento e contém
 * uma lista de variações normalizadas reconhecidas.
 */
const COLUMN_SYNONYMS: Record<keyof ColumnMapping, string[]> = {
  customerId: [
    'customerid', 'idcliente', 'clienteid', 'userid', 'id', 'cliente',
    'customer', 'idclient', 'clientid', 'codigocliente', 'codcliente',
    'numerocliente', 'iduser', 'usuario', 'idusuario'
  ],
  startDate: [
    'subscriptionstartdate', 'startdate', 'datainicio', 'dataassinatura',
    'createdat', 'inicio', 'datacriacao', 'dataentrada', 'dataadesao',
    'datacontratacao', 'datastart', 'started', 'inicioen', 'datacadastro',
    'signupdate', 'joindate', 'entrydate'
  ],
  churnDate: [
    'subscriptionenddate', 'enddate', 'churndate', 'datacancelamento',
    'canceledat', 'cancelamento', 'datafim', 'datasaida', 'datachurn',
    'churnedat', 'canceled', 'cancelled', 'canceldate', 'datacancel',
    'exitdate', 'terminationdate'
  ],
  planType: [
    'plantype', 'plano', 'tipoplano', 'plan', 'subscriptiontype', 'tipo',
    'tipoassinatura', 'planname', 'nomeplano', 'produto', 'product',
    'subscription', 'assinatura', 'categoria', 'category', 'tier'
  ],
  mrr: [
    'mrr', 'receita', 'revenue', 'valor', 'monthlyrevenue', 'receitamensal',
    'monthly', 'valormensal', 'mensalidade', 'price', 'preco', 'amount',
    'recorrente', 'recurring', 'arpu', 'ticket'
  ],
  acquisitionChannel: [
    'acquisitionchannel', 'canal', 'channel', 'origem', 'source', 'aquisicao',
    'canalaquisicao', 'canalorigem', 'fonte', 'utmsource', 'marketing',
    'referral', 'indicacao', 'campanha', 'campaign', 'medio', 'medium'
  ],
};

export interface AutoMapResult {
  mapping: ColumnMapping;
  autoMappedFields: Set<keyof ColumnMapping>;
}

/**
 * Detecta automaticamente o mapeamento de colunas baseado nos headers do arquivo.
 * 
 * @param headers - Lista de headers do arquivo importado
 * @returns Objeto com o mapeamento detectado e quais campos foram auto-mapeados
 */
export function autoMapColumns(headers: string[]): AutoMapResult {
  const mapping: ColumnMapping = {
    customerId: null,
    startDate: null,
    churnDate: null,
    planType: null,
    mrr: null,
    acquisitionChannel: null,
  };
  
  const autoMappedFields = new Set<keyof ColumnMapping>();
  const usedHeaders = new Set<string>();
  
  // Processa headers em ordem de prioridade (campos obrigatórios primeiro)
  const fieldPriority: (keyof ColumnMapping)[] = [
    'customerId',
    'startDate', 
    'churnDate',
    'mrr',
    'planType',
    'acquisitionChannel'
  ];
  
  for (const field of fieldPriority) {
    const synonyms = COLUMN_SYNONYMS[field];
    
    for (const header of headers) {
      // Pula headers já mapeados
      if (usedHeaders.has(header)) continue;
      
      const normalized = normalizeString(header);
      
      // Verifica se o header normalizado corresponde a algum sinônimo
      const isMatch = synonyms.some(syn => 
        normalized === syn || 
        normalized.includes(syn) || 
        syn.includes(normalized)
      );
      
      if (isMatch) {
        mapping[field] = header; // Usa o nome original do header
        autoMappedFields.add(field);
        usedHeaders.add(header);
        break;
      }
    }
  }
  
  return { mapping, autoMappedFields };
}

/**
 * Conta quantos campos foram mapeados automaticamente
 */
export function countMappedFields(mapping: ColumnMapping): number {
  return Object.values(mapping).filter(Boolean).length;
}
