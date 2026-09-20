import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { User, FileSpreadsheet, Download, Building2, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserSettings, BusinessSettings } from "@/contexts/UserSettingsContext";
import { useToast } from "@/hooks/use-toast";

const industryLabels: Record<BusinessSettings['industry'], string> = {
  auto: 'Detectar automaticamente',
  saas_b2b: 'SaaS B2B',
  saas_b2c: 'SaaS B2C',
  education: 'Educação',
  other: 'Outro',
};

const contractValueLabels: Record<BusinessSettings['averageContractValue'], string> = {
  auto: 'Detectar automaticamente',
  low: 'Baixo (< R$100)',
  medium: 'Médio (R$100-500)',
  high: 'Alto (> R$500)',
};

export default function Settings() {
  const { businessSettings, updateBusinessSettings, detectedIndustry, detectedContractValue, isSaving } = useUserSettings();
  const { toast } = useToast();
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  const handleSaveBusinessContext = async () => {
    setIsSavingLocal(true);
    try {
      await updateBusinessSettings(businessSettings);
      toast({
        title: "Configurações salvas",
        description: "Suas preferências foram sincronizadas com sua conta.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSavingLocal(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gradient">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie suas preferências e dados
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Context Card - NEW */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Contexto do Negócio</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="industry" className="text-muted-foreground">Tipo de Negócio</Label>
                <Select 
                  value={businessSettings.industry} 
                  onValueChange={(value) => updateBusinessSettings({ industry: value as BusinessSettings['industry'] })}
                >
                  <SelectTrigger id="industry" className="input-glow">
                    <SelectValue placeholder="Selecione o tipo de negócio" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(industryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                        {value === 'auto' && detectedIndustry && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (detectado: {industryLabels[detectedIndustry as keyof typeof industryLabels] || detectedIndustry})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {businessSettings.industry === 'auto' && detectedIndustry && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Detectado: {industryLabels[detectedIndustry as keyof typeof industryLabels] || detectedIndustry}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractValue" className="text-muted-foreground">Ticket Médio</Label>
                <Select 
                  value={businessSettings.averageContractValue} 
                  onValueChange={(value) => updateBusinessSettings({ averageContractValue: value as BusinessSettings['averageContractValue'] })}
                >
                  <SelectTrigger id="contractValue" className="input-glow">
                    <SelectValue placeholder="Selecione o ticket médio" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(contractValueLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                        {value === 'auto' && detectedContractValue && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (detectado: {contractValueLabels[detectedContractValue as keyof typeof contractValueLabels] || detectedContractValue})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {businessSettings.averageContractValue === 'auto' && detectedContractValue && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Detectado: {contractValueLabels[detectedContractValue as keyof typeof contractValueLabels] || detectedContractValue}
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Essas configurações ajustam os benchmarks usados na análise de IA. 
                    Por exemplo, SaaS B2B espera retenção M3 de 85%, enquanto B2C espera 70%.
                  </span>
                </p>
              </div>

              <Button 
                onClick={handleSaveBusinessContext} 
                className="btn-gradient w-full"
                disabled={isSavingLocal || isSaving}
              >
                {(isSavingLocal || isSaving) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Configurações'
                )}
              </Button>
            </div>
          </div>

          {/* Profile Settings */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Perfil</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-muted-foreground">Nome</Label>
                <Input
                  id="name"
                  placeholder="Seu nome"
                  className="input-glow"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-muted-foreground">Empresa</Label>
                <Input
                  id="company"
                  placeholder="Nome da empresa"
                  className="input-glow"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="input-glow"
                  disabled
                />
              </div>
              <Button className="btn-gradient w-full">
                Salvar Alterações
              </Button>
            </div>
          </div>

          {/* CSV Configuration */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Mapeamento de Colunas</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerId" className="text-muted-foreground">Coluna de ID do Cliente</Label>
                <Input
                  id="customerId"
                  placeholder="customer_id"
                  defaultValue="customer_id"
                  className="input-glow"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstTransaction" className="text-muted-foreground">Coluna de Primeira Transação</Label>
                <Input
                  id="firstTransaction"
                  placeholder="first_transaction_date"
                  defaultValue="first_transaction_date"
                  className="input-glow"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionDate" className="text-muted-foreground">Coluna de Data de Transação</Label>
                <Input
                  id="transactionDate"
                  placeholder="transaction_date"
                  defaultValue="transaction_date"
                  className="input-glow"
                />
              </div>
              <Button className="btn-gradient w-full">
                Salvar Configurações
              </Button>
            </div>
          </div>

          {/* Export Options */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Exportação</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5">
                <Download className="h-5 w-5 text-primary" />
                <span>Exportar PDF</span>
                <span className="text-xs text-muted-foreground">Relatório completo</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span>Exportar CSV</span>
                <span className="text-xs text-muted-foreground">Dados processados</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5">
                <Download className="h-5 w-5 text-primary" />
                <span>Exportar Heatmap</span>
                <span className="text-xs text-muted-foreground">Imagem PNG</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
