// 长沙市湘江段。湘江中心线取自 OpenStreetMap（经纬度，自南向北），各页面共用同一份点位坐标。
export type LatLng = [number, number];

export const XIANG: LatLng[] = [
  [27.9873, 112.9885], [27.9904, 112.9825], [27.9984, 112.9731], [28.0041, 112.9643], [28.0164, 112.952], [28.0226, 112.9482],
  [28.0345, 112.941], [28.0385, 112.9379], [28.0462, 112.932], [28.056, 112.9271], [28.073, 112.9235], [28.0852, 112.9255],
  [28.0933, 112.9287], [28.1088, 112.9429], [28.1094, 112.9435], [28.1139, 112.9459], [28.1215, 112.9499], [28.1277, 112.9512],
  [28.137, 112.9506], [28.1423, 112.9502], [28.1522, 112.9511], [28.1615, 112.9517], [28.1766, 112.9526], [28.1963, 112.9533],
  [28.1994, 112.9538], [28.2073, 112.9547], [28.2114, 112.9553], [28.2211, 112.9575], [28.2374, 112.9643], [28.2533, 112.9653],
  [28.257, 112.9655], [28.265, 112.9625], [28.277, 112.958], [28.2829, 112.9542], [28.3007, 112.9428], [28.3115, 112.9322],
  [28.3272, 112.9169], [28.3284, 112.9154], [28.3381, 112.9036], [28.3386, 112.9031], [28.3441, 112.8964], [28.3524, 112.8737],
  [28.3671, 112.8466], [28.3757, 112.837], [28.3846, 112.8271], [28.4082, 112.813], [28.4091, 112.8124], [28.4219, 112.8047],
  [28.4563, 112.7975], [28.462, 112.7942], [28.475, 112.7865], [28.4864, 112.7744], [28.4983, 112.7615], [28.5001, 112.7597],
  [28.5046, 112.7548], [28.5168, 112.7479],
];

// 用于初始取景，覆盖全部示例点位
export const MAP_BOUNDS: [LatLng, LatLng] = [
  [27.985, 112.74],
  [28.53, 113.0],
];

export type SiteType = 'section' | 'outfall' | 'plant' | 'source';

export const SITE_TYPES: { key: SiteType; label: string }[] = [
  { key: 'section', label: '监测断面' },
  { key: 'outfall', label: '工业园排口' },
  { key: 'plant', label: '污水厂' },
  { key: 'source', label: '饮用水水源地' },
];

export const SITE_TYPE_LABEL: Record<SiteType, string> = {
  section: '监测断面',
  outfall: '工业园排口',
  plant: '污水厂',
  source: '饮用水水源地',
};

export type Side = 'left' | 'right';

export interface SiteGeo {
  id: string;
  type: SiteType;
  pos: LatLng;
  // 与河道连接的位置，排口、污水厂画连接线
  join?: LatLng;
  side: Side;
}

// 点位位置为示例：城北入河口取浏阳河汇入湘江处，洋湖湿地取洋湖湿地公园中心，暮云工业园排口位于暮云工业园西侧的湘江东岸
export const SITES: SiteGeo[] = [
  { id: '上游水源保护区', type: 'source', pos: [28.0041, 112.9643], side: 'right' },
  { id: '暮云工业园排口', type: 'outfall', pos: [28.0395, 112.958], join: [28.0385, 112.9379], side: 'right' },
  { id: '洋湖湿地', type: 'section', pos: [28.1297, 112.9189], side: 'left' },
  { id: '城区污水厂尾水', type: 'plant', pos: [28.1522, 112.9711], join: [28.1522, 112.9511], side: 'right' },
  { id: '城北入河口', type: 'section', pos: [28.2533, 112.9653], side: 'right' },
  { id: '下游出境', type: 'section', pos: [28.4983, 112.7615], side: 'right' },
];

// 溯源页的拟定待采样位置，仅为示意，位置落在湘江干流上
export const PLANNED_SITES: { id: string; name: string; pos: LatLng; side: Side }[] = [
  { id: 'plan-a', name: '待采样A', pos: [28.0226, 112.9482], side: 'left' },
  { id: 'plan-b', name: '待采样B', pos: [28.0852, 112.9255], side: 'left' },
  { id: 'plan-c', name: '待采样C', pos: [28.2211, 112.9575], side: 'left' },
];

const KX = Math.cos((28.2 * Math.PI) / 180);

function dist(a: LatLng, b: LatLng) {
  return Math.hypot((a[0] - b[0]) * 111.2, (a[1] - b[1]) * 111.2 * KX);
}

function segmentProject(p: LatLng, a: LatLng, b: LatLng) {
  const ax = a[1] * KX;
  const ay = a[0];
  const dx = b[1] * KX - ax;
  const dy = b[0] - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[1] * KX - ax) * dx + (p[0] - ay) * dy) / len2));
  return { t, pt: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as LatLng };
}

// 将位置投影到湘江中心线，返回所在线段和投影点
export function nearestOnRiver(p: LatLng) {
  let best = { i: 0, t: 0, pt: XIANG[0], d: Infinity };
  for (let i = 0; i < XIANG.length - 1; i++) {
    const r = segmentProject(p, XIANG[i], XIANG[i + 1]);
    const d = dist(p, r.pt);
    if (d < best.d) best = { i, t: r.t, pt: r.pt, d };
  }
  return best;
}

// 自起点沿流向（向北）取占剩余河长 fraction 的折线，用于情景示意
export function downstreamPath(from: LatLng, fraction: number): LatLng[] {
  const s = nearestOnRiver(from);
  const pts: LatLng[] = [s.pt, ...XIANG.slice(s.i + 1)];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) total += dist(pts[i], pts[i + 1]);
  let remain = total * fraction;
  const out: LatLng[] = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const l = dist(pts[i], pts[i + 1]);
    if (remain <= l) {
      const t = l === 0 ? 0 : remain / l;
      out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]);
      return out;
    }
    out.push(pts[i + 1]);
    remain -= l;
  }
  return out;
}

// 流向箭头：沿中心线按河长比例取点，角度为屏幕上的前进方向
export function arrowsAlongRiver(fractions: number[]) {
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < XIANG.length - 1; i++) {
    const l = dist(XIANG[i], XIANG[i + 1]);
    lens.push(l);
    total += l;
  }
  return fractions.map((f) => {
    let remain = f * total;
    for (let i = 0; i < lens.length; i++) {
      if (remain <= lens[i] || i === lens.length - 1) {
        const t = remain / lens[i];
        const a = XIANG[i];
        const b = XIANG[i + 1];
        return {
          pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as LatLng,
          angle: (Math.atan2((b[0] - a[0]), (b[1] - a[1]) * KX) * 180) / Math.PI,
        };
      }
      remain -= lens[i];
    }
    return { pos: XIANG[0], angle: 0 };
  });
}
