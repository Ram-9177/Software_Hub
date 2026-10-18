import React from 'react';

export interface LineChartProps {
  data: Array<{ label: string; value: number }>;
  minThreshold?: number;
  thresholdLabel?: string;
  className?: string;
  color?: string;
  unit?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  minThreshold,
  thresholdLabel,
  className = '',
  color = '#2563eb',
  unit = '%',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-slate-400 italic">
        No trend records available
      </div>
    );
  }

  const height = 140;
  const width = 500;
  const paddingX = 35;
  const paddingTop = 20;
  const paddingBottom = 25;

  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingTop - paddingBottom;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values, minThreshold ?? 0);
  const maxVal = Math.max(...values, 100);

  const getY = (val: number) => {
    const range = maxVal - minVal || 1;
    return paddingTop + innerHeight - ((val - minVal) / range) * innerHeight;
  };

  const getX = (index: number) => {
    if (data.length <= 1) return paddingX + innerWidth / 2;
    return paddingX + (index / (data.length - 1)) * innerWidth;
  };

  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');

  const areaPath =
    data.length > 1
      ? `
    M ${getX(0)},${getY(data[0].value)}
    ${data.map((d, i) => `L ${getX(i)},${getY(d.value)}`).join(' ')}
    L ${getX(data.length - 1)},${height - paddingBottom}
    L ${getX(0)},${height - paddingBottom}
    Z
  `
      : '';

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full aspect-[500/140]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Threshold Line */}
          {minThreshold !== undefined && (
            <>
              <line
                x1={paddingX}
                y1={getY(minThreshold)}
                x2={width - paddingX}
                y2={getY(minThreshold)}
                stroke="#cbd5e1"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={width - paddingX + 5}
                y={getY(minThreshold) + 3}
                fill="#94a3b8"
                fontSize="9"
                fontWeight="600"
              >
                {thresholdLabel || `${minThreshold}${unit}`}
              </text>
            </>
          )}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="url(#lineAreaGradient)" />}

          {/* Main trend line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Points */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.value);
            return (
              <g key={i} className="group">
                <circle
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  fill="#ffffff"
                  stroke={color}
                  strokeWidth="2"
                  className="transition-transform group-hover:scale-150 duration-150"
                />
                <text
                  x={cx}
                  y={cy - 8}
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize="10"
                  fontWeight="bold"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                >
                  {d.value}
                  {unit}
                </text>
                <text
                  x={cx}
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
    </div>
  );
};
