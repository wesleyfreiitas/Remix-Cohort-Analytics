-- Tabela de análises
CREATE TABLE public.analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    file_name TEXT,
    column_mapping JSONB NOT NULL,
    total_customers INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de clientes da análise
CREATE TABLE public.analysis_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    churn_date DATE,
    plan_type TEXT,
    mrr NUMERIC(12,2),
    acquisition_channel TEXT
);

-- Índices para performance
CREATE INDEX idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX idx_analysis_customers_analysis_id ON public.analysis_customers(analysis_id);

-- RLS
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_customers ENABLE ROW LEVEL SECURITY;

-- Políticas para analyses
CREATE POLICY "Users can manage their own analyses"
ON public.analyses FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Políticas para analysis_customers (via JOIN)
CREATE POLICY "Users can access customers from their analyses"
ON public.analysis_customers FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.analyses
        WHERE analyses.id = analysis_customers.analysis_id
        AND analyses.user_id = auth.uid()
    )
);

-- Trigger para updated_at
CREATE TRIGGER update_analyses_updated_at
BEFORE UPDATE ON public.analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();