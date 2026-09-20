import { MainLayout } from "@/components/layout/MainLayout";
import { FileUpload } from "@/components/dashboard/FileUpload";
import { AnalysisHistory } from "@/components/dashboard/AnalysisHistory";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gradient">Importar Dados</h1>
          <p className="text-muted-foreground">
            Faça upload de um arquivo ou carregue uma análise salva
          </p>
        </div>

        {/* Upload Section */}
        <FileUpload />

        {/* Instructions */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Como usar</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="text-primary font-medium">1.</span> Faça upload de um arquivo CSV ou Excel com os dados de transações dos seus clientes.
            </p>
            <p>
              <span className="text-primary font-medium">2.</span> O arquivo deve conter pelo menos as colunas: <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">ID do Cliente</code> e <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">Data de Início</code>.
            </p>
            <p>
              <span className="text-primary font-medium">3.</span> Mapeie as colunas do seu arquivo e clique em "Processar Dados" para visualizar os gráficos de retenção.
            </p>
            <p>
              <span className="text-primary font-medium">4.</span> Após processar, navegue para <strong className="text-foreground">Análise de Cohort</strong> para ver métricas e visualizações detalhadas.
            </p>
          </div>
        </div>

        {/* Analysis History */}
        {user && <AnalysisHistory />}
      </div>
    </MainLayout>
  );
}
