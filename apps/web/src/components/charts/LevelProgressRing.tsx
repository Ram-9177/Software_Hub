import React from 'react';

interface LevelProgressRingProps {
  currentLevel: number;
  totalLevels?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const LevelProgressRing: React.FC<LevelProgressRingProps> = ({
  currentLevel,
  totalLevels = 15,
  size = 72,
  strokeWidth = 6,
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, currentLevel / totalLevels));
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e8eef5"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#ffaf3a"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-sm font-display font-black text-navy-950 dark:text-gold-400 leading-none">{currentLevel}</span>
        <span className="text-[9px] text-navy-400 font-mono font-semibold leading-none mt-0.5">of {totalLevels}</span>
      </div>
    </div>
  );
};
