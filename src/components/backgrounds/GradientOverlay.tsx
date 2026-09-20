import { cn } from "@/lib/utils";

interface GradientOverlayProps {
  direction?: "to-b" | "to-t" | "to-r" | "to-l" | "to-br" | "to-tr";
  intensity?: "subtle" | "medium" | "strong";
  className?: string;
}

const directionClasses = {
  "to-b": "bg-gradient-to-b",
  "to-t": "bg-gradient-to-t",
  "to-r": "bg-gradient-to-r",
  "to-l": "bg-gradient-to-l",
  "to-br": "bg-gradient-to-br",
  "to-tr": "bg-gradient-to-tr",
};

const intensityClasses = {
  subtle: "from-cyan-500/5 to-transparent",
  medium: "from-cyan-500/10 to-transparent",
  strong: "from-cyan-500/20 to-transparent",
};

export function GradientOverlay({
  direction = "to-b",
  intensity = "subtle",
  className,
}: GradientOverlayProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none rounded-[inherit] z-0",
        directionClasses[direction],
        intensityClasses[intensity],
        className
      )}
    />
  );
}
