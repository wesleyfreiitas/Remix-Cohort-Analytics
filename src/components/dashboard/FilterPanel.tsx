import { useState } from "react";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import { format, subMonths, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export interface FilterState {
  planTypes: string[];
  channels: string[];
  startDate: Date | null;
  endDate: Date | null;
}

interface FilterPanelProps {
  availablePlanTypes: string[];
  availableChannels: string[];
  filters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
  onClearFilters: () => void;
}

type DatePreset = "6months" | "1year" | "all";

export function FilterPanel({
  availablePlanTypes,
  availableChannels,
  filters,
  onApplyFilters,
  onClearFilters,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [activePreset, setActivePreset] = useState<DatePreset | null>(null);

  const handlePlanTypeToggle = (planType: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      planTypes: prev.planTypes.includes(planType)
        ? prev.planTypes.filter((p) => p !== planType)
        : [...prev.planTypes, planType],
    }));
  };

  const handleChannelToggle = (channel: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const handlePresetClick = (preset: DatePreset) => {
    setActivePreset(preset);
    const now = new Date();

    switch (preset) {
      case "6months":
        setLocalFilters((prev) => ({
          ...prev,
          startDate: subMonths(now, 6),
          endDate: now,
        }));
        break;
      case "1year":
        setLocalFilters((prev) => ({
          ...prev,
          startDate: subYears(now, 1),
          endDate: now,
        }));
        break;
      case "all":
        setLocalFilters((prev) => ({
          ...prev,
          startDate: null,
          endDate: null,
        }));
        break;
    }
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
  };

  const handleClear = () => {
    const emptyFilters: FilterState = {
      planTypes: [],
      channels: [],
      startDate: null,
      endDate: null,
    };
    setLocalFilters(emptyFilters);
    setActivePreset(null);
    onClearFilters();
  };

  const hasFilters =
    localFilters.planTypes.length > 0 ||
    localFilters.channels.length > 0 ||
    localFilters.startDate !== null ||
    localFilters.endDate !== null;

  const showPlanFilter = availablePlanTypes.length > 0;
  const showChannelFilter = availableChannels.length > 0;

  if (!showPlanFilter && !showChannelFilter) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="glass-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/10 transition-colors rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold text-foreground">Filtros</span>
            {hasFilters && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                Ativos
              </span>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Tipo de Plano */}
              {showPlanFilter && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Tipo de Plano
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                      >
                        {localFilters.planTypes.length > 0
                          ? `${localFilters.planTypes.length} selecionado(s)`
                          : "Selecionar..."}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="start">
                      <div className="space-y-2">
                        {availablePlanTypes.map((planType) => (
                          <label
                            key={planType}
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                          >
                            <Checkbox
                              checked={localFilters.planTypes.includes(planType)}
                              onCheckedChange={() => handlePlanTypeToggle(planType)}
                            />
                            <span className="text-sm">{planType}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Canal de Aquisição */}
              {showChannelFilter && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Canal de Aquisição
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                      >
                        {localFilters.channels.length > 0
                          ? `${localFilters.channels.length} selecionado(s)`
                          : "Selecionar..."}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="start">
                      <div className="space-y-2">
                        {availableChannels.map((channel) => (
                          <label
                            key={channel}
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                          >
                            <Checkbox
                              checked={localFilters.channels.includes(channel)}
                              onCheckedChange={() => handleChannelToggle(channel)}
                            />
                            <span className="text-sm">{channel}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Período */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Período
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={activePreset === "6months" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetClick("6months")}
                  >
                    Últimos 6 meses
                  </Button>
                  <Button
                    variant={activePreset === "1year" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetClick("1year")}
                  >
                    Último ano
                  </Button>
                  <Button
                    variant={activePreset === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetClick("all")}
                  >
                    Todo período
                  </Button>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Data Inicial
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !localFilters.startDate && "text-muted-foreground"
                      )}
                    >
                      {localFilters.startDate
                        ? format(localFilters.startDate, "dd/MM/yyyy", { locale: ptBR })
                        : "Selecionar data..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localFilters.startDate || undefined}
                      onSelect={(date) => {
                        setLocalFilters((prev) => ({ ...prev, startDate: date || null }));
                        setActivePreset(null);
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Data Final
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !localFilters.endDate && "text-muted-foreground"
                      )}
                    >
                      {localFilters.endDate
                        ? format(localFilters.endDate, "dd/MM/yyyy", { locale: ptBR })
                        : "Selecionar data..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localFilters.endDate || undefined}
                      onSelect={(date) => {
                        setLocalFilters((prev) => ({ ...prev, endDate: date || null }));
                        setActivePreset(null);
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={handleClear}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
              <Button onClick={handleApply}>
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
