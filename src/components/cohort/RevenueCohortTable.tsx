import { forwardRef } from 'react';
import { RevenueCohortData, formatMRRCompact } from '@/lib/revenueCohortCalculations';
import { RevenueCohortCell } from './RevenueCohortCell';
import { cn } from '@/lib/utils';
import { DollarSign } from 'lucide-react';

interface RevenueCohortTableProps {
  data: RevenueCohortData[];
  monthsLimit?: number | null;
}

export const RevenueCohortTable = forwardRef<HTMLDivElement, RevenueCohortTableProps>(
  ({ data, monthsLimit }, ref) => {
    // Empty state when no MRR data
    if (data.length === 0) {
      return (
        <div 
          ref={ref}
          className="rounded-3xl bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 p-12 flex flex-col items-center justify-center text-center animate-fade-in"
        >
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
            <DollarSign className="h-8 w-8 text-yellow-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-200 mb-2">
            Dados de MRR não disponíveis
          </h3>
          <p className="text-gray-400 max-w-md">
            Mapeie a coluna "MRR" no upload de dados para visualizar o cohort de receita
          </p>
        </div>
      );
    }

    // Find the maximum number of months across all cohorts
    const totalMaxMonths = Math.max(...data.map(d => d.retention.length), 0);
    const maxMonths = monthsLimit ? Math.min(monthsLimit, totalMaxMonths) : totalMaxMonths;
    
    // Generate month headers (M0, M1, M2...)
    const monthHeaders = Array.from({ length: maxMonths }, (_, i) => `M${i}`);
    
    return (
      <div 
        ref={ref}
        className="rounded-3xl bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 overflow-x-auto animate-fade-in"
      >
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-gray-800/80 sticky top-0 z-10">
              <th className="px-4 py-3 text-left text-gray-300 font-medium text-sm uppercase tracking-wider">
                Cohort
              </th>
              <th className="px-4 py-3 text-center text-gray-300 font-medium text-sm uppercase tracking-wider">
                MRR Inicial
              </th>
              {monthHeaders.map((header) => (
                <th 
                  key={header}
                  className="px-3 py-3 text-center text-gray-300 font-medium text-sm uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((cohort, index) => (
              <tr 
                key={cohort.cohortKey}
                className={cn(
                  'border-t border-gray-700/30',
                  index % 2 === 0 ? 'bg-gray-800/20' : 'bg-transparent'
                )}
              >
                <td className="px-4 py-3 text-cyan-400 font-medium whitespace-nowrap">
                  {cohort.cohortLabel}
                </td>
                <td className="px-4 py-3 text-center text-gray-300 whitespace-nowrap">
                  {formatMRRCompact(cohort.initialMRR)}
                </td>
                {monthHeaders.map((_, monthIndex) => {
                  const retention = cohort.retention.find(r => r.month === monthIndex);
                  
                  if (!retention) {
                    return (
                      <td 
                        key={monthIndex}
                        className="px-3 py-2 text-sm text-center text-gray-600"
                      >
                        -
                      </td>
                    );
                  }
                  
                  return (
                    <RevenueCohortCell
                      key={monthIndex}
                      month={retention.month}
                      retainedMRR={retention.retainedMRR}
                      initialMRR={retention.initialMRR}
                      percentage={retention.percentage}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

RevenueCohortTable.displayName = 'RevenueCohortTable';
