import React from 'react';

interface AttendanceTrendChartProps {
  data: { week: string; percentage: number }[];
  minThreshold?: number; // default 75%
  className?: string;
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({
  data,
  minThreshold = 75,
  className = '',
}) => {
  const height = 140;
  const width = 500;
  const paddingX = 30;
  const paddingTop = 15;
  const paddingBottom = 25;

  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingTop - paddingBottom;

  const minVal = 50;
  const maxVal = 100;

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return paddingTop + innerHeight - ((clamped - minVal) / (maxVal - minVal)) * innerHeight;
  };

  const getX = (index: number) => {
    return paddingX + (index / (data.length - 1)) * innerWidth;
  };

  const points = data.map((d, i) => `${getX(i)},${getY(d.percentage)}`).join(' ');
  const thresholdY = getY(minThreshold);

  // Area path for gradient fill
  const areaPath = `
    M ${getX(0)},${getY(data[0].percentage)}
    ${data.map((d, i) => `L ${getX(i)},${getY(d.percentage)}`).join(' ')}
    L ${getX(data.length - 1)},${height - paddingBottom}
    L ${getX(0)},${height - paddingBottom}
    Z
  `;

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full aspect-[500/140]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* 75% Threshold Line */}
          <line
            x1={paddingX}
            y1={thresholdY}
            x2={width - paddingX}
            y2={thresholdY}
            stroke="#cbd5e1"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={width - paddingX + 5}
            y={thresholdY + 3}
            fill="#94a3b8"
            fontSize="9"
            fontWeight="600"
          >
            {minThreshold}% min
          </text>

          {/* Area fill */}
          <path d={areaPath} fill="url(#attendanceGradient)" />

          {/* Main trend line */}
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Data Points */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.percentage);
            return (
              <g key={d.week} className="group cursor-pointer">
                <circle
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth="2"
                  className="transition-transform group-hover:scale-150 duration-150"
                />
                {/* Tooltip value */}
                <text
                  x={cx}
                  y={cy - 8}
                  textAnchor="middle"
                  fill="#1e293b"
                  fontSize="10"
                  fontWeight="bold"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                >
                  {d.percentage}%
                </text>
                {/* Week Label */}
                <text
                  x={cx}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="10"
                  fontWeight="500"
                >
                  {d.week}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
