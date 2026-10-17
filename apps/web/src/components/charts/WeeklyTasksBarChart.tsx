import React from 'react';

export interface WeeklyTaskItem {
  week: string; // e.g. "Wk 1"
  count: number;
}

interface WeeklyTasksBarChartProps {
  data: WeeklyTaskItem[];
  className?: string;
  maxCount?: number;
}

export const WeeklyTasksBarChart: React.FC<WeeklyTasksBarChartProps> = ({
  data,
  className = '',
  maxCount,
}) => {
  const peak = maxCount || Math.max(...data.map((d) => d.count), 5);

  return (
    <div className={`flex items-end justify-between gap-2.5 h-36 pt-6 px-1 ${className}`}>
      {data.map((item) => {
        const heightPct = Math.max(12, (item.count / peak) * 100);

        return (
          <div key={item.week} className="flex-1 flex flex-col items-center h-full justify-end group">
            <span className="text-xs font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
              {item.count}
            </span>
            <div className="w-full max-w-[34px] bg-slate-100 rounded-t-md h-full flex items-end overflow-hidden">
              <div
                style={{ height: `${heightPct}%` }}
                className="w-full bg-blue-600 rounded-t-md transition-all duration-300 group-hover:bg-blue-700"
              />
            </div>
            <span className="text-[11px] font-medium text-slate-500 mt-2">{item.week}</span>
          </div>
        );
      })}
    </div>
  );
};
