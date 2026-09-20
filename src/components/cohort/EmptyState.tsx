import { Table } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function EmptyState() {
  return (
    <div className="glass-card p-8">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50 mb-6">
          <Table className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Nenhum dado para exibir
        </h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Importe um arquivo na página de Importação ou carregue uma análise salva para visualizar métricas e a matriz de cohort.
        </p>
        <Button asChild className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90">
          <Link to="/dashboard">
            Importar Dados
          </Link>
        </Button>
      </div>
    </div>
  );
}
