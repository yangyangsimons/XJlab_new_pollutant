import React, { useState } from 'react';
import { Panel } from './Panel';
import { COLORS, LEVELS, TARGETS, TARGET_CFG, TREND, Target, fmtValue, fmtThreshold, levelOf } from '../data';

const W = 334;
const H = 112;
const L = 40;
const R = 8;
const T = 6;
const B = 24;

interface Props {
  target: Target;
  site: string;
  onTarget: (t: Target) => void;
}

export function TrendPanel({ target, site, onTarget }: Props) {
  const cfg = TARGET_CFG[target];
  const key = `${site}|${target}`;
  const series = TREND[key];
  const [picked, setPicked] = useState<{ key: string; i: number } | null>(null);
  const active = series ? (picked && picked.key === key ? picked.i : series.values.length - 1) : -1;

  const max = cfg.ticks[cfg.ticks.length - 1];
  const plotW = W - L - R;
  const plotH = H - T - B;
  const y = (v: number) => T + plotH - (v / max) * plotH;
  const x = (i: number) => L + ((i + 0.5) * plotW) / 7;

  return (
    <Panel title="目标物趋势" extra={series ? '最近7次采样' : undefined} className="h-[232px]" bodyClassName="px-3 py-2">
      <div className="flex flex-col h-full">
        <div className="flex h-8 border-b border-brand-border shrink-0">
          {TARGETS.map((t) => (
            <button
              key={t}
              onClick={() => onTarget(t)}
              className={`px-4 text-[18px] leading-8 border-b-2 cursor-pointer ${
                target === t ? 'text-info border-info' : 'text-ink-sub border-transparent'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="h-6 shrink-0 text-[16px] leading-6 text-ink-sub whitespace-nowrap">
          {site}｜单位 {cfg.unit}
        </div>
        {series ? (
          <svg width={W} height={H} className="shrink-0">
            {cfg.ticks.map((tk) => (
              <g key={tk}>
                <line x1={L} x2={W - R} y1={y(tk)} y2={y(tk)} stroke="#24465F" strokeWidth={1} />
                <text x={L - 6} y={y(tk) + 5} textAnchor="end" fontSize={16} fill={COLORS.unknown}>
                  {tk}
                </text>
              </g>
            ))}
            <text x={0} y={H - 4} fontSize={16} fill={COLORS.unknown}>
              10月
            </text>
            {series.dates.map((d, i) => (
              <text key={d} x={x(i)} y={H - 4} textAnchor="middle" fontSize={16} fill={COLORS.unknown}>
                {d}
              </text>
            ))}
            {cfg.threshold !== null && (
              <>
                <line x1={L} x2={W - R} y1={y(cfg.threshold)} y2={y(cfg.threshold)} stroke={COLORS.warn} strokeWidth={1.5} strokeDasharray="5 4" />
                <text x={W - R} y={y(cfg.threshold) + 18} textAnchor="end" fontSize={16} fill={COLORS.warn}>
                  项目演示阈值{fmtThreshold(target)}
                </text>
              </>
            )}
            <polyline
              points={series.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
              fill="none"
              stroke="#7FB5D6"
              strokeWidth={1.5}
              opacity={0.7}
            />
            {series.values.map((v, i) => {
              const color = LEVELS[cfg.threshold ? levelOf(v / cfg.threshold) : 'unevaluated'].color;
              return (
                <g key={i} className="cursor-pointer" onClick={() => setPicked({ key, i })}>
                  <circle cx={x(i)} cy={y(v)} r={14} fill="transparent" />
                  {i === active && <circle cx={x(i)} cy={y(v)} r={10} fill="none" stroke="#EAF3FA" strokeWidth={1.5} />}
                  <circle cx={x(i)} cy={y(v)} r={6} fill={color} stroke="#0D2235" strokeWidth={2} />
                </g>
              );
            })}
            <text x={L + 6} y={T + 16} fontSize={16} fill="#EAF3FA">
              10月{series.dates[active]}日 {fmtValue(target, series.values[active])} {cfg.unit}
            </text>
          </svg>
        ) : (
          <div className="flex-1 mt-1 rounded border border-dashed border-brand-border flex flex-col items-center justify-center text-center">
            <div className="text-[18px] text-ink">历史数据待补充</div>
            <div className="text-[16px] leading-5 text-ink-sub">
              {site}｜{target}
              {cfg.threshold === null ? '｜未配置阈值，未评价' : ''}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
