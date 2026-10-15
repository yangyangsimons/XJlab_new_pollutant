import React from 'react';

interface PanelProps {
  title: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({ title, extra, children, className = '', bodyClassName = 'px-3 py-3' }: PanelProps) {
  return (
    <section className={`bg-brand-panel border border-brand-border rounded-lg flex flex-col overflow-hidden ${className}`}>
      <div className="h-12 shrink-0 border-b border-brand-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="w-1 h-5 bg-info rounded-sm" />
          <h3 className="text-[20px] leading-6 font-medium text-ink">{title}</h3>
        </div>
        {extra && <div className="text-[16px] leading-5 text-ink-sub">{extra}</div>}
      </div>
      <div className={`flex-1 min-h-0 overflow-hidden ${bodyClassName}`}>{children}</div>
    </section>
  );
}
