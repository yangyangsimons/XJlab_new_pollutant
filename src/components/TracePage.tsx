import React, { useEffect, useState } from 'react';
import { Panel } from './Panel';
import { Drawer } from './Drawer';
import { LevelTag } from './StatusTag';
import { Mode, TraceMap } from './TraceMap';
import { COLORS, EVENT_DEMO, LEVELS, RESULTS, TARGETS, TARGET_CFG, Target, fmtValue, statusOf } from '../data';
import {
  CANDIDATES,
  EVIDENCE,
  EvidenceState,
  LocalTask,
  MODEL_PARAMS,
  SCENARIO_NODES,
  SCENARIO_STARTS,
  TRACE_TASKS,
} from '../traceData';
import { LegendShape } from './WatershedMap';

const STORAGE_KEY = 'demo-trace-tasks-v1';
const PURPLE = '#8B7CFF';

const inputCls =
  'w-full h-10 px-3 rounded bg-[#0A1B2B] border border-brand-border text-[18px] text-ink placeholder:text-unknown';

function loadTasks(): Record<string, LocalTask> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function Tag({ text, color, dashed }: { text: string; color: string; dashed?: boolean }) {
  return (
    <span
      className="inline-flex items-center px-2 h-6 rounded border text-[16px] leading-none whitespace-nowrap shrink-0"
      style={{ color, borderColor: color, backgroundColor: `${color}1F`, borderStyle: dashed ? 'dashed' : 'solid' }}
    >
      {text}
    </span>
  );
}

const EVIDENCE_COLOR: Record<EvidenceState, string> = {
  已提供: COLORS.info,
  待补充: COLORS.unknown,
  待复核: COLORS.alert,
};

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 h-7">
      <span className="text-[16px] text-ink-sub shrink-0">{k}</span>
      <span className="text-[18px] tabular-nums text-right flex items-center gap-2">{children}</span>
    </div>
  );
}

export default function TracePage() {
  const [mode, setMode] = useState<Mode>('evidence');
  const [target, setTarget] = useState<Target>('PFOS');
  const [focus, setFocus] = useState('城北入河口');
  const [p, setP] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [startId, setStartId] = useState(SCENARIO_STARTS[0]);
  const [tasks, setTasks] = useState<Record<string, LocalTask>>(loadTasks);
  const [draft, setDraft] = useState<null | { type: string; owner: string; due: string; note: string }>(null);
  const [error, setError] = useState('');

  // 仅在用户点击播放后推进，到末尾自动停止
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setP((v) => {
        const next = v + 0.0125 * speed;
        if (next >= 4) {
          setPlaying(false);
          return 4;
        }
        return next;
      });
    }, 50);
    return () => clearInterval(id);
  }, [playing, speed]);

  const ev = EVENT_DEMO;
  const result = RESULTS.PFOS[ev.site];
  const evSt = statusOf('PFOS', ev.site);
  const node = Math.round(p);
  const focusSt = statusOf('PFOS', focus);

  const openDraft = () => {
    const first = TRACE_TASKS.find((t) => !tasks[t.id]) ?? TRACE_TASKS[0];
    setError('');
    setDraft({ type: first.id, owner: '', due: '', note: '' });
  };

  const confirmDraft = () => {
    if (!draft) return;
    if (!draft.owner.trim() || !draft.due) {
      setError('请填写负责人和期限');
      return;
    }
    const next = { ...tasks, [draft.type]: { owner: draft.owner.trim(), due: draft.due, note: draft.note.trim() } };
    setTasks(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 本地存储不可用时仅保留在当前页面
    }
    setDraft(null);
  };

  const clearTasks = () => {
    setTasks({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 忽略
    }
  };

  return (
    <div className="flex-1 min-h-0 flex gap-4">
      <div className="w-[400px] shrink-0 flex flex-col gap-4">
        <Panel title="事件概览" className="h-[330px]" bodyClassName="px-3 py-2">
          <Row k="事件编号">{ev.id}</Row>
          <Row k="点位">{ev.site}</Row>
          <Row k="目标物结果">
            PFOS {fmtValue('PFOS', result.value)} ng/L
          </Row>
          <Row k="项目演示阈值">20 ng/L</Row>
          <Row k="阈值比">
            {evSt.ratio?.toFixed(2)}
            <LevelTag level={evSt.level} />
          </Row>
          <Row k="事件状态">
            <Tag text={ev.status} color={COLORS.info} />
          </Row>
          <div className="mt-2 rounded border border-brand-border bg-[#0A1B2B] px-3 py-2 text-[16px] leading-5">
            <div>触发依据：实验室结果发布后触发演示规则。</div>
            <div className="text-alert">报告发布时间不是污染发生时间。</div>
            <div className="text-ink-sub">关注等级为原型规则，不是应急响应等级。</div>
          </div>
        </Panel>

        {mode === 'evidence' ? (
          <Panel title="证据链" extra="6 项资料" className="flex-1 min-h-0" bodyClassName="px-3 py-2">
            <div className="flex flex-col">
              {EVIDENCE.map((e) => (
                <div key={e.name} className="py-[7px] border-b border-brand-border/60 last:border-b-0">
                  <div className="flex items-center justify-between h-6">
                    <span className="text-[18px] font-medium">{e.name}</span>
                    <Tag text={e.state} color={EVIDENCE_COLOR[e.state]} dashed={e.state === '待补充'} />
                  </div>
                  <div className="text-[16px] leading-5 text-ink-sub mt-1">{e.note}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[16px] leading-5 text-ink-sub">状态仅表示资料完备程度，不代表来源结论。</div>
          </Panel>
        ) : (
          <Panel title="情景参数" extra="未接入模型" className="flex-1 min-h-0" bodyClassName="px-3 py-2">
            <label className="block text-[16px] text-ink-sub">
              演示起点（设定，不代表来源判断）
              <select
                value={startId}
                onChange={(e) => {
                  setStartId(e.target.value);
                  setP(0);
                  setPlaying(false);
                }}
                className="mt-1 w-full h-9 px-2 rounded bg-[#0A1B2B] border border-brand-border text-[18px] text-ink cursor-pointer"
              >
                {SCENARIO_STARTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <div className="mt-2">
              {MODEL_PARAMS.map((m) => (
                <div key={m.name} className="flex items-center justify-between h-10 border-b border-brand-border/60 last:border-b-0">
                  <span className="text-[18px]">{m.name}</span>
                  <Tag text={m.state} color={COLORS.unknown} dashed />
                </div>
              ))}
            </div>
            <div className="mt-2 text-[16px] leading-5 text-ink-sub">
              参数面板仅列出建模所需资料的接入状态。动画为预设示意，不显示精确浓度、到达时间或置信区间。
            </div>
          </Panel>
        )}
      </div>

      <Panel
        title="溯源研判地图"
        extra={mode === 'evidence' ? '证据核查，非自动定责' : '情景演示，非求解结果'}
        className="flex-1 min-w-0"
        bodyClassName="p-0 flex flex-col"
      >
        <div className="relative flex-1 min-h-0">
          <TraceMap mode={mode} target={target} focus={focus} onFocus={setFocus} p={p} startId={startId} />
          {mode === 'evidence' ? (
            <div className="absolute z-10 top-3 left-3 rounded-lg bg-brand-panel border border-brand-border px-3 py-2 text-[16px] leading-6 max-w-[420px]">
              <div className="text-[18px] font-medium">{focus}</div>
              {focusSt.result ? (
                <div>
                  PFOS {fmtValue('PFOS', focusSt.result.value)} ng/L｜阈值比 {focusSt.ratio?.toFixed(2)}｜
                  <span style={{ color: LEVELS[focusSt.level].color }}>{LEVELS[focusSt.level].label}</span>
                </div>
              ) : (
                <div className="text-ink-sub">PFOS 无有效结果（不按未触发处理）</div>
              )}
            </div>
          ) : (
            <div className="absolute z-10 top-3 left-3 rounded-lg px-4 py-2 border-2" style={{ background: '#241A55', borderColor: PURPLE }}>
              <div className="text-[22px] leading-8 font-bold" style={{ color: '#E4DFFF' }}>
                情景动画示意｜未接入水动力与污染物输运模型
              </div>
              <div className="text-[16px] leading-6" style={{ color: '#CFC8FF' }}>
                {target}｜演示起点：{startId}（设定）｜预设节点 T+{SCENARIO_NODES[node]} 小时
              </div>
            </div>
          )}
        </div>

        <div className="h-[152px] shrink-0 border-t border-brand-border px-4 py-2 flex flex-col gap-1">
          <div className="flex items-center justify-between h-9">
            <div className="flex rounded border border-brand-border overflow-hidden">
              {(
                [
                  ['evidence', '实测与证据'],
                  ['scenario', '扩散情景演示'],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => {
                    setMode(k);
                    setPlaying(false);
                  }}
                  className={`h-9 px-4 text-[18px] cursor-pointer ${mode === k ? 'bg-info/20 text-info' : 'text-ink-sub'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {mode === 'scenario' && (
              <div className="flex items-center gap-3 text-[16px] text-ink-sub">
                一次仅展示一个目标物
                <div className="flex rounded border border-brand-border overflow-hidden">
                  {TARGETS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTarget(t)}
                      className={`h-8 px-3 text-[16px] cursor-pointer ${target === t ? 'bg-info/20 text-info' : 'text-ink-sub'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {mode === 'evidence' ? (
            <div className="h-12 flex items-center gap-5 text-[16px] whitespace-nowrap">
              <span className="flex items-center gap-1">
                <LegendShape type="section" level="high" /> 实心：已有 PFOS 实测（颜色=关注等级）
              </span>
              <span className="flex items-center gap-1">
                <svg width={22} height={22} viewBox="-15 -15 30 30">
                  <circle r={10} fill="none" stroke={COLORS.info} strokeWidth={2.5} />
                </svg>
                空心蓝：待采样
              </span>
              <span className="flex items-center gap-1">
                <LegendShape type="section" level="noresult" /> 灰虚线：无有效结果
              </span>
              <span className="flex items-center gap-1">
                <svg width={22} height={22} viewBox="-15 -15 30 30">
                  <rect x={-12} y={-12} width={24} height={24} rx={3} fill="none" stroke={COLORS.alert} strokeWidth={2} strokeDasharray="4 3" />
                </svg>
                虚线框：候选排口，待核查
              </span>
            </div>
          ) : (
            <div className="h-12 flex items-center gap-3">
              <button
                onClick={() => {
                  if (p >= 4) setP(0);
                  setPlaying(!playing);
                }}
                className="h-9 w-20 rounded border text-[18px] cursor-pointer"
                style={{ borderColor: PURPLE, color: '#E4DFFF' }}
              >
                {playing ? '暂停' : '播放'}
              </button>
              <button
                onClick={() => {
                  setPlaying(false);
                  setP(0);
                }}
                className="h-9 px-3 rounded border border-brand-border text-[18px] cursor-pointer"
              >
                重置
              </button>
              <label className="flex items-center gap-1 text-[16px] text-ink-sub">
                速度
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="h-9 px-2 rounded bg-[#0A1B2B] border border-brand-border text-[18px] text-ink cursor-pointer"
                >
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1×</option>
                  <option value={2}>2×</option>
                </select>
              </label>
              <div className="flex-1 min-w-0 pt-1 pl-3 pr-8">
                <input
                  type="range"
                  min={0}
                  max={4}
                  step={0.01}
                  value={p}
                  aria-label="情景时间轴"
                  onChange={(e) => {
                    setPlaying(false);
                    setP(Number(e.target.value));
                  }}
                  className="w-full cursor-pointer accent-[#8B7CFF]"
                />
                <div className="relative h-5 text-[16px] leading-5 text-ink-sub">
                  {SCENARIO_NODES.map((h, i) => (
                    <button
                      key={h}
                      onClick={() => {
                        setPlaying(false);
                        setP(i);
                      }}
                      className={`absolute -translate-x-1/2 whitespace-nowrap cursor-pointer ${node === i ? 'text-[#E4DFFF] font-bold' : ''}`}
                      style={{ left: `${(i / 4) * 100}%` }}
                    >
                      {h} h
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="text-[16px] leading-5 text-ink-sub">
            {mode === 'evidence'
              ? '实心为已有 PFOS 实测结果，空心蓝为拟定待采样位置（示意）；虚线框表示候选排口待核查，不代表来源已确认。上下游关系仅示意，点位间没有因果连线。'
              : '时间轴只控制预设动画状态，不是水动力或污染物输运求解结果；蓝紫色区域仅沿连通水系顺流向展开，不显示浓度、到达时间或置信区间。'}
          </div>
        </div>
      </Panel>

      <div className="w-[400px] shrink-0 flex flex-col gap-4">
        {mode === 'evidence' ? (
          <Panel title="候选来源" extra="待核查" className="h-[484px]" bodyClassName="px-3 py-2">
            <div className="rounded border border-alert bg-alert/10 px-3 py-2">
              <div className="text-[18px] font-medium text-alert">当前没有充分证据，尚不能排序</div>
              <div className="text-[16px] leading-5 text-ink-sub">不展示概率、贡献率或来源结论；列表顺序不代表可能性。</div>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {CANDIDATES.map((c) => (
                <button
                  key={c.name}
                  disabled={!c.id}
                  onClick={() => c.id && setFocus(c.id)}
                  className={`text-left rounded border px-3 py-1 ${
                    c.id && c.id === focus ? 'border-info bg-[#12304A]' : 'border-brand-border bg-[#0A1B2B]'
                  } ${c.id ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="flex items-center justify-between h-6">
                    <span className="text-[18px] font-medium">{c.name}</span>
                    <Tag text={c.status} color={COLORS.alert} dashed />
                  </div>
                  <div className="text-[16px] leading-5 mt-1">
                    <span className="text-ink-sub">关联证据　</span>
                    {c.evidence}
                  </div>
                  <div className="text-[16px] leading-5">
                    <span className="text-ink-sub">资料缺口　</span>
                    {c.gaps}
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        ) : (
          <Panel title="预测图" extra={`${target}｜${TARGET_CFG[target].unit}`} className="h-[484px]" bodyClassName="px-3 py-3">
            <div className="h-full rounded border border-dashed border-brand-border flex flex-col items-center justify-center text-center">
              <div className="text-[22px]">暂无模型结果</div>
              <div className="text-[16px] leading-6 text-ink-sub mt-1">未接入水动力与污染物输运模型，不生成预测曲线。</div>
            </div>
          </Panel>
        )}

        <Panel title="核查任务" extra="演示任务仅存本地" className="flex-1 min-h-0" bodyClassName="px-3 py-2 flex flex-col">
          <ol className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1">
            {TRACE_TASKS.map((t, i) => {
              const done = tasks[t.id];
              return (
                <li key={t.id} className="rounded bg-[#0A1B2B] px-3 py-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[18px] leading-6">
                      {i + 1}．{t.title}
                    </span>
                    <Tag text={done ? '草稿已存' : '待创建'} color={done ? COLORS.info : COLORS.unknown} dashed={!done} />
                  </div>
                  {done && (
                    <div className="text-[16px] leading-5 text-ink-sub">
                      负责人 {done.owner}｜期限 {done.due}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="mt-2 shrink-0 flex items-center gap-2">
            <button onClick={openDraft} className="flex-1 h-10 rounded border border-info text-info text-[18px] cursor-pointer">
              创建核查任务
            </button>
            {Object.keys(tasks).length > 0 && (
              <button onClick={clearTasks} className="h-10 px-3 rounded border border-brand-border text-[16px] text-ink-sub cursor-pointer">
                清除演示任务
              </button>
            )}
          </div>
          <div className="mt-1 text-[16px] leading-5 text-ink-sub">本页不下达封控排口、投放材料、停止取水等操作指令。</div>
        </Panel>
      </div>

      <Drawer isOpen={draft !== null} onClose={() => setDraft(null)} title="创建核查任务（草稿）">
        {draft && (
          <div className="flex flex-col gap-4">
            <label className="block text-[16px] text-ink-sub">
              任务类型
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                className={`${inputCls} mt-1 cursor-pointer`}
              >
                {TRACE_TASKS.map((t, i) => (
                  <option key={t.id} value={t.id}>
                    {i + 1}．{t.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[16px] text-ink-sub">
              负责人
              <input
                className={`${inputCls} mt-1`}
                value={draft.owner}
                placeholder="填写负责人"
                onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
              />
            </label>
            <label className="block text-[16px] text-ink-sub">
              期限
              <input type="date" className={`${inputCls} mt-1`} value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} />
            </label>
            <label className="block text-[16px] text-ink-sub">
              备注
              <textarea
                className={`${inputCls} mt-1 h-28 py-2`}
                value={draft.note}
                placeholder="可选"
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </label>
            {error && <div className="text-[16px] text-danger">{error}</div>}
            <div className="rounded border border-brand-border bg-brand-panel px-4 py-3 text-[16px] leading-6 text-ink-sub">
              演示任务只保存在本机浏览器，不会下发。本页不下达封控排口、投放材料、停止取水等操作指令。
            </div>
            <div className="flex gap-3">
              <button onClick={confirmDraft} className="flex-1 h-10 rounded border border-info text-info text-[18px] cursor-pointer">
                确认创建
              </button>
              <button onClick={() => setDraft(null)} className="flex-1 h-10 rounded border border-brand-border text-[18px] cursor-pointer">
                取消
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
