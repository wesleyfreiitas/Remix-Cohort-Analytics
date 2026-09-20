import { ParsedData } from "@/lib/fileParser";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataPreviewProps {
  data: ParsedData;
  maxRows?: number;
}

export function DataPreview({ data, maxRows = 5 }: DataPreviewProps) {
  const previewRows = data.rows.slice(0, maxRows);

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Pré-visualização dos Dados
        </h3>
        <span className="text-sm text-muted-foreground">
          {data.totalRows.toLocaleString("pt-BR")} linhas encontradas
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {data.headers.map((header) => (
                <TableHead
                  key={header}
                  className="text-muted-foreground font-medium whitespace-nowrap"
                >
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewRows.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                className={rowIndex % 2 === 0 ? "bg-muted/30" : "bg-transparent"}
              >
                {data.headers.map((header) => (
                  <TableCell
                    key={`${rowIndex}-${header}`}
                    className="text-muted-foreground whitespace-nowrap"
                  >
                    {row[header] !== undefined && row[header] !== null
                      ? String(row[header])
                      : "-"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data.totalRows > maxRows && (
        <p className="text-xs text-muted-foreground text-center">
          Mostrando {maxRows} de {data.totalRows.toLocaleString("pt-BR")} linhas
        </p>
      )}
    </div>
  );
}
