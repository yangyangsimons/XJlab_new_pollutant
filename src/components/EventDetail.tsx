import React from 'react';
import { CHECKS, EVENT_DEMO, RESULTS, TARGET_CFG, fmtThreshold, fmtValue, statusOf } from '../data';
import { LevelTag } from './StatusTag';

function Field({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-brand-border/60 text-[18px]">
      <span className="text-ink-sub shrink-0">{k}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export function EventDetail({ onOpenFull, onOpenTrace }: { onOpenFull: () => void; onOpenTrace?: () => void }) {
  const { id, site, target, status } = EVENT_DEMO;
  const st = statusOf(target, site);
  const r = RESULTS[target][site];
  const cfg = TARGET_CFG[target];

  const timeline = [
    { t: `${r.sampled}`, label: '采样', state: 'done' },
    { t: `${r.published}`, label: '结果发布', state: 'done' },
    { t: '时间未提供', label: '结果发布后触发项目演示阈值规则', state: 'done' },
    { t: '当前', label: `事件状态：${status}`, state: 'current' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-[16px] text-ink-sub">事件编号</div>
        <div className="flex items-center justify-between">
          <span className="text-[22px] font-medium tabular-nums">{id}</span>
          <span className="px-3 h-7 inline-flex items-center rounded border border-info text-info text-[16px] bg-info/10">{status}</span>
        </div>
      </div>

      <section>
        <h3 className="text-[18px] font-medium mb-1">关联检测结果</h3>
        <Field k="点位">{site}</Field>
        <Field k="目标物与结果">
          {target} {fmtValue(target, r.value)} {cfg.unit} <LevelTag level={st.level} />
        </Field>
        <Field k="阈值比">{st.ratio?.toFixed(2)}</Field>
        <Field k="采样时间">{r.sampled}</Field>
        <Field k="结果发布时间">{r.published}</Field>
        <Field k="阈值依据">项目演示阈值 {fmtThreshold(target)}（原型规则，非法定风险或应急等级）</Field>
      </section>

      <div className="rounded border border-info/50 bg-info/10 px-4 py-3 text-[18px] leading-7">
        结果发布后触发规则，不代表此时开始排放。
      </div>

      <section>
        <h3 className="text-[18px] font-medium mb-2">核查时间线</h3>
        <ol className="flex flex-col">
          {timeline.map((s, i) => (
            <li key={s.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={`w-3 h-3 rounded-full mt-2 ${s.state === 'current' ? 'bg-info' : 'bg-unknown'}`} />
                {i < timeline.length - 1 && <span className="w-px flex-1 bg-brand-border" />}
              </div>
              <div className="pb-3">
                <div className="text-[18px] leading-7">{s.label}</div>
                <div className="text-[16px] text-ink-sub tabular-nums">{s.t}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="text-[18px] font-medium mb-2">待办任务</h3>
        <ul className="flex flex-col gap-2">
          {CHECKS.map((c) => (
            <li key={c} className="flex items-center justify-between rounded border border-brand-border bg-brand-panel px-4 py-2 text-[18px]">
              {c}
              <span className="text-[16px] text-ink-sub">待办</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="rounded border border-alert px-4 py-3 text-alert text-[18px] bg-alert/10">当前不能确认来源，尚无已确认污染源。</div>

      {onOpenTrace && (
        <button onClick={onOpenTrace} className="h-10 rounded border border-info text-info text-[18px] cursor-pointer">
          进入溯源研判（证据核查）
        </button>
      )}
      <button onClick={onOpenFull} className="h-10 rounded border border-info text-info text-[18px] cursor-pointer">
        进入事件详情页（待后续生成）
      </button>
    </div>
  );
}
