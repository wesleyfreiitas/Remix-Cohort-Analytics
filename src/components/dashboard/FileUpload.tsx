import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileSpreadsheet, X, CheckCircle, Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { parseFile, ParsedData } from "@/lib/fileParser";
import { DataPreview } from "./DataPreview";
import { ColumnMapping } from "./ColumnMapping";
import { useData, ColumnMapping as ColumnMappingType } from "@/contexts/DataContext";
import { toast } from "sonner";
import { downloadTemplateCsv, downloadTemplateExcel } from "@/lib/templateGenerator";
import { autoMapColumns, countMappedFields } from "@/lib/columnAutoMapper";

interface FileUploadProps {
  acceptedFormats?: string;
}

export function FileUpload({ acceptedFormats = ".csv,.xlsx,.xls" }: FileUploadProps) {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [autoMappedFields, setAutoMappedFields] = useState<Set<keyof ColumnMappingType>>(new Set());
  
  const { 
    columnMapping, 
    updateColumnMapping,
    setColumnMapping,
    setRawData, 
    processData, 
    clearData,
    isProcessing 
  } = useData();

  const isValid = columnMapping.customerId && columnMapping.startDate;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setSelectedFile(file);
    
    try {
      const data = await parseFile(file);
      setParsedData(data);
      setRawData(data);
      
      // Auto-mapear colunas baseado nos headers
      const { mapping, autoMappedFields: mappedFields } = autoMapColumns(data.headers);
      setColumnMapping(mapping);
      setAutoMappedFields(mappedFields);
      
      const mappedCount = countMappedFields(mapping);
      const totalFields = 6;
      
      if (mappedCount > 0) {
        toast.success(
          `${mappedCount} de ${totalFields} colunas mapeadas automaticamente`,
          { description: 'Revise o mapeamento e ajuste se necessário' }
        );
      } else {
        toast.success(`Arquivo carregado: ${data.totalRows} linhas encontradas`);
      }
    } catch (error) {
      toast.error((error as Error).message);
      setSelectedFile(null);
      setParsedData(null);
      setAutoMappedFields(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [setRawData, setColumnMapping]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setParsedData(null);
    setAutoMappedFields(new Set());
    clearData();
  }, [clearData]);

  const handleProcess = useCallback(() => {
    if (!isValid) {
      toast.error("Preencha os campos obrigatórios antes de processar");
      return;
    }
    
    processData();
    
    toast.success("Dados processados com sucesso!", {
      description: "Redirecionando para análise de cohort...",
    });
    
    setTimeout(() => {
      navigate("/cohort");
    }, 800);
  }, [isValid, processData, navigate]);

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Upload de Dados</h3>
        
        {/* Template Download Section */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="text-foreground font-medium">Primeira vez importando?</p>
                <p className="text-muted-foreground text-sm">
                  Baixe nosso modelo de planilha com a estrutura correta
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplateCsv}
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
              >
                <Download className="h-4 w-4 mr-1" />
                Baixar Modelo CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplateExcel}
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
              >
                <Download className="h-4 w-4 mr-1" />
                Baixar Modelo Excel
              </Button>
            </div>
          </div>
        </div>
        
        {!selectedFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer",
              "hover:border-primary/70 hover:bg-primary/5",
              isDragging 
                ? "border-primary bg-primary/10 scale-[1.02]" 
                : "border-muted-foreground/30"
            )}
          >
            <input
              type="file"
              accept={acceptedFormats}
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="flex flex-col items-center gap-4 text-center">
              <div className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
                isDragging ? "bg-primary/20 scale-110" : "bg-primary/10"
              )}>
                <Upload className={cn(
                  "h-8 w-8 transition-colors",
                  isDragging ? "text-primary" : "text-primary/70"
                )} />
              </div>
              
              <div>
                <p className="text-foreground font-medium">
                  Arraste sua planilha aqui ou clique para selecionar
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Formatos aceitos: CSV, XLSX, XLS
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Máximo 20MB por arquivo</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isLoading ? (
                <div className="flex items-center gap-2 text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Carregando...</span>
                </div>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClear}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Data Preview */}
      {parsedData && !isLoading && (
        <DataPreview data={parsedData} />
      )}

      {/* Column Mapping */}
      {parsedData && !isLoading && (
        <ColumnMapping
          headers={parsedData.headers}
          mapping={columnMapping}
          onMappingChange={updateColumnMapping}
          autoMappedFields={autoMappedFields}
        />
      )}

      {/* Action Buttons */}
      {parsedData && !isLoading && (
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={handleClear}
            className="border-muted-foreground/30 text-primary hover:bg-muted"
          >
            Limpar
          </Button>
          <Button
            onClick={handleProcess}
            disabled={!isValid || isProcessing}
            className={cn(
              "bg-gradient-to-r from-primary to-teal-400 text-primary-foreground font-medium",
              "hover:opacity-90 transition-opacity",
              (!isValid || isProcessing) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              "Processar Dados"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
