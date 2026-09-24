import { useMemo, useState } from 'react'
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  PieChart as PieIcon,
  Sparkles,
  Tags,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useStore } from '@/lib/storage'
import { resolveThemeVars } from '@/lib/theme'
import { levelMeta } from '@/lib/format'
import type { Entity, StatusRecord } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

function startOfWeek(d: Date): Date {
  const diff = (d.getDay() + 6) % 7
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff)
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

// 一个周期内的所有刻度：日度=这一周七天，月度=当月按周划分（每周均值），年度=当年十二个月
function buildPeriod(mode: PeriodMode, anchor: Date) {
  const slots: { key: string; label: string; start: Date; end: Date }[] = []
  if (mode === 'daily') {
    const start = startOfWeek(anchor)
    for (let i = 0; i < 7; i++) {
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      slots.push({
        key: fmtDate(s),
        label: `${pad2(s.getMonth() + 1)}-${pad2(s.getDate())}`,
        start: startOfDay(s),
        end: endOfDay(s),
      })
    }
    return {
      slots,
      label: `${fmtDate(start)} ~ ${fmtDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6))}`,
      start: startOfDay(start),
      end: endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)),
    }
  }
  if (mode === 'monthly') {
    const y = anchor.getFullYear()
    const m = anchor.getMonth()
    const lastDay = new Date(y, m + 1, 0).getDate()
    const monthEnd = new Date(y, m, lastDay)
    let cursor: Date = new Date(y, m, 1)
    while (cursor.getTime() <= monthEnd.getTime()) {
      // 以周一为界切分，跨越月末的一周按月末截断
      const offset = (cursor.getDay() + 6) % 7
      const weekEndRaw = new Date(y, m, cursor.getDate() + (6 - offset))
      const weekEnd = weekEndRaw.getTime() > monthEnd.getTime() ? monthEnd : weekEndRaw
      slots.push({
        key: fmtDate(cursor),
        label: `${cursor.getDate()}~${weekEnd.getDate()}`,
        start: startOfDay(cursor),
        end: endOfDay(weekEnd),
      })
      cursor = new Date(y, m, weekEnd.getDate() + 1)
    }
    return {
      slots,
      label: `${y} 年 ${m + 1} 月`,
      start: startOfDay(new Date(y, m, 1)),
      end: endOfDay(monthEnd),
    }
  }
  const y = anchor.getFullYear()
  for (let i = 0; i < 12; i++) {
    const s = new Date(y, i, 1)
    const e = new Date(y, i + 1, 0)
    slots.push({
      key: `${y}-${pad2(i + 1)}`,
      label: `${i + 1} 月`,
      start: startOfDay(s),
      end: endOfDay(e),
    })
  }
  return {
    slots,
    label: `${y} 年`,
    start: startOfDay(new Date(y, 0, 1)),
    end: endOfDay(new Date(y, 11, 31)),
  }
}

function shiftAnchor(mode: PeriodMode, anchor: Date, step: number): Date {
  if (mode === 'daily') {
    return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + step * 7)
  }
  if (mode === 'monthly') {
    return new Date(anchor.getFullYear(), anchor.getMonth() + step, 1)
  }
  return new Date(anchor.getFullYear() + step, anchor.getMonth(), 1)
}

type PeriodMode = 'daily' | 'monthly' | 'yearly'

const TREND_TABS: { key: PeriodMode; label: string }[] = [
  { key: 'daily', label: '日度' },
  { key: 'monthly', label: '月度' },
  { key: 'yearly', label: '年度' },
]

type PieMode = 'total' | 'strong' | 'weak'

const PIE_TABS: { key: PieMode; label: string }[] = [
  { key: 'total', label: '总频率' },
  { key: 'strong', label: '强状态关联' },
  { key: 'weak', label: '弱状态关联' },
]

// 按强度筛选聚合标签出现次数，支持影响因素与心情标签复用
function aggregateTags(
  records: StatusRecord[],
  mode: PieMode,
  pick: (r: StatusRecord) => string[]
) {
  const counts = new Map<string, number>()
  for (const r of records) {
    if (mode === 'strong' && r.level !== '强') continue
    if (mode === 'weak' && r.level !== '弱' && r.level !== '断连') continue
    for (const tag of pick(r)) {
      if (!tag) continue
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function Analysis({ entity }: { entity: Entity }) {
  const { statusRecords, divinationRecords, settings } = useStore()
  const [trendMode, setTrendMode] = useState<PeriodMode>('daily')
  const [anchor, setAnchor] = useState<Date>(() => new Date())
  const [showDivination, setShowDivination] = useState(true)
  const [pieMode, setPieMode] = useState<PieMode>('total')
  const [moodMode, setMoodMode] = useState<PieMode>('total')
  const [sensationMode, setSensationMode] = useState<PieMode>('total')
  const [perceptionMode, setPerceptionMode] = useState<PieMode>('total')

  const tv = useMemo(() => resolveThemeVars(settings), [settings])
  const chartColors = [
    tv['--chart-1'],
    tv['--chart-2'],
    tv['--chart-3'],
    tv['--chart-4'],
    tv['--chart-5'],
    tv['--chart-1'],
  ]
  const tooltipStyle = {
    background: tv['--popover'],
    border: `1px solid ${tv['--border']}`,
    borderRadius: 12,
    color: tv['--foreground'],
    fontSize: 12,
  }

  const mineStatus = useMemo(
    () => statusRecords.filter((r) => r.entityId === entity.id),
    [statusRecords, entity.id]
  )
  const mineDiv = useMemo(
    () => divinationRecords.filter((r) => r.entityId === entity.id),
    [divinationRecords, entity.id]
  )

  const period = useMemo(() => buildPeriod(trendMode, anchor), [trendMode, anchor])

  // 只统计当前所选周期内的记录：每个刻度（一天 / 一个月）一个点
  const trendData = useMemo(() => {
    const inRange = (iso: string, s: Date, e: Date) => {
      const t = new Date(iso).getTime()
      return t >= s.getTime() && t <= e.getTime()
    }
    return period.slots.map((slot) => {
      const status = mineStatus.filter((r) => inRange(r.recordedAt, slot.start, slot.end))
      const divs = mineDiv.filter((r) => inRange(r.recordedAt, slot.start, slot.end))
      const sum = status.reduce((s, r) => s + levelMeta[r.level].score, 0)
      const score = status.length ? Math.round((sum / status.length) * 100) / 100 : null
      return {
        key: slot.key,
        label: slot.label,
        score,
        count: status.length,
        divs: divs.map((d) => d.method || '占卜'),
        divY: divs.length && score != null ? score : null,
      }
    })
  }, [period, mineStatus, mineDiv])

  const hasAny = trendData.some((d) => d.count > 0 || d.divs.length > 0)
  const isCurrentPeriod = useMemo(() => {
    const now = new Date()
    return now.getTime() >= period.start.getTime() && now.getTime() <= period.end.getTime()
  }, [period])

  // 占比统计同样只取当前所选周期内的状态记录
  const periodStatus = useMemo(
    () =>
      mineStatus.filter((r) => {
        const t = new Date(r.recordedAt).getTime()
        return t >= period.start.getTime() && t <= period.end.getTime()
      }),
    [mineStatus, period]
  )

  const factorPie = useMemo(
    () =>
      aggregateTags(periodStatus, pieMode, (r) => [...r.factorsPreset, ...r.factorsCustom]),
    [periodStatus, pieMode]
  )

  const moodPie = useMemo(
    () => aggregateTags(periodStatus, moodMode, (r) => r.descTags ?? []),
    [periodStatus, moodMode]
  )

  const sensationPie = useMemo(
    () =>
      aggregateTags(periodStatus, sensationMode, (r) => [
        ...(r.sensationParts ?? []),
        ...(r.sensationFeelings ?? []),
      ]),
    [periodStatus, sensationMode]
  )

  const perceptionPie = useMemo(
    () => aggregateTags(periodStatus, perceptionMode, (r) => r.perceptions ?? []),
    [periodStatus, perceptionMode]
  )

  return (
    <div className="flex flex-col gap-6">
      {/* 趋势图 */}
      <section className="alpha-card rounded-xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <h3 className="font-serif-x text-lg font-semibold">链接强弱趋势</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 rounded-full border border-border/60 p-0.5">
              {TREND_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTrendMode(t.key)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs transition-colors',
                    trendMode === t.key
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:bg-accent/60'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setAnchor((a) => shiftAnchor(trendMode, a, -1))}
                aria-label="上一个周期"
                className="text-muted-foreground"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-[7.5rem] text-center text-xs text-foreground">
                {period.label}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setAnchor((a) => shiftAnchor(trendMode, a, 1))}
                aria-label="下一个周期"
                className="text-muted-foreground"
              >
                <ChevronRight className="size-4" />
              </Button>
              {!isCurrentPeriod && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAnchor(new Date())}
                  className="text-xs text-primary"
                >
                  回到今天
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary" />
              <Label className="text-xs text-muted-foreground">占卜标点</Label>
              <Switch checked={showDivination} onCheckedChange={setShowDivination} />
            </div>
          </div>
        </div>

        {!hasAny ? (
          <Empty
            text={
              mineStatus.length === 0
                ? '还没有状态记录，先去记一笔吧'
                : `${period.label} 内暂无记录，可切换周期查看`
            }
          />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 10, right: 16, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={tv['--border']} />
              <XAxis
                dataKey="label"
                tick={{ fill: tv['--muted-foreground'], fontSize: 11 }}
                stroke={tv['--border']}
              />
              <YAxis
                domain={[0, 3]}
                ticks={[0, 1, 2, 3]}
                tickFormatter={(v) => ['断连', '弱', '中', '强'][v] ?? ''}
                tick={{ fill: tv['--muted-foreground'], fontSize: 11 }}
                stroke={tv['--border']}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name) => [
                  name === 'score' ? ['强', '中', '弱', '断连'][value] ?? value : value,
                  name === 'score' ? '均值等级' : '占卜',
                ]}
                labelFormatter={(l) => `周期：${l}`}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke={tv['--primary']}
                strokeWidth={2.5}
                dot={{ r: 3, fill: tv['--primary'] }}
                activeDot={{ r: 5 }}
                connectNulls
              />
              {showDivination && (
                <Line
                  type="monotone"
                  dataKey="divY"
                  stroke="transparent"
                  dot={{ r: 5, fill: tv['--chart-3'], stroke: tv['--foreground'], strokeWidth: 1 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
        {showDivination && trendData.some((d) => d.divs.length > 0) && (
            <p className="mt-2 text-xs text-muted-foreground">
            <span
              className="mr-1 inline-block size-2 rounded-full align-middle"
              style={{ background: tv['--chart-3'] }}
            />
            圆点为该周期的占卜记录
          </p>
        )}
      </section>

      <PieSection
        title="影响因素占比"
        icon={PieIcon}
        range={period.label}
        mode={pieMode}
        onModeChange={setPieMode}
        data={factorPie}
        tv={tv}
        chartColors={chartColors}
        tooltipStyle={tooltipStyle}
        emptyText="该周期内暂无影响因素数据"
      />

      <PieSection
        title="心情占比"
        icon={Tags}
        range={period.label}
        mode={moodMode}
        onModeChange={setMoodMode}
        data={moodPie}
        tv={tv}
        chartColors={chartColors}
        tooltipStyle={tooltipStyle}
        emptyText="该周期内暂无心情标签数据"
      />

      <PieSection
        title="体感占比"
        icon={PieIcon}
        range={period.label}
        mode={sensationMode}
        onModeChange={setSensationMode}
        data={sensationPie}
        tv={tv}
        chartColors={chartColors}
        tooltipStyle={tooltipStyle}
        emptyText="该周期内暂无体感数据"
      />

      <PieSection
        title="灵觉占比"
        icon={Sparkles}
        range={period.label}
        mode={perceptionMode}
        onModeChange={setPerceptionMode}
        data={perceptionPie}
        tv={tv}
        chartColors={chartColors}
        tooltipStyle={tooltipStyle}
        emptyText="该周期内暂无灵觉数据"
      />
    </div>
  )
}

function PieSection({
  title,
  icon: Icon,
  range,
  mode,
  onModeChange,
  data,
  tv,
  chartColors,
  tooltipStyle,
  emptyText,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  range: string
  mode: PieMode
  onModeChange: (m: PieMode) => void
  data: { name: string; value: number }[]
  tv: Record<string, string>
  chartColors: string[]
  tooltipStyle: React.CSSProperties
  emptyText: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <section className="alpha-card rounded-xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          <h3 className="font-serif-x text-lg font-semibold">{title}</h3>
          <span className="text-[11px] text-muted-foreground">统计范围 {range}</span>
        </div>
        <div className="flex gap-1 rounded-full border border-border/60 p-0.5">
          {PIE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => onModeChange(t.key)}
              className={cn(
                'rounded-full px-3 py-1 text-xs transition-colors',
                mode === t.key
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:bg-accent/60'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <Empty text={emptyText} />
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <ResponsiveContainer width="100%" height={260} className="sm:w-1/2">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                stroke={tv['--card']}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={chartColors[i % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [
                  `${value} 次 · ${Math.round((value / total) * 100)}%`,
                  '出现占比',
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: tv['--muted-foreground'] }}
                formatter={(v) => <span style={{ color: tv['--foreground'] }}>{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex w-full flex-col gap-1.5 sm:w-1/2">
            {data.map((d, i) => (
              <li key={d.name} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: chartColors[i % chartColors.length] }}
                />
                <span className="flex-1 text-foreground/90">{d.name}</span>
                <span className="text-muted-foreground">
                  {d.value} · {Math.round((d.value / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border/50 text-sm text-muted-foreground">
      {text}
    </div>
  )
}
