import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Alert {
  severity: "warning" | "critical";
  message: string;
  cohort?: string;
}

interface AlertsCardProps {
  alerts: Alert[];
  isLoading?: boolean;
}

export function AlertsCard({ alerts, isLoading }: AlertsCardProps) {
  const hasAlerts = alerts.length > 0;

  return (
    <div
      className={`bg-gray-900/80 backdrop-blur-xl rounded-3xl border p-6 ${
        hasAlerts ? "border-yellow-500/50" : "border-gray-700/50"
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-5 w-5 ${hasAlerts ? "text-yellow-400" : "text-gray-500"}`} />
          <h3 className="text-lg font-semibold text-foreground">Alertas Críticos</h3>
        </div>
        {hasAlerts && (
          <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
            {alerts.length}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ) : !hasAlerts ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            ✅ Nenhum alerta crítico no momento
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-xl ${
                alert.severity === "critical"
                  ? "bg-red-500/10 border border-red-500/30"
                  : "bg-yellow-500/10 border border-yellow-500/30"
              }`}
            >
              <AlertTriangle
                className={`h-4 w-4 flex-shrink-0 ${
                  alert.severity === "critical" ? "text-red-400" : "text-yellow-400"
                }`}
              />
              <div className="flex-1">
                <p className="text-sm text-gray-200">{alert.message}</p>
                {alert.cohort && (
                  <span className="text-xs text-muted-foreground mt-1 inline-block">
                    Cohort: {alert.cohort}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
