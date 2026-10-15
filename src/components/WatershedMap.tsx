import React, { useRef, useState } from 'react';
import {
  COLORS,
  LEVELS,
  TARGETS,
  TARGET_CFG,
  Target,
  fmtThreshold,
  fmtValue,
  legendRanges,
  statusOf,
} from '../data';
import { SITES, SITE_TYPES, SITE_TYPE_LABEL, SiteType, XIANG, arrowsAlongRiver } from '../geo';
import { LevelTag } from './StatusTag';
import { GeoMap, GeoMapHandle, LineSpec, MarkerSpec } from './GeoMap';
import { arrowHtml, siteIconHtml } from './mapIcons';

export interface Layers {
  rivers: boolean;
  arrows: boolean;
  labels: boolean;
  districts: boolean;
}
export interface View {
  k: number;
  tx: number;
  ty: number;
}

export const DEFAULT_LAYERS: Layers = { rivers: true, arrows: true, labels: true, districts: true };
export const DEFAULT_VIEW: View = { k: 1, tx: 0, ty: 0 };
export const ALL_TYPES: SiteType[] = ['section', 'outfall', 'plant', 'source'];
export const PERIOD_DEFAULT = 'current';


const LAYER_ITEMS: { key: keyof Layers; label: string }[] = [
  { key: 'rivers', label: '湘江中心线' },
  { key: 'arrows', label: '流向箭头' },
  { key: 'labels', label: '点位名称' },
  { key: 'districts', label: '排口连接线' },
];

export function ShapePath({ type, fill, stroke, dash }: { type: SiteType; fill: string; stroke: string; dash?: boolean }) {
  const p = { fill, stroke, strokeWidth: 2.5, strokeDasharray: dash ? '3 3' : undefined };
  if (type === 'section') return <circle r={11} {...p} />;
  if (type === 'outfall') return <rect x={-10} y={-10} width={20} height={20} rx={2} {...p} />;
  if (type === 'plant') return <polygon points="0,-13 13,10 -13,10" strokeLinejoin="round" {...p} />;
  return <polygon points="0,-14 14,0 0,14 -14,0" strokeLinejoin="round" {...p} />;
}

export function markerStyle(level: keyof typeof LEVELS) {
  if (level === 'noresult') return { fill: 'rgba(148,163,184,0.12)', stroke: COLORS.unknown, dash: true };
  return { fill: LEVELS[level].color, stroke: '#071522', dash: false };
}

export function LegendShape({ type, level }: { type: SiteType; level: keyof typeof LEVELS }) {
  const s = markerStyle(level);
  return (
    <svg width={22} height={22} viewBox="-15 -15 30 30" className="shrink-0">
      <ShapePath type={type} fill={s.fill} stroke={s.dash ? s.stroke : '#A8BDCE'} dash={s.dash} />
    </svg>
  );
}

interface Props {
  target: Target;
  onTarget: (t: Target) => void;
  period: string;
  onPeriod: (p: string) => void;
  types: SiteType[];
  onTypes: (t: SiteType[]) => void;
  layers: Layers;
  onLayers: (l: Layers) => void;
  view: View;
  onView: (v: View) => void;
  siteId: string;
  onSite: (id: string) => void;
  onReset: () => void;
  onOpenEvent: () => void;
  onOpenAnalysis: () => void;
}

export function WatershedMap(props: Props) {
  const { target, types, layers, siteId } = props;
  const [menu, setMenu] = useState<null | 'type' | 'layer'>(null);
  const mapRef = useRef<GeoMapHandle>(null);
  const ranges = legendRanges(target);

  const markers: MarkerSpec[] = SITES.filter((s) => types.includes(s.type)).map((s) => {
    const st = statusOf(target, s.id);
    return {
      id: s.id,
      pos: s.pos,
      z: s.id === siteId ? 500 : 0,
      onClick: () => props.onSite(s.id),
      html: siteIconHtml({ type: s.type, level: st.level, label: layers.labels ? s.id : undefined, side: s.side, selected: s.id === siteId }),
    };
  });
  const lines: LineSpec[] = [];
  if (layers.rivers) lines.push({ points: XIANG, color: '#1D4ED8', weight: 4, opacity: 0.55, round: true });
  if (layers.districts) {
    SITES.filter((s) => s.join && types.includes(s.type)).forEach((s) =>
      lines.push({ points: [s.pos, s.join!], color: '#0D2235', weight: 2, opacity: 0.7, dash: '4 4' }),
    );
  }
  if (layers.rivers && layers.arrows) {
    arrowsAlongRiver([0.08, 0.2, 0.34, 0.48, 0.62, 0.74, 0.86, 0.94]).forEach((a, i) =>
      markers.push({ id: 'arrow-' + i, pos: a.pos, html: arrowHtml(a.angle), z: -100 }),
    );
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="relative z-[900] h-12 shrink-0 flex items-center gap-4 px-3 bg-brand-panel border-b border-brand-border">
        <label className="flex items-center gap-2 text-[16px] text-ink-sub">
          目标物
          <select
            value={target}
            onChange={(e) => props.onTarget(e.target.value as Target)}
            className="h-8 px-2 rounded bg-[#0A1B2B] border border-brand-border text-[18px] text-ink cursor-pointer"
          >
            {TARGETS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[16px] text-ink-sub">
          统计周期
          <select
            value={props.period}
            onChange={(e) => props.onPeriod(e.target.value)}
            className="h-8 px-2 rounded bg-[#0A1B2B] border border-brand-border text-[18px] text-ink cursor-pointer"
          >
            <option value="current">2026-10-09 至 2026-10-15</option>
            <option value="d30" disabled>
              近 30 天（待后续生成）
            </option>
            <option value="custom" disabled>
              自定义（待后续生成）
            </option>
          </select>
        </label>

        <div className="relative">
          <button
            onClick={() => setMenu(menu === 'type' ? null : 'type')}
            className="h-8 px-3 rounded bg-[#0A1B2B] border border-brand-border text-[18px] cursor-pointer"
          >
            点位类型 {types.length}/4 ▾
          </button>
          {menu === 'type' && (
            <div className="absolute top-10 left-0 w-[220px] p-2 rounded-lg bg-brand-panel border border-brand-border">
              {SITE_TYPES.map((t) => (
                <label key={t.key} className="flex items-center gap-3 h-9 px-2 text-[18px] cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 cursor-pointer"
                    checked={types.includes(t.key)}
                    onChange={() => props.onTypes(types.includes(t.key) ? types.filter((x) => x !== t.key) : [...types, t.key])}
                  />
                  <LegendShape type={t.key} level="none" />
                  {t.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setMenu(menu === 'layer' ? null : 'layer')}
            className="h-8 px-3 rounded bg-[#0A1B2B] border border-brand-border text-[18px] cursor-pointer"
          >
            图层 ▾
          </button>
          {menu === 'layer' && (
            <div className="absolute top-10 left-0 w-[240px] p-2 rounded-lg bg-brand-panel border border-brand-border">
              {LAYER_ITEMS.map((l) => (
                <label key={l.key} className="flex items-center gap-3 h-9 px-2 text-[18px] cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 cursor-pointer"
                    checked={layers[l.key]}
                    onChange={() => props.onLayers({ ...layers, [l.key]: !layers[l.key] })}
                  />
                  {l.label}
                </label>
              ))}
              <label className="flex items-center gap-3 h-9 px-2 text-[18px] text-ink-sub">
                <input type="checkbox" className="w-4 h-4" disabled checked={false} readOnly />
                污染羽流<span className="text-[16px]">待后续生成</span>
              </label>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setMenu(null);
            mapRef.current?.fit();
            props.onReset();
          }}
          className="h-8 px-3 rounded bg-[#0A1B2B] border border-brand-border text-[18px] cursor-pointer"
        >
          重置视图
        </button>
      </div>

      <div className="relative isolate flex-1 min-h-0">
        {menu && <div className="absolute inset-0 z-[600]" onClick={() => setMenu(null)} />}
        <GeoMap ref={mapRef} markers={markers} lines={lines} padding={[390, 16, 16, 16]} className="absolute inset-0" />

        <div className="absolute z-[500] top-3 left-3 w-[360px]">
          <InfoCard {...props} />
        </div>

        <div className="absolute z-[500] bottom-3 left-3 bg-brand-panel border border-brand-border rounded-lg px-3 py-2 text-[16px] leading-6">
          <div className="flex items-center gap-3">
            <span className="text-ink-sub w-[64px]">点位类型</span>
            {SITE_TYPES.map((t) => (
              <span key={t.key} className="flex items-center gap-1">
                <LegendShape type={t.key} level="none" />
                {t.label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-ink-sub w-[64px]">关注等级</span>
            {ranges ? (
              ranges.map((r) => (
                <span key={r.level} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ background: LEVELS[r.level].color }} />
                  {LEVELS[r.level].label} {r.text}
                </span>
              ))
            ) : (
              <span className="text-ink-sub">微塑料未配置阈值，不分级</span>
            )}
            <span className="text-ink-sub">{ranges ? TARGET_CFG[target].unit : ''}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-ink-sub w-[64px]">其他状态</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ background: COLORS.unknown }} />
              未评价（无阈值）
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full border-2 border-dashed" style={{ borderColor: COLORS.unknown }} />
              无有效结果
            </span>
          </div>
          <div className="flex items-center gap-4 text-ink-sub">
            <span className="w-[64px]">水流</span>
            <span>▶ 水流方向（自南向北）｜底图 © OpenStreetMap</span>
          </div>
        </div>

      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 h-7 items-center text-[16px]">
      <span className="text-ink-sub shrink-0">{k}</span>
      <span className="text-ink tabular-nums text-right">{v}</span>
    </div>
  );
}

function InfoCard({ target, siteId, onOpenEvent, onOpenAnalysis }: Props) {
  const site = SITES.find((s) => s.id === siteId);
  if (!site) return null;
  const st = statusOf(target, siteId);
  const cfg = TARGET_CFG[target];
  const hasEvent = siteId === '城北入河口' && target === 'PFOS';

  return (
    <div className="bg-brand-panel border border-brand-border rounded-lg p-3">
      <div className="flex items-center justify-between">
        <span className="text-[20px] leading-7 font-medium">{site.id}</span>
        <span className="text-[16px] text-ink-sub">{SITE_TYPE_LABEL[site.type]}</span>
      </div>
      {st.result ? (
        <>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[16px] text-ink-sub">
              {target}{' '}
              <span className="text-[28px] leading-9 font-bold text-ink tabular-nums">{fmtValue(target, st.result.value)}</span>{' '}
              {cfg.unit}
            </span>
            <LevelTag level={st.level} />
          </div>
          <div className="mt-1 border-t border-brand-border pt-1">
            <Row k="项目演示阈值" v={fmtThreshold(target) ?? '未配置'} />
            <Row k="阈值比" v={st.ratio === null ? '—' : st.ratio.toFixed(2)} />
            <Row k="来源" v="实验室检测" />
            <Row k="采样时间" v={st.result.sampled ?? '未提供'} />
            <Row k="发布时间" v={st.result.published ?? '未提供'} />
            <Row k="质量状态" v="已审核" />
          </div>
        </>
      ) : (
        <div className="mt-2 mb-1 rounded border border-dashed border-unknown px-3 py-2 text-[16px] leading-6">
          <div className="text-[18px] text-ink">{target}：无有效结果</div>
          <div className="text-ink-sub">本期该点位没有可展示的 {target} 有效结果，不按未触发处理。</div>
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <button onClick={onOpenAnalysis} className="flex-1 h-9 rounded border border-info text-info text-[18px] cursor-pointer">
          目标物分析
        </button>
        <button
          onClick={hasEvent ? onOpenEvent : undefined}
          disabled={!hasEvent}
          className={`flex-1 h-9 rounded border text-[18px] ${
            hasEvent ? 'border-info text-info cursor-pointer' : 'border-brand-border text-ink-sub cursor-not-allowed'
          }`}
        >
          关联事件
        </button>
      </div>
      <div className="mt-1 text-[16px] leading-5 text-ink-sub">
        {hasEvent ? '关联事件已配置示例。' : '该点位暂无示例事件。'}
      </div>
    </div>
  );
}

