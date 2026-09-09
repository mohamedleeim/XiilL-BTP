import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  trend
}) => {
  const getBorderColor = () => {
    switch (variant) {
      case 'danger':
        return 'border-red-600/50 bg-red-950/20';
      case 'warning':
        return 'border-amber-600/50 bg-amber-950/20';
      case 'success':
        return 'border-emerald-600/50 bg-emerald-950/20';
      default:
        return 'border-zinc-800 bg-zinc-900/90';
    }
  };

  const getValueColor = () => {
    switch (variant) {
      case 'danger':
        return 'text-red-400';
      case 'warning':
        return 'text-amber-400';
      case 'success':
        return 'text-emerald-400';
      default:
        return 'text-zinc-100';
    }
  };

  return (
    <div className={`p-4 rounded-2xl border ${getBorderColor()} shadow-sm transition-all relative overflow-hidden`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-zinc-400 truncate">{title}</span>
        {icon && <div className="text-zinc-400 shrink-0">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2">
        <div className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${getValueColor()}`}>
          {value}
        </div>
        {trend && (
          <span className="text-[11px] font-semibold text-zinc-400">
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] text-zinc-400 mt-1 truncate font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
};
