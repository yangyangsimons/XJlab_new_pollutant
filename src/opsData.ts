import { Target } from './data';

export type Comm = '在线' | '离线' | '未知';
export type Maint = '正常' | '校准中' | '维护中';

export interface Terminal {
  id: string;
  site: string | null;
  funcs: string[];
  comm: Comm;
  heartbeat?: string;
  maint?: Maint;
  records: { time: string; text: string }[];
}

// 示例终端明细，仅用于通讯、水文或采样设备状态采集，不含任何新污染物连续测定能力
export const TERMINALS: Terminal[] = [
  { id: 'TM-001', site: '城北入河口', funcs: ['水位', '流量', '通讯状态'], comm: '在线', heartbeat: '2026-10-15 17:12:08', maint: '正常', records: [] },
  { id: 'TM-002', site: '暮云工业园排口', funcs: ['流量', '通讯状态'], comm: '在线', heartbeat: '2026-10-15 17:12:41', maint: '正常', records: [] },
  {
    id: 'TM-003',
    site: '城区污水厂尾水',
    funcs: ['采样设备状态', '通讯状态'],
    comm: '在线',
    heartbeat: '2026-10-15 17:11:57',
    maint: '校准中',
    records: [{ time: '2026-10-15 15:30', text: '开始校准（示例记录）' }],
  },
  { id: 'TM-004', site: '洋湖湿地', funcs: ['水位', '通讯状态'], comm: '离线', heartbeat: '2026-10-14 21:36:05', records: [] },
  { id: 'TM-005', site: '下游出境', funcs: ['水位', '流量', '通讯状态'], comm: '在线', heartbeat: '2026-10-15 17:12:30', maint: '正常', records: [] },
  {
    id: 'TM-006',
    site: null,
    funcs: ['采样设备状态'],
    comm: '在线',
    heartbeat: '2026-10-15 17:10:19',
    maint: '维护中',
    records: [{ time: '2026-10-14 10:00', text: '进入维护（示例记录）' }],
  },
  { id: 'TM-007', site: null, funcs: ['通讯状态'], comm: '在线', heartbeat: '2026-10-15 17:12:02', maint: '正常', records: [] },
];

export const SUBBASINS = ['湘江干流', '浏阳河流域', '捞刀河流域', '靳江流域'];

export const POINT_META: Record<string, { subbasin: string; terminal: string | null }> = {
  城北入河口: { subbasin: '浏阳河流域', terminal: 'TM-001' },
  暮云工业园排口: { subbasin: '湘江干流', terminal: 'TM-002' },
  城区污水厂尾水: { subbasin: '湘江干流', terminal: 'TM-003' },
  洋湖湿地: { subbasin: '湘江干流', terminal: 'TM-004' },
  下游出境: { subbasin: '湘江干流', terminal: 'TM-005' },
  上游水源保护区: { subbasin: '湘江干流', terminal: null },
};

export const TASK_FLOW = ['待采样', '已采样', '已送检', '检测中', '待审核', '已发布'] as const;
export type TaskStatus = (typeof TASK_FLOW)[number];

export const TARGET_GROUP: Record<Target, string> = {
  PFOS: 'PFAS（PFOS）',
  环丙沙星: '抗生素（环丙沙星）',
  微塑料: '微塑料',
};

export interface Task {
  id: string;
  site: string;
  target: Target;
  plan: string;
  actual?: string;
  received?: string;
  published?: string;
  status: TaskStatus;
  owner?: string;
  draft?: boolean;
}

// 示例任务明细：任务数、样品数、目标物结果数是三个不同口径，此处只给出任务
export const TASKS: Task[] = [
  { id: 'TK-20261014-001', site: '城北入河口', target: 'PFOS', plan: '2026-10-14 09:00', actual: '2026-10-14 09:00', published: '2026-10-15 14:28', status: '已发布' },
  { id: 'TK-20261014-002', site: '暮云工业园排口', target: '环丙沙星', plan: '2026-10-14 09:30', actual: '2026-10-14 09:30', published: '2026-10-15 14:16', status: '已发布' },
  { id: 'TK-20261015-003', site: '下游出境', target: 'PFOS', plan: '2026-10-15 08:30', actual: '2026-10-15 08:30', received: '2026-10-15 15:20', status: '待审核' },
  { id: 'TK-20261015-004', site: '洋湖湿地', target: '微塑料', plan: '2026-10-15 09:00', actual: '2026-10-15 09:10', received: '2026-10-15 13:40', status: '检测中' },
  { id: 'TK-20261015-005', site: '暮云工业园排口', target: 'PFOS', plan: '2026-10-15 10:00', actual: '2026-10-15 10:05', status: '已送检' },
  { id: 'TK-20261015-006', site: '上游水源保护区', target: 'PFOS', plan: '2026-10-15 11:00', actual: '2026-10-15 11:00', status: '已采样' },
  { id: 'TK-20261014-007', site: '城区污水厂尾水', target: 'PFOS', plan: '2026-10-14 10:00', status: '待采样' },
  { id: 'TK-20261016-008', site: '城北入河口', target: 'PFOS', plan: '2026-10-16 09:00', status: '待采样' },
];

export const WINDOW_OPTIONS: { value: string; label: string; hours: number | null }[] = [
  { value: 'none', label: '未配置', hours: null },
  { value: '24', label: '24 小时', hours: 24 },
  { value: '72', label: '72 小时', hours: 72 },
  { value: '168', label: '7 天', hours: 168 },
];

export function parseTime(s?: string) {
  if (!s) return null;
  const d = new Date(s.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

// 仅在配置了有效时窗且采样时间已知时才判定过期，采样时间保持原值
export function isExpired(sampled: string | undefined, hours: number | null, now: Date) {
  if (hours === null) return false;
  const t = parseTime(sampled);
  if (!t) return false;
  return now.getTime() - t.getTime() > hours * 3600 * 1000;
}

export function isOverdue(t: Task, now: Date) {
  if (t.status !== '待采样') return false;
  const p = parseTime(t.plan);
  return p !== null && p.getTime() < now.getTime();
}
