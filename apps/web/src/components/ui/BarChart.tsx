import React from 'react';

export interface BarChartProps {
  data: Array<{ label: string; value: number; secondaryValue?: number }>;
  maxValue?: number;
  className?: string;
  primaryColor?: string;
  secondaryColor?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  maxValue,
  className = '',
  primaryColor = '#0d315c',
  secondaryColor = '#ffaf3a',
  primaryLabel = 'Total',
  secondaryLabel = 'Completed',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-ink-faint italic">
        No workload distribution available
      </div>
    );
  }

  const height = 140;
  const width = 500;
  const paddingX = 25;
  const paddingTop = 20;
  const paddingBottom = 25;

  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingTop - paddingBottom;

  const computedMax = maxValue || Math.max(...data.map((d) => Math.max(d.value, d.secondaryValue ?? 0)), 10);
  const groupWidth = innerWidth / data.length;
  const hasSecondary = data.some((d) => d.secondaryValue !== undefined);
  const barWidth = hasSecondary ? Math.min(14, groupWidth / 3) : Math.min(22, groupWidth / 2);

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full aspect-500/140">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Baseline and grid lines */}
          <line
            x1={paddingX}
            y1={paddingTop}
            x2={width - paddingX}
            y2={paddingTop}
            stroke="#e8eef5"
            strokeDasharray="3 3"
          />
          <line
            x1={paddingX}
            y1={paddingTop + innerHeight / 2}
            x2={width - paddingX}
            y2={paddingTop + innerHeight / 2}
            stroke="#e8eef5"
            strokeDasharray="3 3"
          />
          <line
            x1={paddingX}
            y1={paddingTop + innerHeight}
            x2={width - paddingX}
            y2={paddingTop + innerHeight}
            stroke="#cbd5e1"
          />

          {/* Bars */}
          {data.map((d, i) => {
            const groupX = paddingX + i * groupWidth + groupWidth / 2;
            const primaryHeight = (d.value / computedMax) * innerHeight;
            const primaryY = paddingTop + innerHeight - primaryHeight;

            if (hasSecondary) {
              const secVal = d.secondaryValue ?? 0;
              const secHeight = (secVal / computedMax) * innerHeight;
              const secY = paddingTop + innerHeight - secHeight;
              const pX = groupX - barWidth - 2;
              const sX = groupX + 2;

              return (
                <g key={i}>
                  <rect
                    x={pX}
                    y={primaryY}
                    width={barWidth}
                    height={Math.max(2, primaryHeight)}
                    rx={2}
                    fill={primaryColor}
                  />
                  <rect
                    x={sX}
                    y={secY}
                    width={barWidth}
                    height={Math.max(2, secHeight)}
                    rx={2}
                    fill={secondaryColor}
                  />
                  <text
                    x={groupX}
                    y={height - 8}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="10"
                    fontWeight="500"
                  >
                    {d.label}
                  </text>
                </g>
              );
            }

            return (
              <g key={i}>
                <rect
                  x={groupX - barWidth / 2}
                  y={primaryY}
                  width={barWidth}
                  height={Math.max(2, primaryHeight)}
                  rx={2}
                  fill={primaryColor}
                />
                <text
                  x={groupX}
                  y={primaryY - 4}
                  textAnchor="middle"
                  fill="#0d315c"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {d.value}
                </text>
                <text
                  x={groupX}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="10"
                  fontWeight="500"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {hasSecondary && (
        <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-ink-soft">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: primaryColor }} />
            <span>{primaryLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: secondaryColor }} />
            <span>{secondaryLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarChart;
