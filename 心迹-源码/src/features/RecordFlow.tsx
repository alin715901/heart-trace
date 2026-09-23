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

interface RecordFlowProps {
  entity: Entity
}

export function RecordFlow({ entity }: RecordFlowProps) {
  const { statusRecords, divinationRecords } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [editStatus, setEditStatus] = useState<StatusRecord | null>(null)
  const [editDivination, setEditDivination] = useState<DivinationRecord | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [viewer, setViewer] = useState<{ images: ViewerImage[]; index: number } | null>(null)

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
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
    return all.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
  }, [statusRecords, divinationRecords, entity.id, filter])

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
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
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 py-14 text-center">
          <History className="size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            {filter === 'all'
              ? '还没有记录，使用上方按钮开始记录'
              : filter === 'status'
                ? '还没有状态记录'
                : '还没有占卜记录'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
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
  children,
  onEdit,
  onDelete,
}: {
  icon: React.ReactNode
  accent: string
  children: React.ReactNode
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <li className="group relative animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <div
        className="glass rounded-xl p-4 pl-5"
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
        <div className="mb-2 flex items-center gap-2 text-muted-foreground">{icon}</div>
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
  const hasMore = Boolean(
    record.freeText || record.factorFree || factors.length > 0 || (record.images?.length ?? 0) > 0
  )
  return (
    <CardShell
      icon={<Activity className="size-4" style={{ color: meta.color }} />}
      accent={meta.color}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Chip tone={meta.tone}>{record.level}</Chip>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock className="size-3" />
          {formatDateTime(record.recordedAt)}
        </span>
        {record.isBackfill && <Chip>补记</Chip>}
      </div>

      {record.descTags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {record.descTags.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </div>
      )}

      {record.freeText && (
        <p
          className={cn(
            'mb-2 whitespace-pre-wrap text-sm text-foreground/90',
            !expanded && 'line-clamp-2'
          )}
        >
          {record.freeText}
        </p>
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
                {record.factorFree && (
                  <span className="text-xs text-muted-foreground">· {record.factorFree}</span>
                )}
              </div>
            </div>
          ) : null}
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
      onEdit={onEdit}
      onDelete={onDelete}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Chip>{record.method || '占卜'}</Chip>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock className="size-3" />
          {formatDateTime(record.recordedAt)}
        </span>
        {vMeta && <Chip tone={vMeta.tone}>{record.verifyStatus}</Chip>}
      </div>

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
