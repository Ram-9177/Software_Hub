import React from 'react';

export interface WorkloadItem {
  name: string;
  total: number;
  overdue: number;
}

interface TeamWorkloadBarChartProps {
  data: WorkloadItem[];
  className?: string;
}

export const TeamWorkloadBarChart: React.FC<TeamWorkloadBarChartProps> = ({
  data,
  className = '',
}) => {
  const maxTasks = Math.max(...data.map((d) => d.total), 5);

  return (
    <div className={`space-y-3 ${className}`}>
      {data.map((item) => {
        const activeCount = item.total - item.overdue;
        const activePct = (activeCount / maxTasks) * 100;
        const overduePct = (item.overdue / maxTasks) * 100;

        return (
          <div key={item.name} className="flex items-center gap-3 text-xs">
            <span className="w-16 font-medium text-navy-800 dark:text-navy-200 truncate">{item.name}</span>
            <div className="flex-1 h-3.5 bg-tint dark:bg-navy-900 rounded-sm overflow-hidden flex border border-line">
              {/* Active tasks (Navy / Gold) */}
              <div
                style={{ width: `${activePct}%` }}
                className="bg-navy-900 dark:bg-gold-400 transition-all duration-300 rounded-l-sm"
                title={`${activeCount} active tasks`}
              />
              {/* Overdue tasks (Red) */}
              {item.overdue > 0 && (
                <div
                  style={{ width: `${overduePct}%` }}
                  className="bg-rose-500 transition-all duration-300 rounded-r-sm"
                  title={`${item.overdue} overdue`}
                />
              )}
            </div>
            <span className="w-4 text-right font-display font-bold text-navy-950 dark:text-navy-100">{item.total}</span>
          </div>
        );
      })}
    </div>
  );
};
