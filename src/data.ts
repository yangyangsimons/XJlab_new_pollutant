export const COLORS = {
  info: '#38BDF8',
  ok: '#2DD4BF',
  warn: '#FACC15',
  alert: '#FB923C',
  danger: '#F87171',
  unknown: '#94A3B8',
};

export type LevelKey = 'none' | 'watch' | 'mid' | 'high' | 'unevaluated' | 'noresult';

export const LEVELS: Record<LevelKey, { label: string; color: string }> = {
  none: { label: '未触发', color: COLORS.ok },
  watch: { label: '关注', color: COLORS.warn },
  mid: { label: '中关注', color: COLORS.alert },
  high: { label: '高关注', color: COLORS.danger },
  unevaluated: { label: '未评价', color: COLORS.unknown },
  noresult: { label: '无有效结果', color: COLORS.unknown },
};

export type Target = 'PFOS' | '环丙沙星' | '微塑料';
export const TARGETS: Target[] = ['PFOS', '环丙沙星', '微塑料'];

// 项目演示阈值（原型规则）；微塑料未配置
export const TARGET_CFG: Record<Target, { unit: string; threshold: number | null; decimals: number; ticks: number[] }> = {
  PFOS: { unit: 'ng/L', threshold: 20, decimals: 1, ticks: [0, 20, 40, 60] },
  环丙沙星: { unit: 'μg/L', threshold: 1.0, decimals: 2, ticks: [0, 1, 2, 3] },
  微塑料: { unit: 'items/L', threshold: null, decimals: 1, ticks: [0, 8, 16, 24] },
};

export function levelOf(ratio: number | null): LevelKey {
  if (ratio === null) return 'unevaluated';
  if (ratio > 2) return 'high';
  if (ratio > 1.5) return 'mid';
  if (ratio > 1) return 'watch';
  return 'none';
}

export function fmtValue(target: Target, v: number) {
  return v.toFixed(TARGET_CFG[target].decimals);
}

export function fmtThreshold(target: Target) {
  const { threshold, unit } = TARGET_CFG[target];
  if (threshold === null) return null;
  return `${threshold.toFixed(target === 'PFOS' ? 0 : 2)} ${unit}`;
}

export function legendRanges(target: Target) {
  const t = TARGET_CFG[target].threshold;
  if (t === null) return null;
  const f = (n: number) => n.toFixed(target === 'PFOS' ? 0 : 2);
  return [
    { level: 'none' as LevelKey, text: `≤${f(t)}` },
    { level: 'watch' as LevelKey, text: `${f(t)}–${f(t * 1.5)}` },
    { level: 'mid' as LevelKey, text: `${f(t * 1.5)}–${f(t * 2)}` },
    { level: 'high' as LevelKey, text: `>${f(t * 2)}` },
  ];
}

export interface SiteResult {
  value: number;
  sampled?: string;
  published?: string;
}

// 各目标物本期已审核结果；未列出的点位视为无有效结果
export const RESULTS: Record<Target, Record<string, SiteResult>> = {
  PFOS: {
    城北入河口: { value: 46.8, sampled: '2026-10-14 09:00', published: '2026-10-15 14:28' },
    洋湖湿地: { value: 32.0 },
    城区污水厂尾水: { value: 24.0 },
    下游出境: { value: 12.6 },
    上游水源保护区: { value: 5.2 },
  },
  环丙沙星: {
    暮云工业园排口: { value: 2.14, sampled: '2026-10-14 09:30', published: '2026-10-15 14:16' },
  },
  微塑料: {
    洋湖湿地: { value: 18.6 },
  },
};

export interface SiteStatus {
  level: LevelKey;
  result?: SiteResult;
  ratio: number | null;
}

export function statusOf(target: Target, site: string): SiteStatus {
  const result = RESULTS[target][site];
  if (!result) return { level: 'noresult', ratio: null };
  const t = TARGET_CFG[target].threshold;
  const ratio = t === null ? null : result.value / t;
  return { level: levelOf(ratio), result, ratio };
}

export function rankingOf(target: Target) {
  return Object.entries(RESULTS[target])
    .map(([site, r]) => ({ site, ...statusOf(target, site), value: r.value }))
    .sort((a, b) => b.value - a.value);
}

// 明确配置的演示数据：城北入河口 PFOS 10月8日至14日各一次模拟采样
export const TREND: Record<string, { dates: string[]; values: number[] }> = {
  '城北入河口|PFOS': {
    dates: ['8', '9', '10', '11', '12', '13', '14'],
    values: [18.2, 20.4, 19.8, 25.6, 31.2, 40.5, 46.8],
  },
};

export const KPIS = [
  { label: '监测点位', value: '128', suffix: '', note: '示例流域全域' },
  { label: '有效结果', value: '120', suffix: '/128', note: '无有效结果 8' },
  { label: 'PFOS检出', value: '38', suffix: '/120', note: '检出率 31.7%' },
  { label: '阈值触发点位', value: '8', suffix: '', note: '按点位去重' },
  { label: '未闭环事件', value: '17', suffix: '', note: '本期事件 48 起' },
  { label: '终端在线率', value: '96.9', suffix: '%', note: '31/32 台在线，离线 1 台' },
];

export const DETECTION_RATES = [
  { name: 'PFOS', hit: 38, total: 120, rate: 31.7 },
  { name: '环丙沙星', hit: 24, total: 100, rate: 24.0 },
  { name: '双酚A', hit: 30, total: 100, rate: 30.0 },
  { name: '微塑料', hit: 18, total: 40, rate: 45.0 },
];

export interface AlertItem {
  site: string;
  target: 'PFOS' | '环丙沙星';
  published?: string;
}

export const ALERTS: AlertItem[] = [
  { site: '城北入河口', target: 'PFOS', published: '10月15日 14:28' },
  { site: '暮云工业园排口', target: '环丙沙星', published: '10月15日 14:16' },
  { site: '洋湖湿地', target: 'PFOS' },
  { site: '城区污水厂尾水', target: 'PFOS' },
];

export const EVENT_STATUS = [
  { label: '待核查', value: 5, color: '#7DD3FC' },
  { label: '核查中', value: 7, color: '#38BDF8' },
  { label: '处置中', value: 5, color: '#0EA5E9' },
  { label: '已闭环', value: 31, color: '#64748B' },
];

export const EVENT_DEMO = {
  id: 'DEMO-NP-20261015-032',
  site: '城北入河口',
  target: 'PFOS' as Target,
  status: '核查中',
};

export const CHECKS = ['复核检测质量', '补充上下游采样', '核对排口资料'];

export type Quality = 'all' | 'reviewed' | 'pending';
export type Range = 'last7' | 'period';

// 目标物分类信息；未提供的字段不补齐
export const TARGET_META: Record<Target, { name: string; group: string; scope: string }> = {
  PFOS: { name: 'PFOS', group: 'PFAS（目标物组）', scope: '单一目标物' },
  环丙沙星: { name: '环丙沙星', group: '未提供', scope: '单一目标物' },
  微塑料: { name: '微塑料', group: '未提供', scope: '未提供' },
};

export const RULE_VERSION = 'DEMO-1.0';

export function statusWithQuality(target: Target, site: string, quality: Quality): SiteStatus {
  // 示例结果均为已审核；“待审核”筛选下没有符合条件的结果
  if (quality === 'pending') return { level: 'noresult', ratio: null };
  return statusOf(target, site);
}

export function eventOf(target: Target, site: string) {
  return site === EVENT_DEMO.site && target === EVENT_DEMO.target ? EVENT_DEMO : null;
}
