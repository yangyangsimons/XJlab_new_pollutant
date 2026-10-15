export type EvidenceState = '已提供' | '待补充' | '待复核';

export const EVIDENCE: { name: string; state: EvidenceState; note: string }[] = [
  { name: '检测结果', state: '已提供', note: '实验室检测 PFOS 46.8 ng/L，已审核；发布 2026-10-15 14:28' },
  { name: '质量控制资料', state: '待补充', note: '检测方法、检出限、报告编号未提供' },
  { name: '上下游采样对照', state: '待复核', note: '上游水源保护区 5.2、下游出境 12.6 ng/L 有结果，采样时间未提供' },
  { name: '排放时序', state: '待补充', note: '候选排口的排放时间序列未接入' },
  { name: '目标物关联资料', state: '待补充', note: '排口相关 PFOS 使用与排放资料未提供' },
  { name: '水文资料', state: '待补充', note: '流量、水位、流速资料未接入' },
];

export interface Candidate {
  id: string | null;
  name: string;
  evidence: string;
  gaps: string;
  status: string;
}

export const CANDIDATES: Candidate[] = [
  {
    id: '暮云工业园排口',
    name: '暮云工业园相关排口',
    evidence: '该点位环丙沙星 2.14 μg/L（高关注）；PFOS 无有效结果',
    gaps: 'PFOS 采样、排放时序、目标物使用资料',
    status: '待核查',
  },
  {
    id: '城区污水厂尾水',
    name: '城区污水厂尾水',
    evidence: 'PFOS 24.0 ng/L（关注，阈值比 1.20）；采样时间未提供',
    gaps: '采样时间、尾水排放时序、工艺资料',
    status: '待核查',
  },
  {
    id: null,
    name: '其他上游排口',
    evidence: '暂无关联证据',
    gaps: '排口清单与位置待核对，地图未标注',
    status: '待核查',
  },
];

export const TRACE_TASKS = [
  { id: 't1', title: '复核采样及实验室质量资料' },
  { id: 't2', title: '制定上下游与关联排口补充采样方案' },
  { id: 't3', title: '核对排放时序和目标物使用资料' },
  { id: 't4', title: '由专业人员评估敏感点影响' },
];

export const SCENARIO_NODES = [0, 2, 6, 12, 24];
// 预设动画范围（占起点下游干流的比例），仅用于示意，不是求解结果
export const SCENARIO_EXTENT = [0, 0.15, 0.4, 0.7, 1];

export const SCENARIO_STARTS = ['城北入河口', '暮云工业园排口', '城区污水厂尾水'];

export const MODEL_PARAMS: { name: string; state: string }[] = [
  { name: '河网资料', state: '待接入' },
  { name: '流量边界', state: '待接入' },
  { name: '排放时序', state: '待接入' },
  { name: '输运参数', state: '待配置' },
  { name: '模型状态', state: '未校验' },
];

export interface LocalTask {
  owner: string;
  due: string;
  note: string;
}
