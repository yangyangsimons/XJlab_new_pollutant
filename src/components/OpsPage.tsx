import React, { useEffect, useMemo, useState } from 'react';
import { Panel } from './Panel';
import { Drawer } from './Drawer';
import { LevelTag } from './StatusTag';
import { OpsMap, OpsTab } from './OpsMap';
import {
  COLORS,
  LEVELS,
  RESULTS,
  TARGETS,
  TARGET_CFG,
  Target,
  eventOf,
  fmtValue,
  statusOf,
  LevelKey,
} from '../data';
import { SITES, SITE_TYPES, SITE_TYPE_LABEL } from '../geo';
import {
  Comm,
  Maint,
  POINT_META,
  SUBBASINS,
  TARGET_GROUP,
  TASKS,
  TASK_FLOW,
  TERMINALS,
  Task,
  TaskStatus,
  Terminal,
  WINDOW_OPTIONS,
  isExpired,
  isOverdue,
} from '../opsData';

const PAGE_SIZE = 5;
const UNKNOWN = '未提供';
const WINDOW_KEY = 'demo-ops-window';
const DRAFT_KEY = 'demo-ops-task-drafts';

const fieldCls = 'w-full h-9 px-2 rounded bg-[#0A1B2B] border border-brand-border text-[18px] text-ink';
const ALL = '全部';

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 本地存储不可用时仅保留在当前页面
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

const COMM_COLOR: Record<Comm, string> = { 在线: COLORS.info, 离线: COLORS.danger, 未知: COLORS.unknown };
const MAINT_COLOR: Record<string, string> = { 正常: COLORS.unknown, 校准中: COLORS.warn, 维护中: COLORS.alert, [UNKNOWN]: COLORS.unknown };

function CommTag({ v }: { v: Comm }) {
  return <Tag text={v} color={COMM_COLOR[v]} />;
}
function MaintTag({ v }: { v?: Maint }) {
  return <Tag text={v ?? UNKNOWN} color={MAINT_COLOR[v ?? UNKNOWN]} dashed={!v} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[16px] leading-5 text-ink-sub">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function KV({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-[26px] text-[16px]">
      <span className="text-ink-sub shrink-0">{k}</span>
      <span className="text-right tabular-nums flex items-center gap-2 flex-wrap justify-end">{children}</span>
    </div>
  );
}

function Notice({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="rounded border px-3 py-1 text-[16px] leading-5" style={{ borderColor: color, color, backgroundColor: `${color}14` }}>
      {children}
    </div>
  );
}

interface Col<T> {
  h: string;
  w: string;
  r: (row: T) => React.ReactNode;
}

function Table<T>({
  cols,
  rows,
  rid,
  sel,
  onSel,
  page,
  onPage,
  state,
  onRetry,
  onClear,
  filtered,
}: {
  cols: Col<T>[];
  rows: T[];
  rid: (r: T) => string;
  sel: string | null;
  onSel: (id: string) => void;
  page: number;
  onPage: (p: number) => void;
  state: 'ok' | 'loading' | 'error';
  onRetry: () => void;
  onClear: () => void;
  filtered: boolean;
}) {
  const template = cols.map((c) => c.w).join(' ');
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const cur = Math.min(page, pages - 1);
  const shown = rows.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE);

  if (state === 'error') {
    return (
      <div className="h-full rounded border border-dashed border-danger flex flex-col items-center justify-center gap-2">
        <div className="text-[18px] text-danger">明细加载失败</div>
        <div className="text-[16px] text-ink-sub">未能获取示例明细，已有汇总指标不受影响。</div>
        <button onClick={onRetry} className="h-9 px-5 rounded border border-info text-info text-[18px] cursor-pointer">
          重试
        </button>
      </div>
    );
  }
  if (state === 'loading') {
    return <div className="h-full flex items-center justify-center text-[18px] text-ink-sub">加载中…</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="h-full rounded border border-dashed border-brand-border flex flex-col items-center justify-center gap-2">
        <div className="text-[18px]">{filtered ? '筛选无结果' : '暂无示例明细'}</div>
        {filtered && (
          <>
            <div className="text-[16px] text-ink-sub">当前条件下没有匹配的示例明细，不代表流域内没有该类对象。</div>
            <button onClick={onClear} className="h-9 px-5 rounded border border-info text-info text-[18px] cursor-pointer">
              清除筛选
            </button>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full">
      <div className="grid gap-x-3 h-7 items-center text-[16px] text-ink-sub border-b border-brand-border" style={{ gridTemplateColumns: template }}>
        {cols.map((c) => (
          <span key={c.h}>{c.h}</span>
        ))}
      </div>
      {shown.map((row) => (
        <div
          key={rid(row)}
          onClick={() => onSel(rid(row))}
          className={`grid gap-x-3 h-8 items-center text-[18px] border-b border-brand-border/60 cursor-pointer ${rid(row) === sel ? 'bg-[#12304A]' : ''}`}
          style={{ gridTemplateColumns: template }}
        >
          {cols.map((c) => (
            <div key={c.h} className="truncate min-w-0">
              {c.r(row)}
            </div>
          ))}
        </div>
      ))}
      <div className="flex-1 flex items-center justify-between text-[16px] text-ink-sub">
        <span>
          共 {rows.length} 条示例明细，每页 {PAGE_SIZE} 条
        </span>
        <div className="flex items-center gap-3">
          <button
            disabled={cur === 0}
            onClick={() => onPage(cur - 1)}
            className="h-7 px-3 rounded border border-brand-border enabled:text-ink enabled:cursor-pointer disabled:opacity-50"
          >
            上一页
          </button>
          <span className="tabular-nums">
            第 {cur + 1} / {pages} 页
          </span>
          <button
            disabled={cur >= pages - 1}
            onClick={() => onPage(cur + 1)}
            className="h-7 px-3 rounded border border-brand-border enabled:text-ink enabled:cursor-pointer disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, kind, value, suffix, note }: { label: string; kind: string; value: string; suffix?: string; note: string }) {
  return (
    <div className="bg-brand-panel border border-brand-border rounded-lg px-5 py-2 flex flex-col justify-between">
      <div className="flex items-center justify-between text-[18px] leading-6 text-ink-sub">
        {label}
        <span className="text-[16px] px-1 rounded border border-brand-border">{kind}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[40px] leading-[44px] font-bold tabular-nums">{value}</span>
        {suffix && <span className="text-[24px] leading-8 text-ink-sub tabular-nums">{suffix}</span>}
      </div>
      <div className="text-[16px] leading-5 text-ink-sub whitespace-nowrap">{note}</div>
    </div>
  );
}

type Drawer_ = null | { kind: 'point' | 'terminal' | 'task'; id: string };

export default function OpsPage({ onOpenEvent }: { onOpenEvent: () => void }) {
  const [tab, setTab] = useState<OpsTab>('points');
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const [windowValue, setWindowValue] = useState<string>(() => load(WINDOW_KEY, 'none'));
  const windowHours = WINDOW_OPTIONS.find((w) => w.value === windowValue)?.hours ?? null;
  const [loadState, setLoadState] = useState<'ok' | 'loading' | 'error'>('ok');

  const [pf, setPf] = useState({ name: '', type: ALL, sub: ALL, target: 'PFOS' as Target, validity: ALL, level: ALL });
  const [tf, setTf] = useState({ id: '', site: ALL, comm: ALL, maint: ALL });
  const [kf, setKf] = useState({ id: '', site: ALL, group: ALL, status: ALL });
  const [pages, setPages] = useState({ points: 0, terminals: 0, tasks: 0 });
  const [selPoint, setSelPoint] = useState<string | null>('城北入河口');
  const [selTerm, setSelTerm] = useState<string | null>('TM-001');
  const [selTask, setSelTask] = useState<string | null>('TK-20261014-001');
  const [drawer, setDrawer] = useState<Drawer_>(null);

  const [drafts, setDrafts] = useState<Task[]>(() => load(DRAFT_KEY, [] as Task[]));
  const [form, setForm] = useState<null | { site: string; target: Target; plan: string; owner: string }>(null);
  const [formErr, setFormErr] = useState('');
  const allTasks = useMemo(() => [...TASKS, ...drafts], [drafts]);

  const setPage = (p: number) => setPages((s) => ({ ...s, [tab]: p }));
  const retry = () => {
    setLoadState('loading');
    setTimeout(() => setLoadState('ok'), 600);
  };

  const pendingFor = (site: string, target: Target) =>
    allTasks.find((t) => t.site === site && t.target === target && t.status === '待审核');

  // 点位行
  const pointRows = SITES.map((s) => {
    const st = statusOf(pf.target, s.id);
    const expired = !!st.result && isExpired(st.result.sampled, windowHours, now);
    const validity = !st.result ? 'none' : expired ? 'expired' : 'valid';
    const covered = TARGETS.filter((t) => RESULTS[t][s.id]);
    return { site: s.id, type: s.type, st, expired, validity, covered, pending: pendingFor(s.id, pf.target), meta: POINT_META[s.id] };
  }).filter((r) => {
    if (pf.name && !r.site.includes(pf.name)) return false;
    if (pf.type !== ALL && r.type !== pf.type) return false;
    if (pf.sub !== ALL && r.meta.subbasin !== pf.sub) return false;
    if (pf.validity === 'pending') return !!r.pending;
    if (pf.validity !== ALL && r.validity !== pf.validity) return false;
    if (pf.level !== ALL && r.st.level !== pf.level) return false;
    return true;
  });

  const termRows = TERMINALS.filter(
    (t) =>
      (!tf.id || t.id.toLowerCase().includes(tf.id.toLowerCase())) &&
      (tf.site === ALL || (tf.site === '__none' ? t.site === null : t.site === tf.site)) &&
      (tf.comm === ALL || t.comm === tf.comm) &&
      (tf.maint === ALL || (tf.maint === UNKNOWN ? !t.maint : t.maint === tf.maint)),
  );

  const taskRows = allTasks.filter(
    (t) =>
      (!kf.id || t.id.toLowerCase().includes(kf.id.toLowerCase())) &&
      (kf.site === ALL || t.site === kf.site) &&
      (kf.group === ALL || t.target === kf.group) &&
      (kf.status === ALL || (kf.status === '逾期' ? isOverdue(t, now) : t.status === kf.status)),
  );

  const taskCounts: Record<string, number> = {};
  allTasks.forEach((t) => (taskCounts[t.site] = (taskCounts[t.site] ?? 0) + 1));

  const matchSites = new Set<string>(
    tab === 'points'
      ? pointRows.map((r) => r.site)
      : tab === 'terminals'
        ? termRows.map((t) => t.site).filter((s): s is string => !!s)
        : taskRows.map((t) => t.site),
  );

  const selectedSite =
    tab === 'points' ? selPoint : tab === 'terminals' ? (TERMINALS.find((t) => t.id === selTerm)?.site ?? null) : (allTasks.find((t) => t.id === selTask)?.site ?? null);

  const onMapSelect = (site: string) => {
    if (tab === 'points') setSelPoint(site);
    else if (tab === 'terminals') {
      const t = TERMINALS.find((x) => x.site === site);
      if (t) setSelTerm(t.id);
    } else {
      const t = allTasks.find((x) => x.site === site);
      if (t) setSelTask(t.id);
    }
  };

  const goPoint = (site: string) => {
    setTab('points');
    setSelPoint(site);
    setDrawer({ kind: 'point', id: site });
  };

  const submitForm = () => {
    if (!form) return;
    if (!form.plan || !form.owner.trim()) {
      setFormErr('请填写计划采样时间和负责人');
      return;
    }
    const n = drafts.length + 1;
    const draft: Task = {
      id: `DRAFT-${String(n).padStart(3, '0')}`,
      site: form.site,
      target: form.target,
      plan: form.plan.replace('T', ' '),
      status: '待采样',
      owner: form.owner.trim(),
      draft: true,
    };
    const next = [...drafts, draft];
    setDrafts(next);
    save(DRAFT_KEY, next);
    setSelTask(draft.id);
    setForm(null);
  };

  const clearDrafts = () => {
    setDrafts([]);
    save(DRAFT_KEY, []);
  };

  // ---------- 详情内容 ----------
  const PointDetail = ({ site, full }: { site: string; full: boolean }) => {
    const row = SITES.find((s) => s.id === site);
    if (!row) return <div className="text-[18px] text-ink-sub">请选择点位</div>;
    const meta = POINT_META[site];
    const st = statusOf(pf.target, site);
    const term = TERMINALS.find((t) => t.id === meta.terminal);
    const expired = !!st.result && isExpired(st.result.sampled, windowHours, now);
    const anyResult = TARGETS.some((t) => RESULTS[t][site]);
    const pend = pendingFor(site, pf.target);
    const evt = eventOf(pf.target, site);
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[20px] font-medium">{site}</span>
          <span className="text-[16px] text-ink-sub">{SITE_TYPE_LABEL[row.type]}</span>
        </div>
        <div>
          <KV k="子流域">{meta.subbasin}</KV>
          <KV k="遥测终端">
            {term ? (
              <>
                {term.id} <CommTag v={term.comm} />
              </>
            ) : (
              <span className="text-unknown">未关联终端</span>
            )}
          </KV>
          <KV k={`${pf.target} 结果`}>
            {st.result ? (
              <>
                {fmtValue(pf.target, st.result.value)} {TARGET_CFG[pf.target].unit}
                <LevelTag level={st.level} />
              </>
            ) : (
              <span className="text-unknown">无有效结果</span>
            )}
          </KV>
          <KV k="采样时间">
            <span className={st.result?.sampled ? '' : 'text-unknown'}>{st.result ? (st.result.sampled ?? UNKNOWN) : '—'}</span>
          </KV>
          <KV k="结果发布时间">
            <span className={st.result?.published ? '' : 'text-unknown'}>{st.result ? (st.result.published ?? UNKNOWN) : '—'}</span>
          </KV>
          <KV k="关联事件">{evt ? evt.id : <span className="text-unknown">无示例事件</span>}</KV>
          {full && (
            <KV k="目标物覆盖">
              {anyResult ? TARGETS.filter((t) => RESULTS[t][site]).join('、') : <span className="text-unknown">无</span>}
            </KV>
          )}
        </div>
        {expired && <Notice color={COLORS.alert}>结果已过期：保留原采样时间 {st.result?.sampled}，已超过 {windowHours} 小时有效时窗。</Notice>}
        {windowHours === null && st.result && <div className="text-[16px] leading-5 text-ink-sub">未配置有效时窗，不判定结果是否过期。</div>}
        {term?.comm === '离线' && anyResult && <Notice color={COLORS.danger}>终端离线，但历史实验室结果仍可查看（结果不来自终端）。</Notice>}
        {term?.comm === '在线' && !st.result && (
          <Notice color={COLORS.info}>终端在线，但 {pf.target} 暂无检测结果；终端在线不代表有新污染物结果。</Notice>
        )}
        {pend && <Notice color={COLORS.info}>新结果待审核（任务 {pend.id}），尚未发布，不计入已有汇总。</Notice>}
        {full && (
          <button onClick={() => evt && onOpenEvent()} disabled={!evt} className={`h-9 rounded border text-[18px] ${evt ? 'border-info text-info cursor-pointer' : 'border-brand-border text-ink-sub cursor-not-allowed'}`}>
            {evt ? '查看关联事件' : '无示例事件'}
          </button>
        )}
      </div>
    );
  };

  const TerminalDetail = ({ t, full }: { t: Terminal; full: boolean }) => {
    const hasResult = !!t.site && TARGETS.some((x) => RESULTS[x][t.site as string]);
    const noPfos = !!t.site && !RESULTS.PFOS[t.site];
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[20px] font-medium">{t.id}</span>
          <span className="text-[16px] text-ink-sub">遥测终端</span>
        </div>
        <div>
          <KV k="关联点位">{t.site ?? <span className="text-unknown">{UNKNOWN}</span>}</KV>
          <KV k="采集功能">{t.funcs.join('、')}</KV>
          <KV k="通讯状态">
            <CommTag v={t.comm} />
          </KV>
          <KV k="最后心跳">
            <span className={t.heartbeat ? '' : 'text-unknown'}>{t.heartbeat ?? UNKNOWN}</span>
          </KV>
          <KV k="维护状态">
            <MaintTag v={t.maint} />
          </KV>
        </div>
        {t.comm === '离线' && hasResult && <Notice color={COLORS.danger}>终端离线，但关联点位的历史实验室结果仍可查看。</Notice>}
        {t.comm === '在线' && noPfos && <Notice color={COLORS.info}>终端在线，但关联点位 PFOS 暂无检测结果。</Notice>}
        <div className="text-[16px] leading-5 text-ink-sub">终端在线只表示通讯在线，不代表 PFOS、抗生素和微塑料结果实时更新。示例终端未标注新污染物连续测定能力。</div>
        {full && (
          <>
            <div>
              <div className="text-[18px] font-medium mb-1">维护记录</div>
              {t.records.length ? (
                t.records.map((r) => (
                  <div key={r.time} className="text-[16px] leading-6">
                    <span className="text-ink-sub tabular-nums">{r.time}</span>　{r.text}
                  </div>
                ))
              ) : (
                <div className="text-[16px] text-unknown">{UNKNOWN}</div>
              )}
            </div>
            {t.site && (
              <button onClick={() => goPoint(t.site as string)} className="h-9 rounded border border-info text-info text-[18px] cursor-pointer">
                查看关联点位 {t.site}
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  const TaskDetail = ({ t, full }: { t: Task; full: boolean }) => {
    const overdue = isOverdue(t, now);
    const idx = TASK_FLOW.indexOf(t.status);
    const stepTime = (s: TaskStatus) =>
      s === '待采样' ? `计划 ${t.plan}` : s === '已采样' ? t.actual : s === '检测中' ? t.received : s === '已发布' ? t.published : undefined;
    const result = RESULTS[t.target][t.site];
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[20px] font-medium">{t.id}</span>
          {t.draft && <Tag text="本地草稿" color={COLORS.info} dashed />}
        </div>
        <div>
          <KV k="点位">{t.site}</KV>
          <KV k="目标物组">{TARGET_GROUP[t.target]}</KV>
          <KV k="当前状态">
            <Tag text={t.status} color={COLORS.info} />
            {overdue && <Tag text="逾期" color={COLORS.danger} />}
          </KV>
          <KV k="负责人">
            <span className={t.owner ? '' : 'text-unknown'}>{t.owner ?? UNKNOWN}</span>
          </KV>
          <KV k="结果审核状态">
            {t.status === '已发布' ? '已审核并发布' : t.status === '待审核' ? <span className="text-info">结果待审核</span> : <span className="text-unknown">暂无结果</span>}
          </KV>
        </div>
        {overdue && <Notice color={COLORS.danger}>任务逾期：计划采样时间 {t.plan} 已过，尚无实际采样记录。</Notice>}
        {t.draft && <div className="text-[16px] text-ink-sub">演示草稿仅存本机，不改变原有汇总快照。</div>}
        {full && (
          <>
            <div>
              <div className="text-[18px] font-medium mb-1">任务时间线</div>
              {TASK_FLOW.map((s, i) => {
                const time = stepTime(s);
                const reached = i <= idx;
                return (
                  <div key={s} className="flex gap-3 min-h-[34px]">
                    <div className="flex flex-col items-center">
                      <span className={`w-3 h-3 rounded-full mt-2 ${i === idx ? 'bg-info' : reached ? 'bg-unknown' : 'border border-unknown'}`} />
                      {i < TASK_FLOW.length - 1 && <span className="w-px flex-1 bg-brand-border" />}
                    </div>
                    <div className={reached ? '' : 'text-ink-sub'}>
                      <div className="text-[18px] leading-6">{s}</div>
                      <div className={`text-[16px] leading-5 tabular-nums ${reached && !time ? 'text-unknown' : 'text-ink-sub'}`}>
                        {reached ? (time ?? UNKNOWN) : '尚未到达'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <div className="text-[18px] font-medium mb-1">目标物与结果审核</div>
              <KV k="目标物">{t.target}</KV>
              <KV k="结果">
                {t.status === '已发布' && result ? `${fmtValue(t.target, result.value)} ${TARGET_CFG[t.target].unit}` : <span className="text-unknown">暂无已发布结果</span>}
              </KV>
              <KV k="实验室接收时间">
                <span className={t.received ? '' : 'text-unknown'}>{t.received ?? UNKNOWN}</span>
              </KV>
            </div>
          </>
        )}
      </div>
    );
  };

  const selectedTerm = TERMINALS.find((t) => t.id === selTerm);
  const selectedTask = allTasks.find((t) => t.id === selTask);

  const tabs: [OpsTab, string][] = [
    ['points', '监测点位'],
    ['terminals', '遥测终端'],
    ['tasks', '采样检测任务'],
  ];

  const pointCols: Col<(typeof pointRows)[number]>[] = [
    { h: '点位', w: '1.4fr', r: (r) => r.site },
    { h: '类型', w: '1fr', r: (r) => <span className="text-[16px]">{SITE_TYPE_LABEL[r.type]}</span> },
    {
      h: '最近采样时间',
      w: '1.4fr',
      r: (r) => (
        <span className={`text-[16px] tabular-nums ${r.st.result?.sampled ? '' : 'text-unknown'}`}>{r.st.result ? (r.st.result.sampled ?? UNKNOWN) : '—'}</span>
      ),
    },
    {
      h: '最近结果发布时间',
      w: '1.4fr',
      r: (r) => (
        <span className={`text-[16px] tabular-nums ${r.st.result?.published ? '' : 'text-unknown'}`}>{r.st.result ? (r.st.result.published ?? UNKNOWN) : '—'}</span>
      ),
    },
    { h: '目标物覆盖', w: '1.3fr', r: (r) => (r.covered.length ? r.covered.join('、') : <span className="text-unknown">无</span>) },
    {
      h: '结果状态',
      w: '2fr',
      r: (r) => (
        <span className="flex items-center gap-1">
          {r.validity === 'valid' && <Tag text="有效结果" color={COLORS.info} />}
          {r.validity === 'expired' && <Tag text="结果已过期" color={COLORS.alert} />}
          {r.validity === 'none' && <Tag text="无有效结果" color={COLORS.unknown} dashed />}
          {r.pending && <Tag text="新结果待审核" color={COLORS.info} dashed />}
        </span>
      ),
    },
    { h: '关联事件', w: '1.6fr', r: (r) => (eventOf(pf.target, r.site)?.id ?? <span className="text-unknown">无示例事件</span>) },
    {
      h: '遥测终端',
      w: '1.1fr',
      r: (r) => (r.meta.terminal ?? <span className="text-unknown">未关联终端</span>),
    },
  ];

  const termCols: Col<Terminal>[] = [
    { h: '编号', w: '1fr', r: (t) => t.id },
    { h: '关联点位', w: '1.4fr', r: (t) => t.site ?? <span className="text-unknown">{UNKNOWN}</span> },
    { h: '采集功能', w: '2fr', r: (t) => <span className="text-[16px]">{t.funcs.join('、')}</span> },
    { h: '通讯状态', w: '1fr', r: (t) => <CommTag v={t.comm} /> },
    { h: '最后心跳', w: '1.5fr', r: (t) => <span className={`text-[16px] tabular-nums ${t.heartbeat ? '' : 'text-unknown'}`}>{t.heartbeat ?? UNKNOWN}</span> },
    { h: '维护状态', w: '1fr', r: (t) => <MaintTag v={t.maint} /> },
  ];

  const taskCols: Col<Task>[] = [
    { h: '任务编号', w: '1.5fr', r: (t) => <span className="text-[16px]">{t.id}</span> },
    { h: '点位', w: '1.3fr', r: (t) => t.site },
    { h: '目标物组', w: '1.5fr', r: (t) => <span className="text-[16px]">{TARGET_GROUP[t.target]}</span> },
    { h: '计划采样时间', w: '1.4fr', r: (t) => <span className="text-[16px] tabular-nums">{t.plan}</span> },
    { h: '实际采样时间', w: '1.4fr', r: (t) => <span className={`text-[16px] tabular-nums ${t.actual ? '' : 'text-unknown'}`}>{t.actual ?? UNKNOWN}</span> },
    { h: '实验室接收时间', w: '1.4fr', r: (t) => <span className={`text-[16px] tabular-nums ${t.received ? '' : 'text-unknown'}`}>{t.received ?? UNKNOWN}</span> },
    {
      h: '状态',
      w: '1.6fr',
      r: (t) => (
        <span className="flex items-center gap-1">
          <Tag text={t.status} color={COLORS.info} />
          {isOverdue(t, now) && <Tag text="逾期" color={COLORS.danger} />}
          {t.draft && <Tag text="草稿" color={COLORS.unknown} dashed />}
        </span>
      ),
    },
    { h: '负责人', w: '1fr', r: (t) => <span className={t.owner ? '' : 'text-unknown'}>{t.owner ?? UNKNOWN}</span> },
  ];

  const filtered =
    tab === 'points'
      ? pf.name !== '' || pf.type !== ALL || pf.sub !== ALL || pf.validity !== ALL || pf.level !== ALL
      : tab === 'terminals'
        ? tf.id !== '' || tf.site !== ALL || tf.comm !== ALL || tf.maint !== ALL
        : kf.id !== '' || kf.site !== ALL || kf.group !== ALL || kf.status !== ALL;

  const clearFilters = () => {
    if (tab === 'points') setPf({ ...pf, name: '', type: ALL, sub: ALL, validity: ALL, level: ALL });
    else if (tab === 'terminals') setTf({ id: '', site: ALL, comm: ALL, maint: ALL });
    else setKf({ id: '', site: ALL, group: ALL, status: ALL });
    setPage(0);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <section className="h-[104px] shrink-0 grid grid-cols-6 gap-4">
        <Metric label="监测点位" kind="点位" value="128" suffix="个" note="示例流域全域" />
        <Metric label="本期有效结果点位" kind="点位" value="120" suffix="/128" note="无有效结果 8" />
        <Metric label="遥测终端" kind="终端" value="32" suffix="台" note="与点位是不同对象" />
        <Metric label="在线终端" kind="终端" value="31" suffix="台" note="通讯状态在线" />
        <Metric label="离线终端" kind="终端" value="1" suffix="台" note="通讯状态离线" />
        <Metric label="终端在线率" kind="终端" value="96.9" suffix="%" note="31/32 台｜分母非点位数" />
      </section>

      <div className="h-10 shrink-0 flex items-center justify-between border-b border-brand-border">
        <div className="flex h-full">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-5 h-full text-[18px] border-b-2 cursor-pointer ${tab === k ? 'text-info border-info font-medium' : 'text-ink-sub border-transparent'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-[16px] text-ink-sub">
          <span>在线率＝在线终端÷终端总数，仅反映通讯在线</span>
          <label className="flex items-center gap-2">
            结果有效时窗（演示配置）
            <select
              value={windowValue}
              onChange={(e) => {
                setWindowValue(e.target.value);
                save(WINDOW_KEY, e.target.value);
              }}
              className="h-8 px-2 rounded bg-[#0A1B2B] border border-brand-border text-[18px] text-ink cursor-pointer"
            >
              {WINDOW_OPTIONS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => setLoadState('error')} className="h-8 px-3 rounded border border-brand-border text-ink-sub cursor-pointer">
            演示：模拟加载失败
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4">
        <Panel title="筛选" extra={`匹配 ${tab === 'points' ? pointRows.length : tab === 'terminals' ? termRows.length : taskRows.length} 条`} className="w-[400px] shrink-0" bodyClassName="px-3 py-2 overflow-y-auto">
          {tab === 'points' && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <Field label="点位名称">
                <input className={fieldCls} value={pf.name} placeholder="输入名称" onChange={(e) => setPf({ ...pf, name: e.target.value })} />
              </Field>
              <Field label="类型">
                <select className={fieldCls} value={pf.type} onChange={(e) => setPf({ ...pf, type: e.target.value })}>
                  <option>{ALL}</option>
                  {SITE_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="子流域">
                <select className={fieldCls} value={pf.sub} onChange={(e) => setPf({ ...pf, sub: e.target.value })}>
                  <option>{ALL}</option>
                  {SUBBASINS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="目标物">
                <select className={fieldCls} value={pf.target} onChange={(e) => setPf({ ...pf, target: e.target.value as Target })}>
                  {TARGETS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="有效结果状态">
                <select className={fieldCls} value={pf.validity} onChange={(e) => setPf({ ...pf, validity: e.target.value })}>
                  <option value={ALL}>{ALL}</option>
                  <option value="valid">有效结果</option>
                  <option value="none">无有效结果</option>
                  <option value="expired">结果已过期</option>
                  <option value="pending">新结果待审核</option>
                </select>
              </Field>
              <Field label="关注等级">
                <select className={fieldCls} value={pf.level} onChange={(e) => setPf({ ...pf, level: e.target.value })}>
                  <option value={ALL}>{ALL}</option>
                  {(['high', 'mid', 'watch', 'none', 'unevaluated', 'noresult'] as LevelKey[]).map((k) => (
                    <option key={k} value={k}>
                      {LEVELS[k].label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="col-span-2 text-[16px] leading-5 text-ink-sub">有效结果状态和关注等级按所选目标物（{pf.target}）判断。</div>
            </div>
          )}
          {tab === 'terminals' && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <Field label="终端编号">
                <input className={fieldCls} value={tf.id} placeholder="如 TM-001" onChange={(e) => setTf({ ...tf, id: e.target.value })} />
              </Field>
              <Field label="关联点位">
                <select className={fieldCls} value={tf.site} onChange={(e) => setTf({ ...tf, site: e.target.value })}>
                  <option>{ALL}</option>
                  {SITES.map((s) => (
                    <option key={s.id}>{s.id}</option>
                  ))}
                  <option value="__none">未提供</option>
                </select>
              </Field>
              <Field label="通讯状态">
                <select className={fieldCls} value={tf.comm} onChange={(e) => setTf({ ...tf, comm: e.target.value })}>
                  {[ALL, '在线', '离线', '未知'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="维护状态">
                <select className={fieldCls} value={tf.maint} onChange={(e) => setTf({ ...tf, maint: e.target.value })}>
                  {[ALL, '正常', '校准中', '维护中', UNKNOWN].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <div className="col-span-2 text-[16px] leading-5 text-ink-sub">
                通讯状态与维护状态是两个独立维度。32 台终端中通讯状态为“未知”的为 0 台，选择该项会得到空结果。
              </div>
            </div>
          )}
          {tab === 'tasks' && (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <Field label="任务编号">
                  <input className={fieldCls} value={kf.id} placeholder="如 TK-2026" onChange={(e) => setKf({ ...kf, id: e.target.value })} />
                </Field>
                <Field label="点位">
                  <select className={fieldCls} value={kf.site} onChange={(e) => setKf({ ...kf, site: e.target.value })}>
                    <option>{ALL}</option>
                    {SITES.map((s) => (
                      <option key={s.id}>{s.id}</option>
                    ))}
                  </select>
                </Field>
                <Field label="目标物组">
                  <select className={fieldCls} value={kf.group} onChange={(e) => setKf({ ...kf, group: e.target.value })}>
                    <option>{ALL}</option>
                    {TARGETS.map((t) => (
                      <option key={t} value={t}>
                        {TARGET_GROUP[t]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="状态">
                  <select className={fieldCls} value={kf.status} onChange={(e) => setKf({ ...kf, status: e.target.value })}>
                    {[ALL, ...TASK_FLOW, '逾期'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="mt-2 rounded border border-brand-border bg-[#0A1B2B] px-3 py-1">
                <div className="flex justify-between text-[16px] h-6 items-center">
                  <span className="text-ink-sub">任务数（示例明细）</span>
                  <span>{allTasks.length}</span>
                </div>
                <div className="flex justify-between text-[16px] h-6 items-center">
                  <span className="text-ink-sub">样品数</span>
                  <span className="text-unknown">{UNKNOWN}</span>
                </div>
                <div className="flex justify-between text-[16px] h-6 items-center">
                  <span className="text-ink-sub">目标物结果数</span>
                  <span className="text-unknown">{UNKNOWN}</span>
                </div>
              </div>
              <div className="mt-1 text-[16px] leading-5 text-ink-sub">任务、样品、目标物结果是三个口径，不能互相替代。</div>
            </>
          )}
          <button onClick={clearFilters} disabled={!filtered} className="mt-2 w-full h-9 rounded border border-brand-border text-[18px] enabled:cursor-pointer enabled:text-ink disabled:text-ink-sub disabled:opacity-60">
            清除筛选
          </button>
        </Panel>

        <div className="relative flex-1 min-w-0 border border-brand-border rounded-lg overflow-hidden">
          <OpsMap
            tab={tab}
            target={pf.target}
            windowHours={windowHours}
            now={now}
            matchSites={matchSites}
            selectedSite={selectedSite}
            taskCounts={taskCounts}
            onSelectSite={onMapSelect}
          />
        </div>

        <Panel
          title={tab === 'points' ? '点位详情' : tab === 'terminals' ? '终端详情' : '任务详情'}
          extra={
            <button
              onClick={() => {
                if (tab === 'points' && selPoint) setDrawer({ kind: 'point', id: selPoint });
                if (tab === 'terminals' && selTerm) setDrawer({ kind: 'terminal', id: selTerm });
                if (tab === 'tasks' && selTask) setDrawer({ kind: 'task', id: selTask });
              }}
              className="text-info cursor-pointer"
            >
              查看详情 ›
            </button>
          }
          className="w-[400px] shrink-0"
          bodyClassName="px-3 py-2 overflow-y-auto"
        >
          {tab === 'points' && selPoint && <PointDetail site={selPoint} full={false} />}
          {tab === 'terminals' && selectedTerm && <TerminalDetail t={selectedTerm} full={false} />}
          {tab === 'tasks' && selectedTask && <TaskDetail t={selectedTask} full={false} />}
          {((tab === 'points' && !selPoint) || (tab === 'terminals' && !selectedTerm) || (tab === 'tasks' && !selectedTask)) && (
            <div className="h-full flex items-center justify-center text-[18px] text-ink-sub">请选择一行或地图上的对象</div>
          )}
        </Panel>
      </div>

      <Panel
        title={tab === 'points' ? '监测点位明细' : tab === 'terminals' ? '遥测终端明细' : '采样检测任务明细'}
        extra={
          tab === 'tasks' ? (
            <span className="flex items-center gap-3">
              {drafts.length > 0 && (
                <button onClick={clearDrafts} className="text-ink-sub cursor-pointer">
                  清除本地草稿
                </button>
              )}
              <button
                onClick={() => {
                  setFormErr('');
                  setForm({ site: SITES[0].id, target: 'PFOS', plan: '', owner: '' });
                }}
                className="text-info cursor-pointer"
              >
                新增任务（本地草稿）
              </button>
            </span>
          ) : (
            <span>仅为部分示例明细，非完整底表{tab === 'points' ? '（共 128 个点位）' : '（共 32 台终端）'}</span>
          )
        }
        className="h-[276px] shrink-0"
        bodyClassName="px-3 py-1"
      >
        {tab === 'points' && (
          <Table
            cols={pointCols}
            rows={pointRows}
            rid={(r) => r.site}
            sel={selPoint}
            onSel={setSelPoint}
            page={pages.points}
            onPage={setPage}
            state={loadState}
            onRetry={retry}
            onClear={clearFilters}
            filtered={filtered}
          />
        )}
        {tab === 'terminals' && (
          <Table
            cols={termCols}
            rows={termRows}
            rid={(r) => r.id}
            sel={selTerm}
            onSel={setSelTerm}
            page={pages.terminals}
            onPage={setPage}
            state={loadState}
            onRetry={retry}
            onClear={clearFilters}
            filtered={filtered}
          />
        )}
        {tab === 'tasks' && (
          <Table
            cols={taskCols}
            rows={taskRows}
            rid={(r) => r.id}
            sel={selTask}
            onSel={setSelTask}
            page={pages.tasks}
            onPage={setPage}
            state={loadState}
            onRetry={retry}
            onClear={clearFilters}
            filtered={filtered}
          />
        )}
      </Panel>

      <Drawer
        isOpen={drawer !== null}
        onClose={() => setDrawer(null)}
        title={drawer?.kind === 'point' ? '点位详情' : drawer?.kind === 'terminal' ? '终端详情' : '任务详情'}
      >
        {drawer?.kind === 'point' && <PointDetail site={drawer.id} full />}
        {drawer?.kind === 'terminal' && TERMINALS.find((t) => t.id === drawer.id) && <TerminalDetail t={TERMINALS.find((t) => t.id === drawer.id) as Terminal} full />}
        {drawer?.kind === 'task' && allTasks.find((t) => t.id === drawer.id) && <TaskDetail t={allTasks.find((t) => t.id === drawer.id) as Task} full />}
      </Drawer>

      <Drawer isOpen={form !== null} onClose={() => setForm(null)} title="新增采样任务（本地草稿）">
        {form && (
          <div className="flex flex-col gap-4">
            <Field label="点位">
              <select className={fieldCls} value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })}>
                {SITES.map((s) => (
                  <option key={s.id}>{s.id}</option>
                ))}
              </select>
            </Field>
            <Field label="目标物组">
              <select className={fieldCls} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value as Target })}>
                {TARGETS.map((t) => (
                  <option key={t} value={t}>
                    {TARGET_GROUP[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="计划采样时间">
              <input type="datetime-local" className={fieldCls} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} />
            </Field>
            <Field label="负责人">
              <input className={fieldCls} value={form.owner} placeholder="填写负责人" onChange={(e) => setForm({ ...form, owner: e.target.value })} />
            </Field>
            {formErr && <div className="text-[16px] text-danger">{formErr}</div>}
            <div className="rounded border border-brand-border bg-brand-panel px-4 py-3 text-[16px] leading-6 text-ink-sub">
              草稿只保存在本机浏览器，状态固定为“待采样”，不会下发，也不会改变页面上方的 128 点位、32 终端等汇总快照。
            </div>
            <div className="flex gap-3">
              <button onClick={submitForm} className="flex-1 h-10 rounded border border-info text-info text-[18px] cursor-pointer">
                保存草稿
              </button>
              <button onClick={() => setForm(null)} className="flex-1 h-10 rounded border border-brand-border text-[18px] cursor-pointer">
                取消
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
