import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface AnimatedBackgroundProps {
  showGrid?: boolean;
  showOrbs?: boolean;
  showParticles?: boolean;
  className?: string;
}

export function AnimatedBackground({
  showGrid = true,
  showOrbs = true,
  showParticles = true,
  className,
}: AnimatedBackgroundProps) {
  // Generate particles with stable random positions
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 4}s`,
        duration: `${3 + Math.random() * 4}s`,
      })),
    []
  );

  return (
    <div className={cn("fixed inset-0 pointer-events-none", className)}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-black" />

      {/* Tech grid pattern */}
      {showGrid && <div className="absolute inset-0 tech-grid-50 opacity-50" />}

      {/* Floating orbs */}
      {showOrbs && (
        <>
          <div className="orb orb-cyan w-96 h-96 -top-48 -left-48 animate-pulse-slow" />
          <div
            className="orb orb-teal w-80 h-80 top-1/3 -right-40 animate-pulse-slow"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="orb orb-cyan w-64 h-64 bottom-20 left-1/4 animate-pulse-slow"
            style={{ animationDelay: "4s" }}
          />
          <div
            className="orb orb-teal w-72 h-72 -bottom-36 right-1/3 animate-pulse-slow"
            style={{ animationDelay: "1s" }}
          />
        </>
      )}

      {/* Floating particles */}
      {showParticles &&
        particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 bg-cyan-400/60 rounded-full animate-pulse"
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
    </div>
  );
}
