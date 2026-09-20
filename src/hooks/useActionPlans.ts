import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ActionPlanItem } from "@/components/insights/ActionCard";

interface DbActionPlan {
  id: string;
  user_id: string;
  analysis_id: string | null;
  title: string;
  priority: "alta" | "media" | "baixa";
  problem: string;
  action: string;
  expected_impact: string;
  success_metric: string;
  status: "pending" | "in_progress" | "completed" | "archived";
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapDbToLocal(db: DbActionPlan): ActionPlanItem {
  return {
    id: db.id,
    priority: db.priority,
    title: db.title,
    problem: db.problem,
    action: db.action,
    expectedImpact: db.expected_impact,
    successMetric: db.success_metric,
    status: db.status === "archived" ? "completed" : db.status,
  };
}

function mapLocalToDb(
  item: ActionPlanItem,
  userId: string,
  analysisId: string | null,
  sortOrder: number
): Omit<DbActionPlan, "id" | "created_at" | "updated_at"> {
  return {
    user_id: userId,
    analysis_id: analysisId,
    title: item.title,
    priority: item.priority,
    problem: item.problem,
    action: item.action,
    expected_impact: item.expectedImpact,
    success_metric: item.successMetric,
    status: item.status,
    sort_order: sortOrder,
  };
}

export function useActionPlans(analysisId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query: fetch user's action plans
  const {
    data: actionPlans = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["action-plans", user?.id, analysisId],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from("action_plans")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "archived")
        .order("sort_order", { ascending: true });

      if (analysisId) {
        query = query.eq("analysis_id", analysisId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as DbActionPlan[]).map(mapDbToLocal);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation: bulk save action plans (replaces existing non-archived)
  const bulkSaveMutation = useMutation({
    mutationFn: async ({
      plans,
      targetAnalysisId,
    }: {
      plans: ActionPlanItem[];
      targetAnalysisId?: string | null;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Delete existing non-archived plans for this user/analysis
      const deleteQuery = supabase
        .from("action_plans")
        .delete()
        .eq("user_id", user.id)
        .neq("status", "archived");

      if (targetAnalysisId) {
        deleteQuery.eq("analysis_id", targetAnalysisId);
      } else {
        deleteQuery.is("analysis_id", null);
      }

      await deleteQuery;

      // Insert new plans
      if (plans.length > 0) {
        const rows = plans.map((p, i) =>
          mapLocalToDb(p, user.id, targetAnalysisId || null, i)
        );

        const { error } = await supabase.from("action_plans").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-plans"] });
    },
  });

  // Mutation: update single action plan
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<ActionPlanItem, "status" | "title" | "problem" | "action" | "expectedImpact" | "successMetric">>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.problem !== undefined) dbUpdates.problem = updates.problem;
      if (updates.action !== undefined) dbUpdates.action = updates.action;
      if (updates.expectedImpact !== undefined) dbUpdates.expected_impact = updates.expectedImpact;
      if (updates.successMetric !== undefined) dbUpdates.success_metric = updates.successMetric;

      const { error } = await supabase
        .from("action_plans")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-plans"] });
    },
  });

  // Mutation: archive (soft delete) action plan
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("action_plans")
        .update({ status: "archived" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-plans"] });
    },
  });

  // Mutation: delete action plan permanently
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("action_plans")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-plans"] });
    },
  });

  // Mutation: link orphan action plans to an analysis
  const linkToAnalysisMutation = useMutation({
    mutationFn: async ({ analysisId }: { analysisId: string }) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Update all user's action plans that don't have an analysis_id
      const { error } = await supabase
        .from("action_plans")
        .update({ analysis_id: analysisId })
        .eq("user_id", user.id)
        .is("analysis_id", null)
        .neq("status", "archived");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-plans"] });
    },
  });

  return {
    actionPlans,
    isLoading,
    error,
    bulkSaveActionPlans: bulkSaveMutation.mutateAsync,
    updateActionPlan: updateMutation.mutateAsync,
    archiveActionPlan: archiveMutation.mutateAsync,
    deleteActionPlan: deleteMutation.mutateAsync,
    linkActionsToAnalysis: linkToAnalysisMutation.mutateAsync,
    isSaving: bulkSaveMutation.isPending,
    isUpdating: updateMutation.isPending,
    isLinking: linkToAnalysisMutation.isPending,
  };
}
