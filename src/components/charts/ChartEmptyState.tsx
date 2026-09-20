import { LineChart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function ChartEmptyState() {
  return (
    <div className="glass-card p-8">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/30 mb-6">
          <LineChart className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Nenhum dado para visualizar
        </h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Importe uma planilha no Dashboard para ver os gráficos de retenção
        </p>
        <Link to="/dashboard">
          <Button className="btn-gradient">
            Ir para Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
