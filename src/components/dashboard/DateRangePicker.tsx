import { useState } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
}

const presets = [
  { label: "Últimos 30 dias", days: 30 },
  { label: "Últimos 60 dias", days: 60 },
  { label: "Últimos 90 dias", days: 90 },
  { label: "Último ano", days: 365 },
];

export function DateRangePicker({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange 
}: DateRangePickerProps) {
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    onStartDateChange(start);
    onEndDateChange(end);
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Período de Análise</h3>
      
      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map((preset) => (
          <Button
            key={preset.days}
            variant="outline"
            size="sm"
            onClick={() => handlePreset(preset.days)}
            className="text-xs border-border/50 bg-muted/30 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all duration-200"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Date Pickers */}
      <div className="grid grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Data Inicial</label>
          <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal input-glow",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar..."}
                <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  onStartDateChange(date);
                  setIsStartOpen(false);
                }}
                locale={ptBR}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Data Final</label>
          <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal input-glow",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar..."}
                <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => {
                  onEndDateChange(date);
                  setIsEndOpen(false);
                }}
                locale={ptBR}
                disabled={(date) => startDate ? date < startDate : false}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
