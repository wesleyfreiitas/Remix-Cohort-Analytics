import { getRetentionColor } from '@/lib/cohortCalculations';
import { formatMRR } from '@/lib/revenueCohortCalculations';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RevenueCohortCellProps {
  month: number;
  retainedMRR: number;
  initialMRR: number;
  percentage: number;
}

export function RevenueCohortCell({ month, retainedMRR, initialMRR, percentage }: RevenueCohortCellProps) {
  const isM0 = month === 0;
  const colors = getRetentionColor(percentage, isM0);
  
  return (
    <td
      className={cn(
        'px-3 py-2 text-sm font-semibold text-center',
        'transition-all duration-200',
        colors.bg,
        colors.text
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default block w-full hover:ring-2 hover:ring-white/20 rounded">
            {percentage.toFixed(1)}%
          </span>
        </TooltipTrigger>
        <TooltipContent 
          className="bg-gray-800 border border-gray-600 rounded-lg shadow-xl px-3 py-2 text-sm z-50"
          sideOffset={5}
        >
          <p className="text-gray-100 font-medium">
            {formatMRR(retainedMRR)} de {formatMRR(initialMRR)} retidos
          </p>
          <p className="text-gray-400">
            ({percentage.toFixed(1)}%)
          </p>
        </TooltipContent>
      </Tooltip>
    </td>
  );
}
