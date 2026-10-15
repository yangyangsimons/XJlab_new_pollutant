import React from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="absolute inset-0 bg-black/60 z-[1000]" onClick={onClose} />
      <aside className="absolute top-0 right-0 w-[520px] h-full bg-brand-bg border-l border-brand-border z-[1001] flex flex-col">
        <div className="h-16 shrink-0 border-b border-brand-border flex items-center justify-between px-6 bg-brand-panel">
          <h2 className="text-[20px] font-medium text-ink">{title}</h2>
          <button onClick={onClose} aria-label="关闭" className="text-ink-sub hover:text-ink text-[28px] leading-none cursor-pointer">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </aside>
    </>
  );
}
