import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { ColumnMapping, ProcessedCustomer } from '@/contexts/DataContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// Converte "2024-01-08" para Date sem problemas de fuso horário
function parseDateFromDB(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export interface Analysis {
  id: string;
  name: string;
  description: string | null;
  fileName: string | null;
  totalCustomers: number;
  columnMapping: ColumnMapping;
  createdAt: Date;
  updatedAt: Date;
}

interface SaveAnalysisParams {
  name: string;
  description?: string;
  fileName?: string;
  columnMapping: ColumnMapping;
  customers: ProcessedCustomer[];
}

interface RenameAnalysisParams {
  id: string;
  name: string;
}

export function useAnalyses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's analyses
  const {
    data: analyses = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['analyses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data.map((row): Analysis => ({
        id: row.id,
        name: row.name,
        description: row.description,
        fileName: row.file_name,
        totalCustomers: row.total_customers,
        columnMapping: row.column_mapping as unknown as ColumnMapping,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
    },
    enabled: !!user?.id,
  });

  // Save new analysis
  const saveAnalysisMutation = useMutation({
    mutationFn: async (params: SaveAnalysisParams) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Insert analysis metadata
      const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .insert([{
          user_id: user.id,
          name: params.name,
          description: params.description || null,
          file_name: params.fileName || null,
          column_mapping: params.columnMapping as unknown as Json,
          total_customers: params.customers.length,
        }])
        .select()
        .single();

      if (analysisError) throw analysisError;

      // Insert customers in batches of 500
      const batchSize = 500;
      const customers = params.customers.map(customer => ({
        analysis_id: analysis.id,
        customer_id: customer.customerId,
        start_date: customer.startDate.toISOString().split('T')[0],
        churn_date: customer.churnDate?.toISOString().split('T')[0] || null,
        plan_type: customer.planType,
        mrr: customer.mrr,
        acquisition_channel: customer.acquisitionChannel,
      }));

      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);
        const { error: customersError } = await supabase
          .from('analysis_customers')
          .insert(batch);

        if (customersError) throw customersError;
      }

      return analysis.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses', user?.id] });
      toast.success('Análise salva com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao salvar análise:', error);
      toast.error('Erro ao salvar análise');
    },
  });

  // Load analysis with customers
  const loadAnalysis = async (analysisId: string): Promise<{
    analysis: Analysis;
    customers: ProcessedCustomer[];
  } | null> => {
    if (!user?.id) return null;

    // Fetch analysis
    const { data: analysisData, error: analysisError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (analysisError) {
      console.error('Erro ao carregar análise:', analysisError);
      toast.error('Erro ao carregar análise');
      return null;
    }

    // Fetch customers with pagination to bypass 1000 row limit
    const pageSize = 1000;
    let allCustomers: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('analysis_customers')
        .select('*')
        .eq('analysis_id', analysisId)
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('Erro ao carregar clientes:', error);
        toast.error('Erro ao carregar dados da análise');
        return null;
      }

      if (data && data.length > 0) {
        allCustomers = [...allCustomers, ...data];
        from += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    const analysis: Analysis = {
      id: analysisData.id,
      name: analysisData.name,
      description: analysisData.description,
      fileName: analysisData.file_name,
      totalCustomers: analysisData.total_customers,
      columnMapping: analysisData.column_mapping as unknown as ColumnMapping,
      createdAt: new Date(analysisData.created_at),
      updatedAt: new Date(analysisData.updated_at),
    };

    const customers: ProcessedCustomer[] = allCustomers.map(row => ({
      customerId: row.customer_id,
      startDate: parseDateFromDB(row.start_date),
      churnDate: row.churn_date ? parseDateFromDB(row.churn_date) : null,
      planType: row.plan_type,
      mrr: row.mrr ? Number(row.mrr) : null,
      acquisitionChannel: row.acquisition_channel,
      isActive: !row.churn_date,
    }));

    return { analysis, customers };
  };

  // Delete analysis
  const deleteAnalysisMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', analysisId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses', user?.id] });
      toast.success('Análise excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir análise:', error);
      toast.error('Erro ao excluir análise');
    },
  });

  // Rename analysis
  const renameAnalysisMutation = useMutation({
    mutationFn: async ({ id, name }: RenameAnalysisParams) => {
      const { error } = await supabase
        .from('analyses')
        .update({ name })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyses', user?.id] });
      toast.success('Análise renomeada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao renomear análise:', error);
      toast.error('Erro ao renomear análise');
    },
  });

  return {
    analyses,
    isLoading,
    error,
    saveAnalysis: saveAnalysisMutation.mutateAsync,
    isSaving: saveAnalysisMutation.isPending,
    loadAnalysis,
    deleteAnalysis: deleteAnalysisMutation.mutateAsync,
    isDeleting: deleteAnalysisMutation.isPending,
    renameAnalysis: renameAnalysisMutation.mutateAsync,
    isRenaming: renameAnalysisMutation.isPending,
  };
}
