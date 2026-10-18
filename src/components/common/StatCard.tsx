import React from 'react';
import { formatINR } from '../../utils/formatters';

interface StatCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  icon?: React.ReactNode;
  trendText?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  highlight?: boolean;
  isCurrency?: boolean;
  customValue?: string;
  onClick?: () => void;
  badgeText?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  amount,
  subtitle,
  icon,
  trendText,
  trendDirection = 'neutral',
  highlight = false,
  isCurrency = true,
  customValue,
  onClick,
  badgeText,
}) => {
  const displayValue = customValue ? customValue : (isCurrency ? formatINR(amount) : amount.toString());

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl border transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-xs' : ''
      } ${
        highlight
          ? 'bg-slate-900 border-slate-900 text-white'
          : 'bg-white border-slate-200/80 text-slate-900'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className={`text-xs font-medium tracking-normal ${highlight ? 'text-slate-300' : 'text-slate-500'}`}>
          {title}
        </span>
        {icon && (
          <div className={`p-2 rounded-xl ${highlight ? 'bg-slate-800 text-slate-200' : 'bg-slate-50 text-slate-600'}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold tracking-tight tabular-nums font-mono ${highlight ? 'text-white' : 'text-slate-900'}`}>
          {displayValue}
        </span>
        {badgeText && (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
            highlight ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
          }`}>
            {badgeText}
          </span>
        )}
      </div>

      {(subtitle || trendText) && (
        <div className="mt-2.5 flex items-center justify-between text-xs">
          {subtitle && (
            <span className={highlight ? 'text-slate-400' : 'text-slate-500'}>
              {subtitle}
            </span>
          )}
          {trendText && (
            <span
              className={`font-medium tabular-nums ${
                trendDirection === 'up'
                  ? (highlight ? 'text-emerald-400' : 'text-emerald-600')
                  : trendDirection === 'down'
                  ? (highlight ? 'text-rose-400' : 'text-rose-600')
                  : (highlight ? 'text-slate-400' : 'text-slate-500')
              }`}
            >
              {trendText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
