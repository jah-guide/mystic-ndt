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
  /** When set, each status/method row is a toggle filter target (not the whole card). */
  onRowClick?: (label: string) => void;
  selectedLabel?: string | null;
}

/** Lightweight CSS bar chart — ops KPI only, no chart library. */
export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  title,
  data,
  emptyText = 'No data yet',
  onRowClick,
  selectedLabel = null
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
          {data.map(d => {
            const selected = selectedLabel === d.label;
            const rowClass = 'space-y-1 rounded-lg -mx-1 px-1 py-0.5';
            const interactiveClass = onRowClick
              ? `cursor-pointer hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
                  selected ? 'bg-sky-500/10 ring-1 ring-sky-500/40' : ''
                }`
              : '';

            const body = (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium truncate pr-2 ${selected ? 'text-sky-300' : 'text-slate-300'}`}>
                    {d.label}
                  </span>
                  <span className="text-white font-bold tabular-nums">{d.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${d.color || 'bg-sky-500'}`}
                    style={{ width: `${Math.round((d.value / max) * 100)}%` }}
                  />
                </div>
              </>
            );

            if (onRowClick) {
              return (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => onRowClick(d.label)}
                  aria-pressed={selected}
                  title={selected ? `Clear ${d.label} filter` : `Filter by ${d.label}`}
                  className={`w-full text-left ${rowClass} ${interactiveClass}`}
                >
                  {body}
                </button>
              );
            }

            return (
              <div key={d.label} className={rowClass}>
                {body}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
