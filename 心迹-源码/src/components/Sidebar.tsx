import { useMemo, useState } from 'react'
import {
  Plus,
  Settings,
  Search,
  Sparkles,
  Users,
  PanelLeftClose,
  ChevronRight,
  Folder,
  FolderOpen,
  Pencil,
  Check,
  X,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore, setActiveEntity, renameEntityTag, deleteEntityTag, deleteEntity } from '@/lib/storage'
import type { Entity } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SidebarProps {
  open: boolean
  onClose: () => void
  onNewEntity: () => void
  onEditEntity: (entity: Entity) => void
  onOpenSettings: () => void
}

const UNTAGGED_KEY = '__untagged__'

export function Sidebar({
  open,
  onClose,
  onNewEntity,
  onEditEntity,
  onOpenSettings,
}: SidebarProps) {
  const { entities, activeEntityId, statusRecords, divinationRecords } = useStore()
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  function toggleFolder(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function pick(id: string) {
    setActiveEntity(id)
    if (window.innerWidth < 768) onClose()
  }

  function startRename(key: string, label: string) {
    setRenaming(key)
    setRenameDraft(label)
  }

  function commitRename(tag: string) {
    const next = renameDraft.trim()
    if (next && next !== tag) renameEntityTag(tag, next)
    setRenaming(null)
    setRenameDraft('')
  }

  function handleDeleteFolder(label: string, count: number) {
    if (
      !window.confirm(
        `确定删除文件夹「${label}」吗？\n将从 ${count} 个主体上移除该标签，主体与其记录都会保留。`
      )
    )
      return
    deleteEntityTag(label)
  }

  function handleDeleteEntity(entity: Entity) {
    if (!window.confirm(`确定删除主体「${entity.name}」及其全部记录吗？此操作不可撤销。`)) return
    deleteEntity(entity.id)
  }

  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of statusRecords) m.set(r.entityId, (m.get(r.entityId) || 0) + 1)
    for (const r of divinationRecords) m.set(r.entityId, (m.get(r.entityId) || 0) + 1)
    return m
  }, [statusRecords, divinationRecords])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entities
    return entities.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [entities, query])

  // 按标签分组成文件夹；无标签的归入「未加标签」
  const folders = useMemo(() => {
    const tagMap = new Map<string, Entity[]>()
    const untagged: Entity[] = []
    for (const e of filtered) {
      if (e.tags.length === 0) {
        untagged.push(e)
        continue
      }
      for (const tag of e.tags) {
        const arr = tagMap.get(tag)
        if (arr) arr.push(e)
        else tagMap.set(tag, [e])
      }
    }
    const list = Array.from(tagMap.entries())
      .map(([tag, items]) => ({ key: `t:${tag}`, label: tag, items }))
      .sort((a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label))
    if (untagged.length > 0) {
      list.push({ key: UNTAGGED_KEY, label: '未加标签', items: untagged })
    }
    return list
  }, [filtered])

  // 搜索时全部展开，避免结果藏在收起的文件夹里
  const searching = query.trim().length > 0

  return (
    <aside
      className={cn(
        'glass fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-border/40',
        'transition-transform duration-300 md:static md:z-auto md:transition-none',
        open ? 'translate-x-0' : '-translate-x-full md:hidden'
      )}
    >
      <div className="flex items-center justify-between px-5 pb-4 pt-6">
        <div className="flex items-center gap-2">
          <span
            className="flex size-9 items-center justify-center rounded-xl text-primary"
            style={{ background: 'color-mix(in oklab, var(--primary) 15%, transparent)' }}
          >
            <Sparkles className="size-5" />
          </span>
          <div>
            <h1 className="font-serif-x text-2xl font-semibold leading-none text-foreground">
              心迹
            </h1>
            <p className="text-[11px] text-muted-foreground">灵魂链接记录工作台</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-muted-foreground"
          aria-label="收起侧栏"
        >
          <PanelLeftClose className="size-4" />
        </Button>
      </div>

      <div className="px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索主体 / 分类 / 标签"
            className="h-9 pl-9 text-sm"
          />
        </div>
      </div>

      <div className="px-4 pt-3">
        <Button onClick={onNewEntity} className="w-full" size="sm">
          <Plus className="size-4" />
          新建主体
        </Button>
      </div>

      <ScrollArea className="mt-3 flex-1 px-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
            <Users className="size-7 opacity-50" />
            {entities.length === 0 ? '还没有主体，点击上方新建' : '没有匹配的主体'}
          </div>
        ) : (
          <ul className="flex flex-col gap-1 pb-4">
            {folders.map((f) => {
              const isOpen = searching || !collapsed.has(f.key)
              const FolderIcon = isOpen ? FolderOpen : Folder
              const isRenaming = renaming === f.key
              const canRename = f.key !== UNTAGGED_KEY
              return (
                <li key={f.key}>
                  {isRenaming ? (
                    <div className="flex items-center gap-1 px-2 py-1">
                      <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                      <Input
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            commitRename(f.label)
                          }
                          if (e.key === 'Escape') {
                            setRenaming(null)
                            setRenameDraft('')
                          }
                        }}
                        className="h-7 flex-1 text-xs"
                        autoFocus
                        aria-label={`重命名文件夹 ${f.label}`}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 text-muted-foreground"
                        onClick={() => commitRename(f.label)}
                        aria-label="确认重命名"
                      >
                        <Check className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 text-muted-foreground"
                        onClick={() => {
                          setRenaming(null)
                          setRenameDraft('')
                        }}
                        aria-label="取消重命名"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 rounded-xl transition-colors hover:bg-accent/50">
                      <button
                        type="button"
                        onClick={() => toggleFolder(f.key)}
                        className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2 text-left"
                        aria-expanded={isOpen}
                      >
                        <ChevronRight
                          className={cn(
                            'size-3.5 shrink-0 text-muted-foreground transition-transform',
                            isOpen && 'rotate-90'
                          )}
                        />
                        <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                          {f.label}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {f.items.length}
                        </span>
                      </button>
                      {canRename && (
                        <button
                          type="button"
                          onClick={() => startRename(f.key, f.label)}
                          className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-60 transition hover:bg-accent/60 hover:text-foreground hover:opacity-100"
                          aria-label={`重命名文件夹 ${f.label}`}
                          title="重命名"
                        >
                          <Pencil className="size-3" />
                        </button>
                      )}
                      {canRename && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFolder(f.label, f.items.length)}
                          className="mr-0.5 shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-60 transition hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
                          aria-label={`删除文件夹 ${f.label}`}
                          title="删除文件夹"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  )}
                  {isOpen && !isRenaming && (
                    <ul className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-border/40 pl-1.5">
                      {f.items.map((e) => (
                        <li key={e.id}>
                          <EntityRow
                            entity={e}
                            active={e.id === activeEntityId}
                            count={counts.get(e.id) || 0}
                            onPick={() => pick(e.id)}
                            onEdit={() => onEditEntity(e)}
                            onDelete={() => handleDeleteEntity(e)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </ScrollArea>

      <div className="border-t border-border/30 p-3">
        <Button
          variant="ghost"
          onClick={onOpenSettings}
          className="w-full justify-start text-muted-foreground"
          size="sm"
        >
          <Settings className="size-4" />
          设置
        </Button>
      </div>
    </aside>
  )
}

function EntityRow({
  entity,
  active,
  count,
  onPick,
  onEdit,
  onDelete,
}: {
  entity: Entity
  active: boolean
  count: number
  onPick: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-0.5 rounded-xl pr-1 transition-colors',
        active ? '' : 'hover:bg-accent/60'
      )}
      style={
        active
          ? {
              backgroundColor: 'color-mix(in oklab, var(--entity-accent) 14%, transparent)',
              boxShadow: 'inset 3px 0 0 0 var(--entity-accent)',
            }
          : undefined
      }
    >
      <button
        type="button"
        onClick={onPick}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 py-2 text-left"
      >
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ background: entity.color, boxShadow: `0 0 0 2px ${entity.color}55` }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {entity.name}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate">{entity.category || '未分类'}</span>
            <span>·</span>
            <span>{count} 条记录</span>
          </span>
        </span>
      </button>
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg p-1.5 text-muted-foreground opacity-50 transition hover:bg-accent/60 hover:text-foreground hover:opacity-100"
          aria-label={`编辑主体 ${entity.name}`}
          title="编辑信息"
        >
          <Pencil className="size-3" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg p-1.5 text-muted-foreground opacity-50 transition hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
          aria-label={`删除主体 ${entity.name}`}
          title="删除主体"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  )
}
