import { Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface HealthScoreCardProps {
  score: number;
  level: "excellent" | "attention" | "critical";
  summary: string;
  benchmarkComparison: string;
  isLoading?: boolean;
}

export function HealthScoreCard({
  score,
  level,
  summary,
  benchmarkComparison,
  isLoading,
}: HealthScoreCardProps) {
  const getGradientColors = () => {
    switch (level) {
      case "excellent":
        return "from-emerald-400 to-green-500";
      case "attention":
        return "from-yellow-400 to-amber-500";
      case "critical":
        return "from-red-400 to-rose-500";
      default:
        return "from-gray-400 to-gray-500";
    }
  };

  const getLevelLabel = () => {
    switch (level) {
      case "excellent":
        return "Excelente";
      case "attention":
        return "Atenção";
      case "critical":
        return "Crítico";
      default:
        return "";
    }
  };

  const getLevelColor = () => {
    switch (level) {
      case "excellent":
        return "text-emerald-400";
      case "attention":
        return "text-yellow-400";
      case "critical":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-gray-700/50 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-5 w-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-foreground">Diagnóstico Geral</h3>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              <Skeleton className="w-full h-full rounded-full" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-gray-700"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    {level === "excellent" && (
                      <>
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </>
                    )}
                    {level === "attention" && (
                      <>
                        <stop offset="0%" stopColor="#facc15" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </>
                    )}
                    {level === "critical" && (
                      <>
                        <stop offset="0%" stopColor="#f87171" />
                        <stop offset="100%" stopColor="#f43f5e" />
                      </>
                    )}
                  </linearGradient>
                </defs>
              </svg>
              {/* Score number */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold bg-gradient-to-r ${getGradientColors()} bg-clip-text text-transparent`}>
                  {score}
                </span>
                <span className="text-xs text-muted-foreground">Saúde</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <span className={`text-sm font-medium ${getLevelColor()}`}>
              {getLevelLabel()}
            </span>
          </div>

          <p className="text-sm text-gray-300 leading-relaxed">
            {summary}
          </p>

          <div className="pt-2 border-t border-gray-700/50">
            <p className="text-xs text-muted-foreground">
              📊 {benchmarkComparison}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
