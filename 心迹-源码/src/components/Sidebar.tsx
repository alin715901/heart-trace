import { useMemo, useState } from 'react'
import { Plus, Settings, Search, Sparkles, Users, PanelLeftClose } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore, setActiveEntity } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SidebarProps {
  open: boolean
  onClose: () => void
  onNewEntity: () => void
  onOpenSettings: () => void
}

export function Sidebar({ open, onClose, onNewEntity, onOpenSettings }: SidebarProps) {
  const { entities, activeEntityId, statusRecords, divinationRecords } = useStore()
  const [query, setQuery] = useState('')

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
            {filtered.map((e) => {
              const active = e.id === activeEntityId
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveEntity(e.id)
                      if (window.innerWidth < 768) onClose()
                    }}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
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
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: e.color, boxShadow: `0 0 0 2px ${e.color}55` }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {e.name}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="truncate">{e.category || '未分类'}</span>
                        <span>·</span>
                        <span>{counts.get(e.id) || 0} 条记录</span>
                      </span>
                    </span>
                  </button>
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
