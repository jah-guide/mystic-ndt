import React from 'react';

export interface SimpleBarDatum {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  title: string;
  data: SimpleBarDatum[];
  emptyText?: string;
}

/** Lightweight CSS bar chart — ops KPI only, no chart library. */
export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  title,
  data,
  emptyText = 'No data yet'
}) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const hasValues = data.some(d => d.value > 0);

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{title}</h4>
      {!hasValues ? (
        <p className="text-xs text-slate-500">{emptyText}</p>
      ) : (
        <div className="space-y-2.5">
          {data.map(d => (
            <div key={d.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium truncate pr-2">{d.label}</span>
                <span className="text-white font-bold tabular-nums">{d.value}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${d.color || 'bg-sky-500'}`}
                  style={{ width: `${Math.round((d.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
