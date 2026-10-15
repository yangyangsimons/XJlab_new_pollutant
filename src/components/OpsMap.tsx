import React, { useRef } from 'react';
import { COLORS, LEVELS, Target, TARGET_CFG, legendRanges, statusOf } from '../data';
import { SITES, SITE_TYPES, XIANG, arrowsAlongRiver } from '../geo';
import { TERMINALS, POINT_META, isExpired } from '../opsData';
import { GeoMap, GeoMapHandle, LineSpec, MarkerSpec } from './GeoMap';
import { arrowHtml, siteIconHtml } from './mapIcons';
import { LegendShape } from './WatershedMap';

export type OpsTab = 'points' | 'terminals' | 'tasks';

interface Props {
  tab: OpsTab;
  target: Target;
  windowHours: number | null;
  now: Date;
  matchSites: Set<string>;
  selectedSite: string | null;
  taskCounts: Record<string, number>;
  onSelectSite: (site: string) => void;
}

function badge(inner: string) {
  return `<div style="position:absolute;left:20px;top:-22px">${inner}</div>`;
}

export function OpsMap({ tab, target, windowHours, now, matchSites, selectedSite, taskCounts, onSelectSite }: Props) {
  const ref = useRef<GeoMapHandle>(null);
  const ranges = legendRanges(target);

  const markers: MarkerSpec[] = [];
  const lines: LineSpec[] = [{ points: XIANG, color: '#1D4ED8', weight: 3, opacity: 0.4, round: true }];
  SITES.filter((s) => s.join).forEach((s) => lines.push({ points: [s.pos, s.join!], color: '#0D2235', weight: 2, opacity: 0.55 }));
  arrowsAlongRiver([0.1, 0.25, 0.4, 0.55, 0.7, 0.82, 0.93]).forEach((a, i) =>
    markers.push({ id: 'arrow-' + i, pos: a.pos, html: arrowHtml(a.angle), z: -100 }),
  );

  SITES.forEach((s) => {
    const st = statusOf(target, s.id);
    const stale = !!st.result && isExpired(st.result.sampled, windowHours, now);
    const term = TERMINALS.find((t) => t.id === POINT_META[s.id]?.terminal);
    let extra = '';
    if (tab === 'terminals') {
      if (term) {
        const online = term.comm === '在线';
        const box = `<span style="display:block;width:18px;height:18px;border-radius:4px;box-sizing:border-box;background:${online ? '#0284C7' : '#fff'};border:2px ${online ? 'solid' : 'dashed'} ${online ? '#fff' : '#0D2235'}"></span>`;
        const dot = term.maint && term.maint !== '正常' ? `<span style="position:absolute;right:-5px;top:-5px;width:10px;height:10px;border-radius:50%;background:#FACC15;border:1.5px solid #0D2235"></span>` : '';
        extra = badge(`<div style="position:relative">${box}${dot}</div>`);
      } else {
        extra = `<span class="geo-tag" style="left:30px;top:26px;color:#64748B;border-color:#64748B">未关联终端</span>`;
      }
    }
    if (tab === 'tasks' && taskCounts[s.id] > 0) {
      extra = badge(
        `<span style="display:flex;width:22px;height:22px;border-radius:50%;background:#fff;border:2px solid #0284C7;align-items:center;justify-content:center;font-size:16px;line-height:1;color:#0D2235">${taskCounts[s.id]}</span>`,
      );
    }
    markers.push({
      id: s.id,
      pos: s.pos,
      z: s.id === selectedSite ? 500 : 100,
      onClick: () => onSelectSite(s.id),
      html: siteIconHtml({
        type: s.type,
        level: st.level,
        label: s.id,
        side: s.side,
        selected: s.id === selectedSite,
        opacity: !matchSites.has(s.id) ? 0.3 : tab === 'points' && stale ? 0.5 : 1,
        extra,
      }),
    });
  });

  return (
    <div className="absolute inset-0">
      <GeoMap ref={ref} markers={markers} lines={lines} padding={[220, 16, 16, 16]} className="absolute inset-0" />

      <div className="absolute z-10 top-3 left-3 w-[200px] rounded-lg bg-brand-panel border border-brand-border px-3 py-2 text-[16px] leading-6">
        {tab === 'points' && (
          <>
            <div className="text-ink-sub">点位类型</div>
            {SITE_TYPES.map((t) => (
              <div key={t.key} className="flex items-center gap-1">
                <LegendShape type={t.key} level="none" />
                {t.label}
              </div>
            ))}
            <div className="text-ink-sub mt-1">
              {target}（{TARGET_CFG[target].unit}）
            </div>
            {ranges ? (
              ranges.map((r) => (
                <div key={r.level} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ background: LEVELS[r.level].color }} />
                  {LEVELS[r.level].label} {r.text}
                </div>
              ))
            ) : (
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ background: COLORS.unknown }} />
                未评价
              </div>
            )}
            <div className="flex items-center gap-1">
              <LegendShape type="section" level="noresult" />
              无有效结果
            </div>
          </>
        )}
        {tab === 'terminals' && (
          <>
            <div className="text-ink-sub">遥测终端</div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded" style={{ background: '#0284C7' }} />
              通讯在线
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded border-2 border-dashed border-ink" />
              通讯离线
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: COLORS.warn }} />
              校准或维护中
            </div>
            <div className="text-ink-sub mt-1">2 台终端关联点位未提供，未上图</div>
          </>
        )}
        {tab === 'tasks' && (
          <>
            <div className="text-ink-sub">采样检测任务</div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full border-2 border-info text-[16px] leading-4 text-center">n</span>
              该点位示例任务数
            </div>
            <div className="text-ink-sub mt-1">任务数不等于样品数或结果数</div>
          </>
        )}
      </div>

      <button
        onClick={() => ref.current?.fit()}
        className="absolute z-10 bottom-[26px] right-[62px] h-[34px] px-3 rounded bg-white text-[16px] text-[#0D2235] border border-[#9CA3AF] cursor-pointer"
      >
        重置视图
      </button>
    </div>
  );
}

