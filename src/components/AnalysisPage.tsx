import React, { useEffect, useState } from 'react';
import { Panel } from './Panel';
import { LevelTag } from './StatusTag';
import { Drawer } from './Drawer';
import { SpatialMap } from './SpatialMap';
import {
  CHECKS,
  COLORS,
  DETECTION_RATES,
  LEVELS,
  Quality,
  RULE_VERSION,
  Range,
  TARGETS,
  TARGET_CFG,
  TARGET_META,
  TREND,
  Target,
  eventOf,
  fmtThreshold,
  fmtValue,
  levelOf,
  statusWithQuality,
} from '../data';
import { SITES } from '../geo';

interface Props {
  target: Target;
  site: string;
  range: Range;
  quality: Quality;
  onTarget: (t: Target) => void;
  onSite: (s: string) => void;
  onRange: (r: Range) => void;
  onQuality: (q: Quality) => void;
  onBack: () => void;
  onOpenEvent: () => void;
}

const selectCls = 'h-8 px-2 rounded bg-[#0A1B2B] border border-brand-border text-[18px] text-ink cursor-pointer';
const PAGE_SIZE = 4;
const UNKNOWN = '未提供';

function Field({ k, v }: { k: string; v: string }) {
  const unknown = v === UNKNOWN;
  return (
    <div className="flex justify-between gap-3 h-6 items-center text-[16px] leading-6">
      <span className="text-ink-sub shrink-0">{k}</span>
      <span className={`tabular-nums text-right ${unknown ? 'text-unknown' : 'text-ink'}`}>{v}</span>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 first:pl-0 flex flex-col justify-center min-w-0">
      <div className="text-[16px] leading-5 text-ink-sub whitespace-nowrap">{label}</div>
      <div className="leading-10 whitespace-nowrap">{children}</div>
    </div>
  );
}

function Big({ children }: { children: React.ReactNode }) {
  return <span className="text-[36px] font-bold tabular-nums">{children}</span>;
}
function Unit({ children }: { children: React.ReactNode }) {
  return <span className="text-[18px] text-ink-sub ml-1">{children}</span>;
}

function Group({ title, note, cols, children }: { title: string; note: string; cols: number; children: React.ReactNode }) {
  return (
    <div className="h-[104px] bg-brand-panel border border-brand-border rounded-lg px-4 py-2 flex flex-col overflow-hidden">
      <div className="h-6 flex items-center justify-between text-[16px]">
        <span className="text-info font-medium">{title}</span>
        <span className="text-ink-sub">{note}</span>
      </div>
      <div className="flex-1 grid divide-x divide-brand-border" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {children}
      </div>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

function Trend({ target, site, range, quality }: { target: Target; site: string; range: Range; quality: Quality }) {
  const cfg = TARGET_CFG[target];
  const raw = TREND[`${site}|${target}`];
  const keep = raw ? raw.dates.map((d) => range === 'last7' || Number(d) >= 9) : [];
  const series =
    raw && quality !== 'pending'
      ? {
          dates: raw.dates.filter((_, i) => keep[i]),
          values: (raw.values as (number | null | 'ND')[]).filter((_, i) => keep[i]),
        }
      : null;
  const key = `${site}|${target}|${range}`;
  const [picked, setPicked] = useState<{ key: string; i: number } | null>(null);

  if (!series || series.values.length === 0) {
    return (
      <div className="h-full rounded border border-dashed border-brand-border flex flex-col items-center justify-center text-center">
        <div className="text-[18px]">{quality === 'pending' ? '无符合质量状态的结果' : '历史数据待补充'}</div>
        <div className="text-[16px] leading-6 text-ink-sub">
          {site}｜{target}
          {cfg.threshold === null ? '｜未配置阈值，未评价' : ''}
        </div>
        {quality !== 'pending' && <div className="text-[16px] leading-6 text-ink-sub">示例仅配置了城北入河口 PFOS 的最近 7 次采样</div>}
      </div>
    );
  }

  const n = series.values.length;
  const lastIdx = n - 1;
  const active = picked && picked.key === key && picked.i < n ? picked.i : lastIdx;
  const W = 558;
  const H = 326;
  const L = 52;
  const R = 12;
  const T = 28;
  const B = 28;
  const plotW = W - L - R;
  const plotH = H - T - B;
  const max = cfg.ticks[cfg.ticks.length - 1];
  const y = (v: number) => T + plotH - (v / max) * plotH;
  const x = (i: number) => L + ((i + 0.5) * plotW) / n;

  // 缺测或 ND 处断线，不转成 0
  const segments: string[] = [];
  let cur: string[] = [];
  series.values.forEach((v, i) => {
    if (typeof v === 'number') cur.push(`${x(i)},${y(v)}`);
    else {
      if (cur.length > 1) segments.push(cur.join(' '));
      cur = [];
    }
  });
  if (cur.length > 1) segments.push(cur.join(' '));

  const av = series.values[active];
  const prev = active > 0 ? series.values[active - 1] : undefined;
  const change =
    typeof av === 'number' && typeof prev === 'number' && prev > 0
      ? `${av >= prev ? '+' : ''}${(((av - prev) / prev) * 100).toFixed(1)}%`
      : '—';
  const ratio = typeof av === 'number' && cfg.threshold ? av / cfg.threshold : null;
  const dateLabel = (d: string) => `10-${pad(Number(d))}`;

  return (
    <div className="flex flex-col h-full">
      <div className="h-6 shrink-0 flex items-center gap-4 text-[16px] leading-6 whitespace-nowrap tabular-nums">
        <span className="text-ink-sub">{dateLabel(series.dates[active])}</span>
        <span>{typeof av === 'number' ? `${fmtValue(target, av)} ${cfg.unit}` : av === 'ND' ? 'ND' : '缺测'}</span>
        <span>
          <span className="text-ink-sub">阈值比</span> {ratio === null ? '—' : ratio.toFixed(2)}
        </span>
        <span>
          <span className="text-ink-sub">变化率</span> {change}
        </span>
      </div>
      <svg width={W} height={H} className="shrink-0">
        <text x={0} y={14} fontSize={16} fill={COLORS.unknown}>
          {cfg.unit}
        </text>
        {cfg.ticks.map((tk) => (
          <g key={tk}>
            <line x1={L} x2={W - R} y1={y(tk)} y2={y(tk)} stroke="#24465F" strokeWidth={1} />
            <text x={L - 8} y={y(tk) + 5} textAnchor="end" fontSize={16} fill={COLORS.unknown}>
              {tk}
            </text>
          </g>
        ))}
        {series.dates.map((d, i) => (
          <text key={d} x={x(i)} y={H - 6} textAnchor="middle" fontSize={16} fill={COLORS.unknown}>
            {dateLabel(d)}
          </text>
        ))}
        {cfg.threshold !== null && (
          <>
            <line x1={L} x2={W - R} y1={y(cfg.threshold)} y2={y(cfg.threshold)} stroke={COLORS.warn} strokeWidth={1.5} strokeDasharray="6 4" />
            <text x={W - R} y={y(cfg.threshold) + 20} textAnchor="end" fontSize={16} fill={COLORS.warn}>
              项目演示阈值{fmtThreshold(target)}
            </text>
          </>
        )}
        {segments.map((p) => (
          <polyline key={p} points={p} fill="none" stroke="#7FB5D6" strokeWidth={1.5} opacity={0.7} />
        ))}
        {series.values.map((v, i) => (
          <g key={i} className="cursor-pointer" onClick={() => setPicked({ key, i })}>
            <rect x={x(i) - plotW / n / 2} y={T} width={plotW / n} height={plotH} fill="transparent" />
            {typeof v === 'number' ? (
              <>
                {i === active && <circle cx={x(i)} cy={y(v)} r={11} fill="none" stroke="#EAF3FA" strokeWidth={1.5} />}
                <circle
                  cx={x(i)}
                  cy={y(v)}
                  r={6}
                  fill={LEVELS[cfg.threshold ? levelOf(v / cfg.threshold) : 'unevaluated'].color}
                  stroke="#0D2235"
                  strokeWidth={2}
                />
                <text x={x(i)} y={y(v) - 14} textAnchor="middle" fontSize={16} fill="#EAF3FA">
                  {fmtValue(target, v)}
                </text>
              </>
            ) : (
              <text x={x(i)} y={y(0) - 8} textAnchor="middle" fontSize={16} fill={COLORS.unknown}>
                {v === 'ND' ? 'ND' : '缺测'}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function AnalysisPage(props: Props) {
  const { target, site, range, quality } = props;
  const cfg = TARGET_CFG[target];
  const meta = TARGET_META[target];
  const st = statusWithQuality(target, site, quality);
  const result = st.result;
  const evt = eventOf(target, site);
  const stat = DETECTION_RATES.find((d) => d.name === target);
  const [tablePage, setTablePage] = useState(0);
  const [metaSite, setMetaSite] = useState<string | null>(null);

  useEffect(() => setTablePage(0), [target, quality]);

  const rows =
    quality === 'pending'
      ? []
      : SITES.map((s) => ({ site: s.id, ...statusWithQuality(target, s.id, quality) })).sort(
          (a, b) => (b.result?.value ?? -1) - (a.result?.value ?? -1) || (a.result ? -1 : 1),
        );
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(tablePage, pages - 1);
  const shown = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const metaRow = metaSite ? statusWithQuality(target, metaSite, quality) : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="h-12 shrink-0 bg-brand-panel border border-brand-border rounded-lg px-3 flex items-center gap-5">
        <button onClick={props.onBack} className="h-8 px-3 rounded border border-info text-info text-[18px] cursor-pointer">
          ‹ 返回综合态势
        </button>
        <label className="flex items-center gap-2 text-[16px] text-ink-sub">
          点位
          <select className={selectCls} value={site} onChange={(e) => props.onSite(e.target.value)}>
            {SITES.map((s) => (
              <option key={s.id}>{s.id}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[16px] text-ink-sub">
          目标物
          <select className={selectCls} value={target} onChange={(e) => props.onTarget(e.target.value as Target)}>
            {TARGETS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[16px] text-ink-sub">
          时间范围
          <select className={selectCls} value={range} onChange={(e) => props.onRange(e.target.value as Range)}>
            <option value="last7">最近 7 次采样（10-08 至 10-14）</option>
            <option value="period">本期统计周期（10-09 至 10-15）</option>
            <option disabled>自定义（待后续生成）</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-[16px] text-ink-sub">
          质量状态
          <select className={selectCls} value={quality} onChange={(e) => props.onQuality(e.target.value as Quality)}>
            <option value="all">全部</option>
            <option value="reviewed">已审核</option>
            <option value="pending">待审核（示例无数据）</option>
          </select>
        </label>
      </div>

      <div className="h-[104px] shrink-0 grid grid-cols-[2fr_1fr] gap-4">
        <Group title={`当前点位｜${site}`} note={`${target} 最新有效结果`} cols={4}>
          <Cell label="最新有效结果">
            {result ? (
              <>
                <Big>{fmtValue(target, result.value)}</Big>
                <Unit>{cfg.unit}</Unit>
              </>
            ) : (
              <span className="text-[24px] text-unknown">无有效结果</span>
            )}
          </Cell>
          <Cell label="项目演示阈值">
            {cfg.threshold === null ? (
              <span className="text-[24px] text-unknown">未配置</span>
            ) : (
              <>
                <Big>{cfg.threshold.toFixed(target === 'PFOS' ? 0 : 2)}</Big>
                <Unit>{cfg.unit}</Unit>
              </>
            )}
          </Cell>
          <Cell label="阈值比">
            <Big>{st.ratio === null ? '—' : st.ratio.toFixed(2)}</Big>
          </Cell>
          <Cell label="关注状态">
            {result ? (
              <span className="text-[32px] font-bold" style={{ color: LEVELS[st.level].color }}>
                {LEVELS[st.level].label}
              </span>
            ) : (
              <span className="text-[24px] text-unknown">—</span>
            )}
          </Cell>
        </Group>
        <Group title={`全流域统计｜${target}`} note="本期，不随点位变化" cols={2}>
          <Cell label={`${target}检测覆盖`}>
            {stat ? (
              <>
                <Big>{stat.total}</Big>
                <Unit>个点位</Unit>
              </>
            ) : (
              <span className="text-[24px] text-unknown">未提供</span>
            )}
          </Cell>
          <Cell label="检出点位">
            {stat ? (
              <>
                <Big>{stat.hit}</Big>
                <Unit>个　{stat.rate.toFixed(1)}%</Unit>
              </>
            ) : (
              <span className="text-[24px] text-unknown">未提供</span>
            )}
          </Cell>
        </Group>
      </div>

      <div className="flex-1 min-h-0 flex gap-4">
        <Panel title="评价依据" className="w-[420px] shrink-0" bodyClassName="px-3 py-2">
          <div className="text-[18px] leading-6">
            <span className="text-[16px] text-ink-sub">目标物 </span>
            {meta.name}
          </div>
          <div className="text-[18px] leading-6">
            <span className="text-[16px] text-ink-sub">所属组 </span>
            <span className={meta.group === UNKNOWN ? 'text-unknown' : ''}>{meta.group}</span>
          </div>
          <div className="text-[18px] leading-6">
            <span className="text-[16px] text-ink-sub">统计对象 </span>
            <span className={meta.scope === UNKNOWN ? 'text-unknown' : ''}>{meta.scope}</span>
          </div>
          <div className="text-[16px] leading-5 text-ink-sub mt-1">
            {target === 'PFOS'
              ? 'PFOS 是 PFAS 目标物组中的单一目标物，此处结果不代表 PFAS 总浓度。'
              : target === '环丙沙星'
                ? '按单一目标物统计；所属组未提供。'
                : '未配置阈值，结果不评价，阈值比为“—”。'}
          </div>
          <div className="mt-2 pt-2 border-t border-brand-border text-[18px] leading-6">
            <span className="text-[16px] text-ink-sub">评价依据 </span>
            {cfg.threshold === null ? '未配置阈值，不评价' : `项目演示阈值 ${fmtThreshold(target)}`}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[18px] leading-7">
              <span className="text-[16px] text-ink-sub">规则版本 </span>
              {RULE_VERSION}
            </span>
            <span className="px-2 h-7 inline-flex items-center rounded border border-alert text-alert text-[16px] bg-alert/10">
              不用于合规或健康判断
            </span>
          </div>
          <ul className="mt-2 pt-2 border-t border-brand-border text-[16px] leading-5 text-ink-sub flex flex-col gap-1">
            <li>
              <span className="text-ink">阈值比</span>　R＝浓度÷项目演示阈值；≤1 未触发，1–1.5 关注，1.5–2 中关注，&gt;2 高关注。
            </li>
            <li>
              <span className="text-ink">ND</span>　低于检出限，不按 0 计算，趋势中不画成 0。
            </li>
            <li>
              <span className="text-ink">缺测</span>　无有效结果，不补 0、不插值，趋势线断开。
            </li>
            <li>
              <span className="text-ink">点位去重</span>　同一点位多次命中只计 1 个点位。
            </li>
          </ul>
        </Panel>

        <div className="flex-1 min-w-0 flex gap-4">
          <Panel title="空间分布" extra="仅显示点位实测状态" className="w-[440px] shrink-0" bodyClassName="p-0">
            <SpatialMap target={target} quality={quality} siteId={site} onSite={props.onSite} />
          </Panel>
          <Panel
            title={`${target} 历史趋势`}
            extra={TREND[`${site}|${target}`] && quality !== 'pending' ? (range === 'last7' ? '最近7次采样' : '本期采样') : undefined}
            className="flex-1 min-w-0"
            bodyClassName="px-3 py-2"
          >
            <Trend target={target} site={site} range={range} quality={quality} />
          </Panel>
        </div>

        <div className="w-[380px] shrink-0 flex flex-col gap-4">
          <Panel
            title="最新结果质量"
            className="h-[236px]"
            bodyClassName="px-3 py-2"
            extra={
              <button onClick={() => setMetaSite(site)} className="text-info cursor-pointer">
                报告元信息 ›
              </button>
            }
          >
            {result ? (
              <>
                <Field k="数据来源" v="实验室检测" />
                <Field k="采样时间" v={result.sampled ?? UNKNOWN} />
                <Field k="结果发布时间" v={result.published ?? UNKNOWN} />
                <Field k="审核状态" v="已审核" />
                <Field k="检测方法" v={UNKNOWN} />
                <Field k="检出限" v={UNKNOWN} />
                <Field k="报告编号" v={UNKNOWN} />
              </>
            ) : (
              <div className="h-full rounded border border-dashed border-brand-border flex flex-col items-center justify-center text-center">
                <div className="text-[18px]">无有效结果</div>
                <div className="text-[16px] text-ink-sub">{site}｜{target} 暂无质量信息</div>
              </div>
            )}
          </Panel>
          <Panel title="关联线索" className="h-[168px]" bodyClassName="px-3 py-2">
            <div className="flex items-center justify-between h-6 text-[16px]">
              <span className="text-ink-sub">关联事件</span>
              {evt ? (
                <button onClick={props.onOpenEvent} className="text-info tabular-nums cursor-pointer">
                  {evt.id}　{evt.status} ›
                </button>
              ) : (
                <span className="text-unknown">无示例事件</span>
              )}
            </div>
            <div className="flex items-center justify-between h-6 text-[16px]">
              <span className="text-ink-sub">核查任务</span>
              <span className={evt ? '' : 'text-unknown'}>{evt ? `${CHECKS.length} 项待办` : '无'}</span>
            </div>
            {evt && <div className="text-[16px] leading-5 text-ink-sub">{CHECKS.join('、')}</div>}
            <div className="flex items-center justify-between h-6 text-[16px] mt-1">
              <span className="text-ink-sub">来源</span>
              <span className="text-alert">暂无已确认来源</span>
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        title="关联点位明细"
        extra="仅为部分示例明细，非 120 个点位完整底表"
        className="h-[244px] shrink-0"
        bodyClassName="px-3 py-1 flex flex-col"
      >
        {shown.length === 0 ? (
          <div className="flex-1 rounded border border-dashed border-brand-border flex items-center justify-center text-[18px] text-ink-sub">
            无符合条件的示例明细
          </div>
        ) : (
          <>
            <div className={`${TABLE_COLS} h-7 text-[16px] text-ink-sub border-b border-brand-border`}>
              {['点位', '采样时间', '检测值', '单位', '阈值比', '关注状态', '质量状态', '关联事件', '详情'].map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
            {shown.map((r) => {
              const e = eventOf(target, r.site);
              return (
                <div
                  key={r.site}
                  onClick={() => props.onSite(r.site)}
                  className={`${TABLE_COLS} h-8 text-[18px] border-b border-brand-border/60 cursor-pointer ${
                    r.site === site ? 'bg-[#12304A]' : ''
                  }`}
                >
                  <span className="truncate">{r.site}</span>
                  <span className={`tabular-nums text-[16px] ${r.result?.sampled ? '' : 'text-unknown'}`}>
                    {r.result ? (r.result.sampled ?? UNKNOWN) : '—'}
                  </span>
                  <span className="tabular-nums">{r.result ? fmtValue(target, r.result.value) : '无有效结果'}</span>
                  <span className="text-[16px] text-ink-sub">{cfg.unit}</span>
                  <span className="tabular-nums">{r.ratio === null ? '—' : r.ratio.toFixed(2)}</span>
                  <span>
                    <LevelTag level={r.level} />
                  </span>
                  <span className="text-[16px]">{r.result ? '已审核' : '—'}</span>
                  <span className={`text-[16px] tabular-nums ${e ? '' : 'text-unknown'}`}>{e ? e.id : '无示例事件'}</span>
                  <span>
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        props.onSite(r.site);
                        setMetaSite(r.site);
                      }}
                      className="text-info text-[16px] cursor-pointer"
                    >
                      元信息 ›
                    </button>
                  </span>
                </div>
              );
            })}
            <div className="flex-1 flex items-center justify-between text-[16px] text-ink-sub">
              <span>
                共 {rows.length} 条示例明细，每页 {PAGE_SIZE} 条
              </span>
              <div className="flex items-center gap-3">
                <button
                  disabled={page === 0}
                  onClick={() => setTablePage(page - 1)}
                  className="h-7 px-3 rounded border border-brand-border enabled:text-ink enabled:cursor-pointer disabled:opacity-50"
                >
                  上一页
                </button>
                <span className="tabular-nums">
                  第 {page + 1} / {pages} 页
                </span>
                <button
                  disabled={page >= pages - 1}
                  onClick={() => setTablePage(page + 1)}
                  className="h-7 px-3 rounded border border-brand-border enabled:text-ink enabled:cursor-pointer disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>

      <Drawer isOpen={metaSite !== null} onClose={() => setMetaSite(null)} title="报告元信息">
        {metaSite && metaRow && (
          <div className="flex flex-col gap-5">
            <div>
              <div className="text-[16px] text-ink-sub">点位｜目标物</div>
              <div className="text-[22px] font-medium">
                {metaSite}｜{target}
              </div>
            </div>
            {metaRow.result ? (
              <section>
                <Field k="数据来源" v="实验室检测" />
                <Field k="采样时间" v={metaRow.result.sampled ?? UNKNOWN} />
                <Field k="结果发布时间" v={metaRow.result.published ?? UNKNOWN} />
                <Field k="审核状态" v="已审核" />
                <Field k="检测方法" v={UNKNOWN} />
                <Field k="检出限" v={UNKNOWN} />
                <Field k="报告编号" v={UNKNOWN} />
              </section>
            ) : (
              <div className="rounded border border-dashed border-unknown px-4 py-3 text-[18px]">
                该点位本期无有效 {target} 结果，没有可展示的元信息。
              </div>
            )}
            <div className="rounded border border-brand-border bg-brand-panel px-4 py-3">
              <div className="text-[18px] font-medium">原始报告</div>
              <div className="text-[18px] text-unknown mt-1">未接入原始报告</div>
              <div className="text-[16px] text-ink-sub mt-1">当前没有真实文件可预览或下载；未提供的字段不会自动补齐。</div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

const TABLE_COLS = 'grid grid-cols-[1.4fr_1.4fr_1fr_0.6fr_0.7fr_1fr_0.8fr_1.8fr_0.8fr] gap-x-3 items-center';
