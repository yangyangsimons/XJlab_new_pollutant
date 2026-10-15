import React from 'react';
import { LEVELS, Quality, TARGET_CFG, Target, legendRanges, statusWithQuality } from '../data';
import { SITES } from '../geo';
import { GeoMap, MarkerSpec } from './GeoMap';
import { siteIconHtml } from './mapIcons';
import { LegendShape } from './WatershedMap';

interface Props {
  target: Target;
  quality: Quality;
  siteId: string;
  onSite: (id: string) => void;
}

// 复用同一份点位坐标，仅显示各点位的实测状态，不生成浓度面
export function SpatialMap({ target, quality, siteId, onSite }: Props) {
  const ranges = legendRanges(target);
  const markers: MarkerSpec[] = SITES.map((s) => {
    const st = statusWithQuality(target, s.id, quality);
    return {
      id: s.id,
      pos: s.pos,
      z: s.id === siteId ? 500 : 0,
      onClick: () => onSite(s.id),
      html: siteIconHtml({ type: s.type, level: st.level, label: s.id, side: s.side, selected: s.id === siteId }),
    };
  });
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 relative">
        <GeoMap markers={markers} className="absolute inset-0" />
      </div>
      <div className="h-8 shrink-0 px-3 flex items-center gap-3 text-[16px] whitespace-nowrap overflow-hidden">
        {ranges ? (
          <>
            {ranges.map((r) => (
              <span key={r.level} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ background: LEVELS[r.level].color }} />
                {r.text}
              </span>
            ))}
            <span className="text-ink-sub">{TARGET_CFG[target].unit}</span>
          </>
        ) : (
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: LEVELS.unevaluated.color }} />
            未评价（未配置阈值）
          </span>
        )}
        <span className="flex items-center gap-1">
          <LegendShape type="section" level="noresult" />
          无结果
        </span>
      </div>
    </div>
  );
}
