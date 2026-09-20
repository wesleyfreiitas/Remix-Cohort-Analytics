import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AdvancedMetrics as AdvancedMetricsType } from "@/lib/metricsCalculations";

interface AdvancedMetricsProps {
  metrics: AdvancedMetricsType;
}

export function AdvancedMetrics({ metrics }: AdvancedMetricsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="glass-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/10 transition-colors rounded-lg">
          <span className="text-lg font-semibold text-foreground">Métricas Detalhadas</span>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Retenção M1 */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Retenção M1</span>
                <p className="text-lg font-semibold text-foreground">
                  {metrics.retentionM1 > 0 ? `${metrics.retentionM1}%` : '-'}
                </p>
              </div>

              {/* Retenção M6 */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Retenção M6</span>
                <p className="text-lg font-semibold text-foreground">
                  {metrics.retentionM6 > 0 ? `${metrics.retentionM6}%` : '-'}
                </p>
              </div>

              {/* Retenção M12 */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Retenção M12</span>
                <p className="text-lg font-semibold text-foreground">
                  {metrics.retentionM12 > 0 ? `${metrics.retentionM12}%` : '-'}
                </p>
              </div>

              {/* Churn Médio */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Churn Médio</span>
                <p className="text-lg font-semibold text-foreground">
                  {metrics.avgMonthlyChurn > 0 ? `${metrics.avgMonthlyChurn}%` : '-'}
                </p>
              </div>

              {/* Melhor Cohort */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Melhor Cohort</span>
                <p className="text-lg font-semibold text-primary">
                  {metrics.bestCohort ? metrics.bestCohort.label : '-'}
                </p>
                {metrics.bestCohort && (
                  <span className="text-xs text-muted-foreground">
                    ({metrics.bestCohort.retention}% M3)
                  </span>
                )}
              </div>

              {/* Maior Churn */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Maior Churn</span>
                <p className="text-lg font-semibold text-destructive">
                  {metrics.worstCohort ? metrics.worstCohort.label : '-'}
                </p>
                {metrics.worstCohort && (
                  <span className="text-xs text-muted-foreground">
                    ({metrics.worstCohort.churn}% churn)
                  </span>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
