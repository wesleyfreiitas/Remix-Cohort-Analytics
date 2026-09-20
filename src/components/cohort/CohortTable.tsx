import { forwardRef } from 'react';
import { CohortData } from '@/lib/cohortCalculations';
import { CohortCell } from './CohortCell';
import { cn } from '@/lib/utils';

interface CohortTableProps {
  data: CohortData[];
  monthsLimit?: number | null;
}

export const CohortTable = forwardRef<HTMLDivElement, CohortTableProps>(
  ({ data, monthsLimit }, ref) => {
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
                  Clientes
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
                  <td className="px-4 py-3 text-center text-gray-300">
                    {cohort.totalCustomers}
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
                      <CohortCell
                        key={monthIndex}
                        month={retention.month}
                        retained={retention.retained}
                        total={cohort.totalCustomers}
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

CohortTable.displayName = 'CohortTable';
