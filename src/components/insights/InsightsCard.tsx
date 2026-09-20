import { Lightbulb, CheckCircle, XCircle, AlertCircle, TrendingUp, Zap, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Insight {
  type: "positive" | "negative" | "opportunity" | "warning" | "trend" | "prediction";
  text: string;
  impact?: "high" | "medium" | "low";
  confidence?: "high" | "medium" | "low";
  metric?: string;
}

interface InsightsCardProps {
  insights: Insight[];
  isLoading?: boolean;
}

export function InsightsCard({ insights, isLoading }: InsightsCardProps) {
  const getInsightIcon = (type: Insight["type"]) => {
    switch (type) {
      case "positive":
        return <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />;
      case "negative":
        return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />;
      case "opportunity":
        return <Zap className="h-4 w-4 text-yellow-400 flex-shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-orange-400 flex-shrink-0" />;
      case "trend":
        return <TrendingUp className="h-4 w-4 text-blue-400 flex-shrink-0" />;
      case "prediction":
        return <AlertCircle className="h-4 w-4 text-purple-400 flex-shrink-0" />;
    }
  };

  const getInsightBg = (type: Insight["type"]) => {
    switch (type) {
      case "positive":
        return "bg-emerald-500/10";
      case "negative":
        return "bg-red-500/10";
      case "opportunity":
        return "bg-yellow-500/10";
      case "warning":
        return "bg-orange-500/10";
      case "trend":
        return "bg-blue-500/10";
      case "prediction":
        return "bg-purple-500/10";
    }
  };

  const getConfidenceBadge = (confidence?: string) => {
    if (!confidence) return null;
    const colors = {
      high: "bg-emerald-500/20 text-emerald-300",
      medium: "bg-yellow-500/20 text-yellow-300",
      low: "bg-orange-500/20 text-orange-300",
    };
    return (
      <Badge className={`text-xs ${colors[confidence as keyof typeof colors] || colors.medium}`}>
        {confidence === 'high' ? 'Alta confiança' : confidence === 'medium' ? 'Média confiança' : 'Baixa confiança'}
      </Badge>
    );
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="h-5 w-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-foreground">Principais Descobertas</h3>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ) : insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma descoberta disponível ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-xl ${getInsightBg(insight.type)}`}
            >
              {getInsightIcon(insight.type)}
              <div className="flex-1">
                <p className="text-sm text-gray-200 leading-relaxed">
                  {insight.text}
                </p>
                {(insight.confidence || insight.metric) && (
                  <div className="flex items-center gap-2 mt-2">
                    {insight.metric && (
                      <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                        {insight.metric}
                      </Badge>
                    )}
                    {getConfidenceBadge(insight.confidence)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
