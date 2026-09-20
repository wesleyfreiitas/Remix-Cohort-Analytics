-- Criar tipo enum para status
CREATE TYPE public.action_plan_status AS ENUM ('pending', 'in_progress', 'completed', 'archived');

-- Criar tipo enum para prioridade
CREATE TYPE public.action_plan_priority AS ENUM ('alta', 'media', 'baixa');

-- Tabela de planos de ação
CREATE TABLE public.action_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    priority action_plan_priority NOT NULL DEFAULT 'media',
    problem TEXT NOT NULL,
    action TEXT NOT NULL,
    expected_impact TEXT NOT NULL,
    success_metric TEXT NOT NULL,
    status action_plan_status NOT NULL DEFAULT 'pending',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_action_plans_user_id ON public.action_plans(user_id);
CREATE INDEX idx_action_plans_analysis_id ON public.action_plans(analysis_id);
CREATE INDEX idx_action_plans_status ON public.action_plans(status);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_action_plans_updated_at
    BEFORE UPDATE ON public.action_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;

-- Política: usuários gerenciam apenas seus próprios planos
CREATE POLICY "Users can manage their own action plans"
    ON public.action_plans
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);