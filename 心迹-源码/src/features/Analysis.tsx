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
import { TrendingUp, PieChart as PieIcon, Sparkles, Tags } from 'lucide-react'
import { useStore } from '@/lib/storage'
import { resolveThemeVars } from '@/lib/theme'
import { levelMeta } from '@/lib/format'
import type { Entity, StatusRecord } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

function weekMonday(iso: string): string {
  const d = new Date(iso)
  const day = d.getDay()
  const diff = (day + 6) % 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - diff)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`
}

function monthKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const TREND_TABS = [
  { key: 'weekly', label: '周度' },
  { key: 'monthly', label: '月度' },
] as const

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
  const [trendMode, setTrendMode] = useState<'weekly' | 'monthly'>('weekly')
  const [showDivination, setShowDivination] = useState(true)
  const [pieMode, setPieMode] = useState<PieMode>('total')
  const [moodMode, setMoodMode] = useState<PieMode>('total')

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

  const trendData = useMemo(() => {
    const bucketMap = new Map<
      string,
      { sum: number; count: number; label: string; divs: string[] }
    >()
    const fmtLabel = (key: string) => (trendMode === 'monthly' ? key.replace('-', '年') + '月' : key.slice(5))
    for (const r of mineStatus) {
      const key = trendMode === 'monthly' ? monthKey(r.recordedAt) : weekMonday(r.recordedAt)
      const b = bucketMap.get(key) || { sum: 0, count: 0, label: fmtLabel(key), divs: [] }
      b.sum += levelMeta[r.level].score
      b.count += 1
      bucketMap.set(key, b)
    }
    for (const d of mineDiv) {
      const key = trendMode === 'monthly' ? monthKey(d.recordedAt) : weekMonday(d.recordedAt)
      const b = bucketMap.get(key)
      if (b) b.divs.push(d.method || '占卜')
    }
    return Array.from(bucketMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([key, b]) => ({
        key,
        label: b.label,
        score: b.count ? Math.round((b.sum / b.count) * 100) / 100 : 0,
        count: b.count,
        divs: b.divs,
        divY: b.divs.length ? (b.count ? Math.round((b.sum / b.count) * 100) / 100 : null) : null,
      }))
  }, [mineStatus, mineDiv, trendMode])

  const factorPie = useMemo(
    () =>
      aggregateTags(mineStatus, pieMode, (r) => [...r.factorsPreset, ...r.factorsCustom]),
    [mineStatus, pieMode]
  )

  const moodPie = useMemo(
    () => aggregateTags(mineStatus, moodMode, (r) => r.descTags ?? []),
    [mineStatus, moodMode]
  )

  return (
    <div className="flex flex-col gap-6">
      {/* 趋势图 */}
      <section className="glass rounded-xl p-5">
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
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary" />
              <Label className="text-xs text-muted-foreground">占卜标点</Label>
              <Switch checked={showDivination} onCheckedChange={setShowDivination} />
            </div>
          </div>
        </div>

        {trendData.length === 0 ? (
          <Empty text="还没有状态记录，先去记一笔吧" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
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
        mode={pieMode}
        onModeChange={setPieMode}
        data={factorPie}
        tv={tv}
        chartColors={chartColors}
        tooltipStyle={tooltipStyle}
        emptyText="该筛选下暂无影响因素数据"
      />

      <PieSection
        title="心情占比"
        icon={Tags}
        mode={moodMode}
        onModeChange={setMoodMode}
        data={moodPie}
        tv={tv}
        chartColors={chartColors}
        tooltipStyle={tooltipStyle}
        emptyText="该筛选下暂无心情标签数据"
      />
    </div>
  )
}

function PieSection({
  title,
  icon: Icon,
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
    <section className="glass rounded-xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          <h3 className="font-serif-x text-lg font-semibold">{title}</h3>
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
