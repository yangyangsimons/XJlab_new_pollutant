import { LEVELS, LevelKey } from '../data';
import { SiteType } from '../geo';

export interface IconStyle {
  fill: string;
  stroke: string;
  dash: boolean;
}

// 浅色底图上使用深色描边，保证符号可辨
export function iconStyle(level: LevelKey): IconStyle {
  if (level === 'noresult') return { fill: 'rgba(255,255,255,0.75)', stroke: '#64748B', dash: true };
  return { fill: LEVELS[level].color, stroke: '#0D2235', dash: false };
}

export function shapeSvg(type: SiteType, s: IconStyle, size = 30) {
  const dash = s.dash ? 'stroke-dasharray="3 3"' : '';
  const attrs = `fill="${s.fill}" stroke="${s.stroke}" stroke-width="2.5" ${dash} stroke-linejoin="round"`;
  let shape = '';
  if (type === 'section') shape = `<circle r="10" ${attrs}/>`;
  else if (type === 'outfall') shape = `<rect x="-10" y="-10" width="20" height="20" rx="2" ${attrs}/>`;
  else if (type === 'plant') shape = `<polygon points="0,-13 13,10 -13,10" ${attrs}/>`;
  else shape = `<polygon points="0,-14 14,0 0,14 -14,0" ${attrs}/>`;
  return `<svg width="${size}" height="${size}" viewBox="-15 -15 30 30" style="position:absolute;left:0;top:0;overflow:visible">${shape}</svg>`;
}

export function ringSvg(color = '#0D2235', r = 21) {
  return `<svg width="30" height="30" viewBox="-15 -15 30 30" style="position:absolute;left:0;top:0;overflow:visible"><circle r="${r}" fill="none" stroke="#fff" stroke-width="5"/><circle r="${r}" fill="none" stroke="${color}" stroke-width="2"/></svg>`;
}

export function labelHtml(text: string, side: 'left' | 'right', bold = false) {
  return `<span class="geo-label ${side}${bold ? ' bold' : ''}">${text}</span>`;
}

export interface SiteIconOpts {
  type: SiteType;
  level: LevelKey;
  label?: string;
  side: 'left' | 'right';
  selected?: boolean;
  opacity?: number;
  extra?: string;
}

// 30×30 的点位图标，以点位坐标为中心
export function siteIconHtml(o: SiteIconOpts) {
  const st = iconStyle(o.level);
  return (
    `<div style="position:relative;width:30px;height:30px;opacity:${o.opacity ?? 1}">` +
    (o.selected ? ringSvg() : '') +
    shapeSvg(o.type, st) +
    (o.extra ?? '') +
    (o.label ? labelHtml(o.label, o.side, o.selected) : '') +
    `</div>`
  );
}

export function arrowHtml(angle: number) {
  return `<svg width="26" height="26" viewBox="-13 -13 26 26" style="overflow:visible;transform:rotate(${-angle}deg)"><polygon points="-9,-7 9,0 -9,7" fill="#1D4ED8" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>`;
}

export function tagHtml(text: string, color: string, side: 'left' | 'right', top = 28) {
  const pos = side === 'right' ? 'left:30px' : 'right:30px';
  return `<span class="geo-tag" style="${pos};top:${top}px;color:${color};border-color:${color}">${text}</span>`;
}
