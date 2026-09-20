import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function EmptyInsightsState() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Brain className="h-16 w-16 text-gray-500 mb-6" />
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        Importe seus dados para começar
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        A análise inteligente será ativada automaticamente assim que você importar seus dados de cohort.
      </p>
      <Button
        onClick={() => navigate("/dashboard")}
        className="bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-500 hover:to-teal-500 text-gray-900 font-medium"
      >
        Ir para Dashboard
      </Button>
    </div>
  );
}
