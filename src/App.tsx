import React, { useEffect, useState } from 'react'
import { ScaleContainer } from './components/ScaleContainer'
import { Panel } from './components/Panel'
import { LevelTag } from './components/StatusTag'
import { Drawer } from './components/Drawer'
import { EventDetail } from './components/EventDetail'
import { TrendPanel } from './components/TrendChart'
import {
  ALL_TYPES,
  DEFAULT_LAYERS,
  DEFAULT_VIEW,
  Layers,
  PERIOD_DEFAULT,
  View,
  WatershedMap,
} from './components/WatershedMap'
import {
  ALERTS,
  CHECKS,
  DETECTION_RATES,
  EVENT_STATUS,
  KPIS,
  LEVELS,
  TARGET_CFG,
  Target,
  Quality,
  Range,
  TARGETS,
  fmtThreshold,
  fmtValue,
  rankingOf,
  statusOf,
} from './data'
import { SITES, SiteType } from './geo'
import AnalysisPage from './components/AnalysisPage'
import TracePage from './components/TracePage'
import OpsPage from './components/OpsPage'
import logo from '@/assets/logo.png'

type Page = 'home' | 'sites' | 'analysis' | 'trace' | 'ops' | 'event'

const PAGE_TITLE: Record<Exclude<Page, 'home'>, string> = {
  sites: '点位监测',
  analysis: '目标物分析',
  trace: '溯源研判',
  ops: '监测运维',
  event: '事件详情',
}

const NAV: {
  label: string
  page?: Exclude<Page, 'event'>
  drawer?: boolean
  pending?: boolean
}[] = [
  { label: '综合态势', page: 'home' },
  { label: '点位监测', page: 'sites', pending: true },
  { label: '目标物分析', page: 'analysis' },
  { label: '溯源研判', page: 'trace' },
  { label: '监测运维', page: 'ops' },
  { label: '事件处置', drawer: true },
]

const DEFAULT_TARGET: Target = 'PFOS'
const DEFAULT_SITE = '城北入河口'

const pad = (n: number) => String(n).padStart(2, '0')
const formatNow = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function parseHash() {
  const m = window.location.hash.match(/^#\/(\w+)(?:\?(.*))?$/)
  const page =
    ((m &&
      (['sites', 'analysis', 'trace', 'ops', 'event'].includes(m[1])
        ? m[1]
        : 'home')) as Page) || 'home'
  const q = new URLSearchParams(m?.[2] ?? '')
  return {
    page,
    site: q.get('site') ?? '',
    target: q.get('target') ?? '',
    period: q.get('period') ?? '',
  }
}

function usePage() {
  const [route, setRoute] = useState(parseHash)
  useEffect(() => {
    const h = () => setRoute(parseHash())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  return route
}

export default function App() {
  const now = useNow()
  const route = usePage()

  const [target, setTarget] = useState<Target>(DEFAULT_TARGET)
  const [siteId, setSiteId] = useState(DEFAULT_SITE)
  const [period, setPeriod] = useState(PERIOD_DEFAULT)
  const [types, setTypes] = useState<SiteType[]>(ALL_TYPES)
  const [layers, setLayers] = useState<Layers>(DEFAULT_LAYERS)
  const [view, setView] = useState<View>(DEFAULT_VIEW)
  const [drawer, setDrawer] = useState<null | 'overview' | 'event'>(null)
  const [range, setRange] = useState<Range>('last7')
  const [quality, setQuality] = useState<Quality>('all')

  // 从链接进入详情页时采用携带的点位和目标物
  useEffect(() => {
    if (route.page === 'home') return
    if (route.site && SITES.some((s) => s.id === route.site))
      setSiteId(route.site)
    if ((TARGETS as string[]).includes(route.target))
      setTarget(route.target as Target)
  }, [route.page, route.site, route.target])

  const eventTotal = EVENT_STATUS.reduce((s, e) => s + e.value, 0)
  const ranking = rankingOf(target)
  const cfg = TARGET_CFG[target]

  const resetAll = () => {
    setTarget(DEFAULT_TARGET)
    setSiteId(DEFAULT_SITE)
    setPeriod(PERIOD_DEFAULT)
    setTypes(ALL_TYPES)
    setLayers(DEFAULT_LAYERS)
    setView(DEFAULT_VIEW)
  }

  const goto = (page: Exclude<Page, 'home'>) => {
    window.location.hash = `#/${page}?site=${encodeURIComponent(siteId)}&target=${encodeURIComponent(target)}&period=${period}`
  }
  const goHome = () => {
    window.location.hash = ''
  }

  const pickAlert = (site: string, t: Target) => {
    setTarget(t)
    setSiteId(site)
    if (site === '城北入河口') setDrawer('event')
  }

  const rankingTitle =
    cfg.threshold === null ? `${target}结果（未评价）` : `${target}阈值关注排序`
  const thresholdText = fmtThreshold(target)

  return (
    <ScaleContainer>
      <div className='w-full h-full p-6 flex flex-col gap-4 bg-brand-bg'>
        <header className='h-16 shrink-0 flex items-center justify-between gap-6'>
          {/* 左侧：Logo + 平台标题 */}
          <div className='flex items-center gap-3 min-w-0'>
            <img
              src={logo}
              alt=''
              className='w-55 h-30 object-contain shrink-0'
            />

            <h1 className='text-[32px] leading-10 font-bold tracking-wide'>
              湘江实验室新污染物AI智能监测研判平台
            </h1>
          </div>

          {/* 右侧：当前时间 */}
          <div className='shrink-0 whitespace-nowrap text-[18px] leading-6 text-ink-sub tabular-nums'>
            当前时间 <span className='text-ink'>{formatNow(now)}</span>
          </div>
        </header>

        <nav className='h-10 shrink-0 flex items-center justify-between border-b border-brand-border'>
          <div className='flex h-full'>
            {NAV.map((n) => {
              const active = n.page ? route.page === n.page : false
              return (
                <button
                  key={n.label}
                  onClick={() =>
                    n.drawer
                      ? setDrawer('overview')
                      : n.page === 'home'
                        ? goHome()
                        : goto(n.page!)
                  }
                  className={`px-5 h-full text-[18px] border-b-2 cursor-pointer flex items-center gap-2 ${
                    active
                      ? 'text-info border-info font-medium'
                      : 'text-ink-sub border-transparent'
                  }`}
                >
                  {n.label}
                  {n.pending && (
                    <span className='text-[16px] text-unknown'>待后续生成</span>
                  )}
                </button>
              )
            })}
          </div>
          <div className='flex gap-8 text-[18px] text-ink-sub'>
            <span>
              范围：<span className='text-ink'>示例流域全域（长沙市）</span>
            </span>
            <span>
              统计周期：
              <span className='text-ink'>2026-10-09 至 2026-10-15</span>
            </span>
          </div>
        </nav>

        {route.page === 'ops' ? (
          <OpsPage onOpenEvent={() => setDrawer('event')} />
        ) : route.page === 'trace' ? (
          <TracePage />
        ) : route.page === 'analysis' ? (
          <AnalysisPage
            target={target}
            site={siteId}
            range={range}
            quality={quality}
            onTarget={setTarget}
            onSite={setSiteId}
            onRange={setRange}
            onQuality={setQuality}
            onBack={goHome}
            onOpenEvent={() => setDrawer('event')}
          />
        ) : route.page !== 'home' ? (
          <Placeholder
            title={PAGE_TITLE[route.page]}
            site={route.site}
            target={route.target}
            period={route.period}
            onBack={goHome}
          />
        ) : (
          <>
            <section className='h-[104px] shrink-0 grid grid-cols-6 gap-4'>
              {KPIS.map((k) => (
                <div
                  key={k.label}
                  className='bg-brand-panel border border-brand-border rounded-lg px-5 py-2 flex flex-col justify-between'
                >
                  <div className='text-[18px] leading-6 text-ink-sub'>
                    {k.label}
                  </div>
                  <div className='flex items-baseline gap-1'>
                    <span className='text-[40px] leading-[44px] font-bold tabular-nums'>
                      {k.value}
                    </span>
                    {k.suffix && (
                      <span className='text-[24px] leading-8 text-ink-sub tabular-nums'>
                        {k.suffix}
                      </span>
                    )}
                  </div>
                  <div className='text-[16px] leading-5 text-ink-sub whitespace-nowrap'>
                    {k.note}
                  </div>
                </div>
              ))}
            </section>

            <main className='flex-1 min-h-0 flex gap-4'>
              <div className='w-[360px] shrink-0 flex flex-col gap-4'>
                <Panel title='重点目标物检出率' className='h-[252px]'>
                  <div className='text-[16px] leading-5 text-ink-sub mb-1'>
                    分母＝完成检测且质量有效的点位数
                  </div>
                  <div className='flex flex-col gap-[6px]'>
                    {DETECTION_RATES.map((d) => (
                      <div key={d.name}>
                        <div className='flex justify-between items-baseline leading-6'>
                          <span className='text-[18px]'>{d.name}</span>
                          <span className='text-[16px] text-ink-sub tabular-nums'>
                            {d.hit}/{d.total}　
                            <span className='text-ink text-[18px]'>
                              {d.rate.toFixed(1)}%
                            </span>
                          </span>
                        </div>
                        <div className='h-2 rounded bg-[#163650] mt-[2px]'>
                          <div
                            className='h-full rounded bg-info'
                            style={{ width: `${d.rate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel
                  title='最新告警'
                  extra='节选 4 / 8 个触发点位'
                  className='flex-1 min-h-0'
                >
                  <div className='flex flex-col gap-1'>
                    {ALERTS.map((a) => {
                      const st = statusOf(a.target, a.site)
                      const selected = a.site === siteId && a.target === target
                      return (
                        <button
                          key={a.site}
                          onClick={() => pickAlert(a.site, a.target)}
                          className={`h-[60px] px-3 py-[6px] rounded border-l-[3px] flex flex-col justify-between text-left cursor-pointer ${
                            selected ? 'bg-[#12304A]' : 'bg-[#0A1B2B]'
                          }`}
                          style={{ borderLeftColor: LEVELS[st.level].color }}
                        >
                          <div className='flex justify-between items-center leading-6'>
                            <span className='text-[18px] font-medium'>
                              {a.site}
                            </span>
                            <span className='text-[16px] text-ink-sub tabular-nums'>
                              {a.published
                                ? `发布 ${a.published}`
                                : '发布时间未提供'}
                            </span>
                          </div>
                          <div className='flex justify-between items-center leading-6'>
                            <span className='text-[18px] tabular-nums'>
                              <span className='text-[16px] text-ink-sub mr-2'>
                                {a.target}
                              </span>
                              {fmtValue(a.target, st.result!.value)}{' '}
                              <span className='text-[16px] text-ink-sub'>
                                {TARGET_CFG[a.target].unit}
                              </span>
                            </span>
                            <LevelTag level={st.level} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </Panel>

                <Panel
                  title='处置进度'
                  extra={`本期事件 ${eventTotal} 起`}
                  className='h-[132px]'
                  bodyClassName='px-3 py-2'
                >
                  <div className='flex h-2 rounded overflow-hidden gap-[2px] mb-2'>
                    {EVENT_STATUS.map((s) => (
                      <div
                        key={s.label}
                        style={{ flex: s.value, background: s.color }}
                      />
                    ))}
                  </div>
                  <div className='grid grid-cols-4'>
                    {EVENT_STATUS.map((s) => (
                      <div key={s.label} className='flex flex-col items-center'>
                        <span className='text-[28px] leading-8 font-bold tabular-nums'>
                          {s.value}
                        </span>
                        <span className='text-[16px] leading-5 text-ink-sub'>
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              <div className='flex-1 min-w-0 border border-brand-border rounded-lg overflow-hidden'>
                <WatershedMap
                  target={target}
                  onTarget={setTarget}
                  period={period}
                  onPeriod={setPeriod}
                  types={types}
                  onTypes={setTypes}
                  layers={layers}
                  onLayers={setLayers}
                  view={view}
                  onView={setView}
                  siteId={siteId}
                  onSite={setSiteId}
                  onReset={resetAll}
                  onOpenEvent={() => setDrawer('event')}
                  onOpenAnalysis={() => goto('analysis')}
                />
              </div>

              <div className='w-[360px] shrink-0 flex flex-col gap-4'>
                <TrendPanel
                  target={target}
                  site={siteId}
                  onTarget={setTarget}
                />

                <Panel title={rankingTitle} className='flex-1 min-h-0'>
                  <div className='text-[16px] leading-5 text-ink-sub mb-1 whitespace-nowrap'>
                    浓度单位 {cfg.unit}｜
                    {thresholdText
                      ? `项目演示阈值 ${thresholdText}`
                      : '未配置阈值，不评价'}
                  </div>
                  <div className='grid grid-cols-[1fr_52px_56px_68px] gap-x-2 text-[16px] leading-5 text-ink-sub pb-1 border-b border-brand-border'>
                    <span>点位</span>
                    <span className='text-right'>浓度</span>
                    <span className='text-right'>阈值比</span>
                    <span className='text-right'>等级</span>
                  </div>
                  {ranking.map((r) => (
                    <button
                      key={r.site}
                      onClick={() => setSiteId(r.site)}
                      className={`w-full h-9 grid grid-cols-[1fr_52px_56px_68px] gap-x-2 items-center border-b border-brand-border/60 text-left cursor-pointer ${
                        r.site === siteId ? 'bg-[#12304A]' : ''
                      }`}
                    >
                      <span className='text-[18px] truncate'>{r.site}</span>
                      <span className='text-[18px] text-right tabular-nums'>
                        {fmtValue(target, r.value)}
                      </span>
                      <span
                        className='text-[18px] text-right tabular-nums font-medium'
                        style={{
                          color:
                            r.ratio === null
                              ? undefined
                              : LEVELS[r.level].color,
                        }}
                      >
                        {r.ratio === null ? '—' : r.ratio.toFixed(2)}
                      </span>
                      <span className='flex justify-end'>
                        <LevelTag level={r.level} />
                      </span>
                    </button>
                  ))}
                  <div className='h-9 flex items-center text-[16px] text-ink-sub'>
                    {ranking.length < 5 ? '其余展示点位：无有效结果' : ''}
                  </div>
                </Panel>

                <Panel
                  title='核查提示'
                  className='h-[184px]'
                  bodyClassName='px-3 py-2'
                >
                  <div className='h-7 px-3 flex items-center rounded border border-alert text-alert text-[18px] font-medium bg-alert/10'>
                    当前不能确认来源
                  </div>
                  <ul className='mt-1 flex flex-col text-[18px] leading-7'>
                    {CHECKS.map((t, i) => (
                      <li key={t} className='flex items-center gap-3'>
                        <span className='w-6 h-6 rounded-full border border-info text-info text-[16px] leading-none flex items-center justify-center'>
                          {i + 1}
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>
            </main>
          </>
        )}
      </div>

      <Drawer
        isOpen={drawer !== null}
        onClose={() => setDrawer(null)}
        title={drawer === 'event' ? '事件详情' : '事件处置'}
      >
        {drawer === 'event' ? (
          <EventDetail
            onOpenTrace={() => {
              setDrawer(null)
              goto('trace')
            }}
            onOpenFull={() => {
              setDrawer(null)
              goto('event')
            }}
          />
        ) : (
          <>
            <div className='text-[18px] text-ink-sub mb-4'>
              本期事件 {eventTotal} 起，未闭环 17 起
            </div>
            <div className='flex flex-col gap-2'>
              {EVENT_STATUS.map((s) => (
                <div
                  key={s.label}
                  className='flex justify-between items-center bg-brand-panel border border-brand-border rounded-lg px-4 py-3'
                >
                  <span className='text-[18px]'>{s.label}</span>
                  <span className='text-[28px] font-bold tabular-nums'>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setSiteId('城北入河口')
                setTarget('PFOS')
                setDrawer('event')
              }}
              className='mt-4 w-full h-10 rounded border border-info text-info text-[18px] cursor-pointer'
            >
              查看示例事件 DEMO-NP-20261015-032
            </button>
            <div className='mt-2 text-[16px] text-ink-sub'>
              事件列表与处置操作页待后续生成。
            </div>
          </>
        )}
      </Drawer>
    </ScaleContainer>
  )
}

function Placeholder({
  title,
  site,
  target,
  period,
  onBack,
}: {
  title: string
  site: string
  target: string
  period: string
  onBack: () => void
}) {
  return (
    <div className='flex-1 min-h-0 flex items-center justify-center'>
      <div className='w-[640px] bg-brand-panel border border-brand-border rounded-lg p-8'>
        <h2 className='text-[28px] font-bold'>{title}</h2>
        <div className='mt-1 text-[18px] text-alert'>
          待后续生成：此页面尚未实现。
        </div>
        <div className='mt-6 text-[16px] text-ink-sub'>
          从综合态势携带的上下文
        </div>
        <div className='mt-2 flex flex-col'>
          {[
            ['当前点位', site || '未携带'],
            ['当前目标物', target || '未携带'],
            [
              '统计周期',
              period === PERIOD_DEFAULT
                ? '2026-10-09 至 2026-10-15'
                : period || '未携带',
            ],
          ].map(([k, v]) => (
            <div
              key={k}
              className='flex justify-between py-2 border-b border-brand-border/60 text-[18px]'
            >
              <span className='text-ink-sub'>{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onBack}
          className='mt-6 h-10 px-6 rounded border border-info text-info text-[18px] cursor-pointer'
        >
          返回综合态势
        </button>
      </div>
    </div>
  )
}
