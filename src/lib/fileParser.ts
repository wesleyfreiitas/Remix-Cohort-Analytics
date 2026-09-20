import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedData {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export function detectFileType(file: File): 'csv' | 'excel' | 'unknown' {
  const extension = file.name.toLowerCase().split('.').pop();
  const mimeType = file.type;

  if (extension === 'csv' || mimeType === 'text/csv') {
    return 'csv';
  }
  
  if (
    extension === 'xlsx' || 
    extension === 'xls' || 
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel'
  ) {
    return 'excel';
  }

  return 'unknown';
}

export function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, any>[];
        
        resolve({
          headers,
          rows,
          totalRows: rows.length,
        });
      },
      error: (error) => {
        reject(new Error(`Erro ao processar CSV: ${error.message}`));
      },
    });
  });
}

export async function parseExcel(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Get raw data with headers
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        if (rawData.length === 0) {
          resolve({ headers: [], rows: [], totalRows: 0 });
          return;
        }

        // First row is headers
        const headers = rawData[0].map((h: any) => String(h || '').trim());
        
        // Convert remaining rows to objects
        const rows = rawData.slice(1).map((row) => {
          const obj: Record<string, any> = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] ?? '';
          });
          return obj;
        }).filter((row) => {
          // Filter out empty rows
          return Object.values(row).some((val) => val !== '' && val !== null && val !== undefined);
        });

        resolve({
          headers,
          rows,
          totalRows: rows.length,
        });
      } catch (error) {
        reject(new Error(`Erro ao processar Excel: ${(error as Error).message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };

    reader.readAsArrayBuffer(file);
  });
}

export async function parseFile(file: File): Promise<ParsedData> {
  const fileType = detectFileType(file);

  switch (fileType) {
    case 'csv':
      return parseCSV(file);
    case 'excel':
      return parseExcel(file);
    default:
      throw new Error('Formato de arquivo não suportado. Use CSV ou Excel (.xlsx, .xls)');
  }
}
