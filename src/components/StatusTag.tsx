import React from 'react';
import { LEVELS, LevelKey } from '../data';

export function LevelTag({ level }: { level: LevelKey }) {
  const { label, color } = LEVELS[level];
  return (
    <span
      className="inline-flex items-center px-2 h-6 text-[16px] leading-none rounded border whitespace-nowrap"
      style={{ color, borderColor: color, backgroundColor: `${color}1F` }}
    >
      {label}
    </span>
  );
}
