import { useMemo, useState } from 'react'
import {
  Activity,
  Sparkles,
  Pencil,
  Trash2,
  Quote,
  CalendarClock,
  History,
  ChevronDown,
  Search,
  X,
} from 'lucide-react'
import { useStore, deleteStatusRecord, deleteDivinationRecord } from '@/lib/storage'
import { levelMeta, verifyMeta, formatDateTime } from '@/lib/format'
import type { DivinationRecord, Entity, StatusRecord } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ImageViewer, type ViewerImage } from '@/components/ImageViewer'
import { StatusForm } from './StatusForm'
import { DivinationForm } from './DivinationForm'

type Filter = 'all' | 'status' | 'divination'

type FlowItem =
  | { kind: 'status'; data: StatusRecord; at: string }
  | { kind: 'divination'; data: DivinationRecord; at: string }

// 搜索：命中标签或任意相关文字即展示该条记录
function matchesQuery(item: FlowItem, q: string): boolean {
  const hay =
    item.kind === 'status'
      ? [
          ...item.data.descTags,
          ...item.data.factorsPreset,
          ...item.data.factorsCustom,
          item.data.freeText,
          item.data.factorFree,
          item.data.level,
        ]
      : [
          item.data.method,
          ...item.data.cards,
          item.data.question,
          item.data.result,
          item.data.thoughts,
          item.data.verifyStatus,
          item.data.verifyNote,
        ]
  return hay.some((t) => (t ?? '').toLowerCase().includes(q))
}

interface RecordFlowProps {
  entity: Entity
}

export function RecordFlow({ entity }: RecordFlowProps) {
  const { statusRecords, divinationRecords } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [editStatus, setEditStatus] = useState<StatusRecord | null>(null)
  const [editDivination, setEditDivination] = useState<DivinationRecord | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())
  const [viewer, setViewer] = useState<{ images: ViewerImage[]; index: number } | null>(null)

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleMonth(key: string) {
    setCollapsedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function openViewer(images: string[], index: number) {
    setViewer({ images: images.map((src) => ({ src })), index })
  }

  const items = useMemo(() => {
    const status = statusRecords
      .filter((r) => r.entityId === entity.id)
      .map((r) => ({ kind: 'status' as const, data: r, at: r.recordedAt }))
    const div = divinationRecords
      .filter((r) => r.entityId === entity.id)
      .map((r) => ({ kind: 'divination' as const, data: r, at: r.recordedAt }))
    let all = [...status, ...div]
    if (filter !== 'all') all = all.filter((i) => i.kind === filter)
    const q = query.trim().toLowerCase()
    if (q) all = all.filter((i) => matchesQuery(i, q))
    return all.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
  }, [statusRecords, divinationRecords, entity.id, filter, query])

  // 搜索时所有月份自动展开，避免结果藏在收起的分组里
  const searching = query.trim().length > 0

  // 按月份归拢：同一个月的记录放在一起，月份可展开 / 收起
  const months = useMemo(() => {
    const map = new Map<string, typeof items>()
    for (const it of items) {
      const key = it.at.slice(0, 7)
      const arr = map.get(key)
      if (arr) arr.push(it)
      else map.set(key, [it])
    }
    return Array.from(map.entries())
      .map(([key, list]) => {
        const [y, m] = key.split('-')
        return { key, label: `${y} 年 ${Number(m)} 月`, items: list }
      })
      .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0))
  }, [items])

  const allCollapsed = months.length > 0 && months.every((m) => collapsedMonths.has(m.key))

  function handleDelete(kind: 'status' | 'divination', id: string) {
    const label = kind === 'status' ? '状态记录' : '占卜记录'
    if (!window.confirm(`确定删除这条${label}吗？此操作不可撤销。`)) return
    if (kind === 'status') deleteStatusRecord(id)
    else deleteDivinationRecord(id)
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'status', label: '状态' },
    { key: 'divination', label: '占卜' },
  ]

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索标签或正文…"
          className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="清空搜索"
            title="清空"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              filter === f.key
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:bg-accent/60'
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">共 {items.length} 条</span>
        {months.length > 1 && !searching && (
          <button
            type="button"
            onClick={() =>
              setCollapsedMonths(
                allCollapsed ? new Set() : new Set(months.map((m) => m.key))
              )
            }
            className="text-xs text-primary transition-opacity hover:opacity-80"
          >
            {allCollapsed ? '全部展开' : '全部收起'}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-14 text-center">
            <History className="size-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {searching
                ? '没有匹配的记录，换个关键词试试'
                : filter === 'all'
                  ? '还没有记录，使用上方按钮开始记录'
                  : filter === 'status'
                    ? '还没有状态记录'
                    : '还没有占卜记录'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {months.map((month) => {
              const monthOpen = searching || !collapsedMonths.has(month.key)
              return (
                <section key={month.key} className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => toggleMonth(month.key)}
                    className="flex w-fit items-center gap-2 rounded-lg px-1 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    aria-expanded={monthOpen}
                  >
                    <ChevronDown
                      className={cn('size-4 transition-transform', !monthOpen && '-rotate-90')}
                    />
                    <span className="font-serif-x text-base font-semibold text-foreground">
                      {month.label}
                    </span>
                    <span className="text-xs">{month.items.length} 条</span>
                  </button>
                  {monthOpen && (
                    <ul className="flex flex-col gap-3">
                      {month.items.map((item) => {
                        const key = `${item.kind}-${item.data.id}`
                        const isOpen = expanded.has(key)
                        return item.kind === 'status' ? (
                          <StatusCard
                            key={key}
                            record={item.data}
                            expanded={isOpen}
                            onToggle={() => toggleExpanded(key)}
                            onOpenImage={(i) => openViewer(item.data.images ?? [], i)}
                            onEdit={() => setEditStatus(item.data)}
                            onDelete={() => handleDelete('status', item.data.id)}
                          />
                        ) : (
                          <DivinationCard
                            key={key}
                            record={item.data}
                            expanded={isOpen}
                            onToggle={() => toggleExpanded(key)}
                            onOpenImage={(i) => openViewer(item.data.images ?? [], i)}
                            onEdit={() => setEditDivination(item.data)}
                            onDelete={() => handleDelete('divination', item.data.id)}
                          />
                        )
                      })}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>

      <StatusForm
        open={!!editStatus}
        onOpenChange={(o) => !o && setEditStatus(null)}
        entityId={entity.id}
        record={editStatus}
      />
      <DivinationForm
        open={!!editDivination}
        onOpenChange={(o) => !o && setEditDivination(null)}
        entityId={entity.id}
        record={editDivination}
      />

      {viewer && (
        <ImageViewer
          images={viewer.images}
          index={viewer.index}
          onIndexChange={(i) => setViewer((v) => (v ? { ...v, index: i } : v))}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  )
}

function CardShell({
  icon,
  accent,
  meta,
  children,
  onEdit,
  onDelete,
}: {
  icon: React.ReactNode
  accent: string
  meta?: React.ReactNode
  children: React.ReactNode
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <li className="group relative animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <div
        className="alpha-card rounded-xl p-4 pl-5"
        style={{ borderLeft: `3px solid ${accent}` }}
      >
        <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="icon-sm" variant="ghost" onClick={onEdit} className="text-muted-foreground">
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-2 pr-14 text-muted-foreground">
          {icon}
          {meta}
        </div>
        {children}
      </div>
    </li>
  )
}

function Chip({
  children,
  tone,
}: {
  children: React.ReactNode
  tone?: 'green' | 'blue' | 'gold' | 'red' | 'neutral'
}) {
  if (!tone) {
    return (
      <span
        className="rounded-full border border-border px-2 py-0.5 text-[11px]"
        style={{
          background: 'color-mix(in oklab, var(--foreground) 7%, transparent)',
          color: 'var(--muted-foreground)',
        }}
      >
        {children}
      </span>
    )
  }
  const v = tone === 'neutral' ? '--muted-foreground' : `--theme-${tone}`
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px]"
      style={{
        color: `var(${v})`,
        background: `color-mix(in oklab, var(${v}) 14%, transparent)`,
        border: `1px solid color-mix(in oklab, var(${v}) 35%, transparent)`,
      }}
    >
      {children}
    </span>
  )
}

function ImageGrid({
  images,
  onOpen,
}: {
  images: string[]
  onOpen: (index: number) => void
}) {
  if (!images || images.length === 0) return null
  return (
    <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
      {images.map((src, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onOpen(i)}
          className="block aspect-square overflow-hidden rounded-lg border border-border/60 bg-black/20 transition hover:opacity-90"
          aria-label={`查看第 ${i + 1} 张图片`}
        >
          <img src={src} alt="" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  )
}

function StatusCard({
  record,
  expanded,
  onToggle,
  onOpenImage,
  onEdit,
  onDelete,
}: {
  record: StatusRecord
  expanded: boolean
  onToggle: () => void
  onOpenImage: (index: number) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const meta = levelMeta[record.level]
  const factors = [...record.factorsPreset, ...record.factorsCustom]
  const hasSensation =
    (record.sensationParts?.length ?? 0) > 0 ||
    (record.sensationFeelings?.length ?? 0) > 0 ||
    (record.perceptions?.length ?? 0) > 0 ||
    (record.sensationFree ?? '') !== ''
  const hasMore = Boolean(
    record.freeText ||
      record.factorFree ||
      (record.sensationFree ?? '') ||
      factors.length > 0 ||
      hasSensation ||
      (record.images?.length ?? 0) > 0
  )
  return (
    <CardShell
      icon={<Activity className="size-4" style={{ color: meta.color }} />}
      accent={meta.color}
      meta={
        <>
          <Chip tone={meta.tone}>{record.level}</Chip>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3" />
            {formatDateTime(record.recordedAt)}
          </span>
          {record.isBackfill && <Chip>补记</Chip>}
        </>
      }
      onEdit={onEdit}
      onDelete={onDelete}
    >
      {record.descTags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {record.descTags.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </div>
      )}

      {record.freeText && (
        <p className="mb-2 whitespace-pre-wrap text-base md:text-sm text-foreground/80">{record.freeText}</p>
      )}

      {expanded && (
        <>
          <ImageGrid images={record.images} onOpen={onOpenImage} />
          {factors.length > 0 || record.factorFree ? (
            <div className="border-t border-border/30 pt-2">
              <p className="mb-1 text-[11px] text-muted-foreground">影响因素</p>
              <div className="flex flex-wrap gap-1.5">
                {factors.map((f) => (
                  <Chip key={f}>{f}</Chip>
                ))}
              </div>
              {record.factorFree && (
                <p className="mt-1 whitespace-pre-wrap text-base md:text-sm text-foreground/80">
                  {record.factorFree}
                </p>
              )}
            </div>
          ) : null}
          {hasSensation && (
            <div className="border-t border-border/30 pt-2">
              <p className="mb-1 text-[11px] text-muted-foreground">体感灵觉</p>
              <div className="flex flex-wrap gap-1.5">
                {(record.sensationParts ?? []).map((t) => (
                  <Chip key={`sp-${t}`}>{t}</Chip>
                ))}
                {(record.sensationFeelings ?? []).map((t) => (
                  <Chip key={`sf-${t}`}>{t}</Chip>
                ))}
                {(record.perceptions ?? []).map((t) => (
                  <Chip key={`p-${t}`}>{t}</Chip>
                ))}
              </div>
              {record.sensationFree && (
                <p className="mt-1 whitespace-pre-wrap text-base md:text-sm text-foreground/80">
                  {record.sensationFree}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {hasMore && <ExpandButton expanded={expanded} onToggle={onToggle} />}
    </CardShell>
  )
}

function DivinationCard({
  record,
  expanded,
  onToggle,
  onOpenImage,
  onEdit,
  onDelete,
}: {
  record: DivinationRecord
  expanded: boolean
  onToggle: () => void
  onOpenImage: (index: number) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const vMeta = record.verifyStatus ? verifyMeta[record.verifyStatus] : null
  const hasMore = Boolean(
    record.question ||
      record.result ||
      record.thoughts ||
      record.verifyNote ||
      record.cards.length > 0 ||
      (record.images?.length ?? 0) > 0
  )
  return (
    <CardShell
      icon={<Sparkles className="size-4 text-primary" />}
      accent="var(--primary)"
      meta={
        <>
          <Chip>{record.method || '占卜'}</Chip>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="size-3" />
            {formatDateTime(record.recordedAt)}
          </span>
          {vMeta && <Chip tone={vMeta.tone}>{record.verifyStatus}</Chip>}
        </>
      }
      onEdit={onEdit}
      onDelete={onDelete}
    >
      {record.cards.length > 0 && (
        <div className={cn('mb-2 flex flex-wrap gap-1.5', !expanded && 'max-h-6 overflow-hidden')}>
          {record.cards.map((c, i) => (
            <Chip key={i}>{c}</Chip>
          ))}
        </div>
      )}

      {record.question && (
        <p className="mb-1.5 flex gap-1.5 text-sm text-foreground/90">
          <Quote className="size-3.5 shrink-0 translate-y-0.5 text-primary/70" />
          <span className={cn('whitespace-pre-wrap', !expanded && 'line-clamp-2')}>
            {record.question}
          </span>
        </p>
      )}

      {expanded && (
        <>
          <ImageGrid images={record.images} onOpen={onOpenImage} />

          {record.result && (
            <p className="mb-1.5 whitespace-pre-wrap text-sm text-foreground/80">{record.result}</p>
          )}

          {record.thoughts && (
            <p className="mb-1.5 whitespace-pre-wrap text-sm text-muted-foreground">
              {record.thoughts}
            </p>
          )}

          {record.verifyNote && (
            <div className="border-t border-border/30 pt-2 text-xs text-muted-foreground">
              应验说明：{record.verifyNote}
            </div>
          )}
        </>
      )}

      {hasMore && <ExpandButton expanded={expanded} onToggle={onToggle} />}
    </CardShell>
  )
}

function ExpandButton({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-1 flex items-center gap-1 text-xs text-primary transition-colors hover:opacity-80"
    >
      <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
      {expanded ? '收起' : '展开详情'}
    </button>
  )
}
