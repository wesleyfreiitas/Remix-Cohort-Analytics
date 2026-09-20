import { ReactNode } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  secondarySubtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  badge?: {
    text: string;
    variant: "success" | "warning" | "neutral";
  };
  largeValue?: boolean;
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  secondarySubtitle,
  icon, 
  trend, 
  badge,
  largeValue = false,
  className 
}: MetricCardProps) {
  const getBadgeStyles = (variant: "success" | "warning" | "neutral") => {
    switch (variant) {
      case "success":
        return "text-emerald-400";
      case "warning":
        return "text-yellow-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className={cn("metric-card group", className)}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={cn(
              "font-bold text-foreground",
              largeValue ? "text-4xl" : "text-3xl"
            )}>
              {value}
            </span>
            {badge && (
              <span className={cn("text-sm font-medium", getBadgeStyles(badge.variant))}>
                ({badge.text})
              </span>
            )}
            {trend && (
              <span className={cn(
                "text-sm font-medium flex items-center gap-0.5",
                trend.isPositive ? "text-emerald-400" : "text-red-400"
              )}>
                {trend.isPositive ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
          {secondarySubtitle && (
            <span className="text-xs text-primary">{secondarySubtitle}</span>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
          {icon}
        </div>
      </div>
    </div>
  );
}
