import React, { createContext, useContext, useState, useCallback } from 'react';
import { ParsedData } from '@/lib/fileParser';

export interface ColumnMapping {
  customerId: string | null;
  startDate: string | null;
  churnDate: string | null;
  planType: string | null;
  mrr: string | null;
  acquisitionChannel: string | null;
}

export interface ProcessedCustomer {
  customerId: string;
  startDate: Date;
  churnDate: Date | null;
  planType: string | null;
  mrr: number | null;
  acquisitionChannel: string | null;
  isActive: boolean;
}

interface DataContextType {
  rawData: ParsedData | null;
  columnMapping: ColumnMapping;
  processedData: ProcessedCustomer[] | null;
  setRawData: (data: ParsedData | null) => void;
  updateColumnMapping: (field: keyof ColumnMapping, value: string | null) => void;
  setColumnMapping: (mapping: ColumnMapping) => void;
  processData: () => void;
  clearData: () => void;
  isProcessing: boolean;
  // Analysis persistence
  currentAnalysisId: string | null;
  setCurrentAnalysisId: (id: string | null) => void;
  analysisName: string | null;
  setAnalysisName: (name: string | null) => void;
  setProcessedDataFromAnalysis: (customers: ProcessedCustomer[]) => void;
}

const initialColumnMapping: ColumnMapping = {
  customerId: null,
  startDate: null,
  churnDate: null,
  planType: null,
  mrr: null,
  acquisitionChannel: null,
};

const DataContext = createContext<DataContextType | undefined>(undefined);

function parseDate(value: any): Date | null {
  if (!value) return null;
  
  // Try different date formats
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try DD/MM/YYYY format (common in Brazil)
  if (typeof value === 'string') {
    const parts = value.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      const parsedDate = new Date(year, month - 1, day);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
  }
  
  return null;
}

function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  // Handle Brazilian number format (1.234,56)
  const strValue = String(value).replace(/\./g, '').replace(',', '.');
  const num = parseFloat(strValue);
  
  return isNaN(num) ? null : num;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [rawData, setRawData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(initialColumnMapping);
  const [processedData, setProcessedData] = useState<ProcessedCustomer[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [analysisName, setAnalysisName] = useState<string | null>(null);

  const setProcessedDataFromAnalysis = useCallback((customers: ProcessedCustomer[]) => {
    setProcessedData(customers);
    setRawData(null); // Clear raw data when loading from analysis
  }, []);

  const updateColumnMapping = useCallback((field: keyof ColumnMapping, value: string | null) => {
    setColumnMapping((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const processData = useCallback(() => {
    if (!rawData || !columnMapping.customerId || !columnMapping.startDate) {
      return;
    }

    setIsProcessing(true);

    try {
      const processed: ProcessedCustomer[] = rawData.rows.map((row) => {
        const startDate = parseDate(row[columnMapping.startDate!]);
        const churnDate = columnMapping.churnDate ? parseDate(row[columnMapping.churnDate]) : null;
        
        return {
          customerId: String(row[columnMapping.customerId!] || ''),
          startDate: startDate || new Date(),
          churnDate,
          planType: columnMapping.planType ? String(row[columnMapping.planType] || '') : null,
          mrr: columnMapping.mrr ? parseNumber(row[columnMapping.mrr]) : null,
          acquisitionChannel: columnMapping.acquisitionChannel 
            ? String(row[columnMapping.acquisitionChannel] || '') 
            : null,
          isActive: !churnDate,
        };
      }).filter((customer) => customer.customerId && customer.startDate);

      setProcessedData(processed);
    } catch (error) {
      console.error('Erro ao processar dados:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [rawData, columnMapping]);

  const clearData = useCallback(() => {
    setRawData(null);
    setColumnMapping(initialColumnMapping);
    setProcessedData(null);
    setCurrentAnalysisId(null);
    setAnalysisName(null);
  }, []);

  return (
    <DataContext.Provider
      value={{
        rawData,
        columnMapping,
        processedData,
        setRawData,
        updateColumnMapping,
        setColumnMapping,
        processData,
        clearData,
        isProcessing,
        currentAnalysisId,
        setCurrentAnalysisId,
        analysisName,
        setAnalysisName,
        setProcessedDataFromAnalysis,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
