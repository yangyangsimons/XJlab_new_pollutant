import React, { useRef } from 'react';
import { Target, SiteStatus, statusOf } from '../data';
import { PLANNED_SITES, SITES, XIANG, arrowsAlongRiver, downstreamPath } from '../geo';
import { SCENARIO_EXTENT } from '../traceData';
import { GeoMap, GeoMapHandle, LineSpec, MarkerSpec } from './GeoMap';
import { arrowHtml, labelHtml, siteIconHtml, tagHtml } from './mapIcons';

const PURPLE = '#8B7CFF';
const CANDIDATE_IDS = ['暮云工业园排口', '城区污水厂尾水'];

export type Mode = 'evidence' | 'scenario';

interface Props {
  mode: Mode;
  target: Target;
  focus: string;
  onFocus: (id: string) => void;
  p: number;
  startId: string;
}

function extentAt(p: number) {
  const i = Math.min(SCENARIO_EXTENT.length - 2, Math.floor(p));
  return SCENARIO_EXTENT[i] + (SCENARIO_EXTENT[i + 1] - SCENARIO_EXTENT[i]) * (p - i);
}

export function TraceMap({ mode, target, focus, onFocus, p, startId }: Props) {
  const ref = useRef<GeoMapHandle>(null);
  const evidence = mode === 'evidence';
  const shownTarget: Target = evidence ? 'PFOS' : target;
  const startSite = SITES.find((s) => s.id === startId)!;
  const f = extentAt(p);

  const markers: MarkerSpec[] = [];
  const lines: LineSpec[] = [];

  lines.push({ points: XIANG, color: '#1D4ED8', weight: 3, opacity: 0.4, round: true });
  SITES.filter((s) => s.join).forEach((s) => lines.push({ points: [s.pos, s.join!], color: '#0D2235', weight: 2, opacity: 0.55 }));

  if (!evidence && f > 0) {
    lines.push({ points: downstreamPath(startSite.join ?? startSite.pos, f), color: PURPLE, weight: 34, opacity: 0.45, round: true });
  }

  arrowsAlongRiver([0.1, 0.25, 0.4, 0.55, 0.7, 0.82, 0.93]).forEach((a, i) =>
    markers.push({ id: 'arrow-' + i, pos: a.pos, html: arrowHtml(a.angle), z: -100 }),
  );
  markers.push({
    id: 'up',
    pos: XIANG[0],
    html: `<div style="position:relative;width:30px;height:30px">${labelHtml('上游（南）', 'left', true)}</div>`,
    z: -50,
  });
  markers.push({
    id: 'down',
    pos: XIANG[XIANG.length - 1],
    html: `<div style="position:relative;width:30px;height:30px">${labelHtml('下游（北）', 'left', true)}</div>`,
    z: -50,
  });

  if (evidence) {
    PLANNED_SITES.forEach((s) =>
      markers.push({
        id: s.id,
        pos: s.pos,
        html:
          `<div style="position:relative;width:30px;height:30px"><svg width="30" height="30" viewBox="-15 -15 30 30" style="position:absolute;overflow:visible">` +
          `<circle r="10" fill="#fff" fill-opacity="0.6" stroke="#0369A1" stroke-width="3"/></svg>${labelHtml(s.name, s.side)}</div>`,
      }),
    );
  } else {
    markers.push({
      id: 'start',
      pos: startSite.join ?? startSite.pos,
      html: `<div style="position:relative;width:30px;height:30px"><svg width="30" height="30" viewBox="-15 -15 30 30" style="position:absolute;overflow:visible"><circle r="14" fill="none" stroke="${PURPLE}" stroke-width="3" stroke-dasharray="4 3"/></svg></div>`,
      z: 50,
    });
  }

  SITES.forEach((s) => {
    const st: SiteStatus = statusOf(shownTarget, s.id);
    const cand = evidence && CANDIDATE_IDS.includes(s.id);
    const isEvent = evidence && s.id === '城北入河口';
    const extra =
      (isEvent
        ? `<svg width="30" height="30" viewBox="-15 -15 30 30" style="position:absolute;overflow:visible"><circle r="26" fill="none" stroke="#B91C1C" stroke-width="1.5" stroke-dasharray="2 3"/></svg>`
        : '') +
      (cand
        ? `<svg width="30" height="30" viewBox="-15 -15 30 30" style="position:absolute;overflow:visible"><rect x="-20" y="-20" width="40" height="40" rx="4" fill="none" stroke="#C2410C" stroke-width="2.5" stroke-dasharray="5 3"/></svg>` +
          tagHtml('待核查', '#C2410C', s.side, -32)
        : '');
    markers.push({
      id: s.id,
      pos: s.pos,
      z: s.id === focus ? 500 : 100,
      onClick: () => onFocus(s.id),
      html: siteIconHtml({ type: s.type, level: st.level, label: s.id, side: s.side, selected: s.id === focus, extra }),
    });
  });

  return (
    <>
      <GeoMap ref={ref} markers={markers} lines={lines} padding={[16, 90, 16, 16]} className="absolute inset-0" />
      <button
        onClick={() => ref.current?.fit()}
        className="absolute z-10 bottom-[26px] right-[62px] h-[34px] px-3 rounded bg-white text-[16px] text-[#0D2235] border border-[#9CA3AF] cursor-pointer"
      >
        重置视图
      </button>
    </>
  );
}

