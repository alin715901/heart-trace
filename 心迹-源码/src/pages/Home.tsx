import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Activity, Sparkles, Wand2, PanelLeftOpen, Waves } from 'lucide-react'
import { useStore, setActiveEntity, deleteEntity } from '@/lib/storage'
import { applyTheme, applyBackground } from '@/lib/theme'
import type { Entity } from '@/lib/types'
import { Sidebar } from '@/components/Sidebar'
import { EntityDialog } from '@/components/EntityDialog'
import { SettingsDialog } from '@/features/SettingsDialog'
import { StatusForm } from '@/features/StatusForm'
import { DivinationForm } from '@/features/DivinationForm'
import { RecordFlow } from '@/features/RecordFlow'
import { Analysis } from '@/features/Analysis'
import { SenseNowDialog } from '@/features/SenseNowDialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Home() {
  const { entities, activeEntityId, settings } = useStore()
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('xinji:sidebar') : null
    return saved === null ? true : saved === 'open'
  })

  function toggleSidebar(open: boolean) {
    setSidebarOpen(open)
    try {
      localStorage.setItem('xinji:sidebar', open ? 'open' : 'closed')
    } catch {
      /* 忽略存储异常 */
    }
  }
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [entityDialog, setEntityDialog] = useState<{ open: boolean; entity?: Entity | null }>({
    open: false,
  })

  const activeEntity = useMemo(
    () => entities.find((e) => e.id === activeEntityId) || null,
    [entities, activeEntityId]
  )

  // 主题与角色点缀色：全局即时生效
  useEffect(() => {
    applyTheme(settings)
  }, [settings.themeId, settings.customTheme, settings.savedThemes])

  // 背景图片与面板透明度：全局即时生效
  useEffect(() => {
    applyBackground(settings)
  }, [settings.backgroundImage, settings.cardOpacity])

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--entity-accent',
      activeEntity?.color || 'var(--primary)'
    )
  }, [activeEntity?.color])

  useEffect(() => {
    if (entities.length === 0) {
      if (activeEntityId !== null) setActiveEntity(null)
      return
    }
    if (!activeEntity) setActiveEntity(entities[0].id)
  }, [entities, activeEntity, activeEntityId])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => toggleSidebar(false)}
        onNewEntity={() => setEntityDialog({ open: true })}
        onEditEntity={(e) => setEntityDialog({ open: true, entity: e })}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => toggleSidebar(false)}
        />
      )}

      {!sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toggleSidebar(true)}
          className="fixed left-3 top-3 z-30 text-muted-foreground"
          aria-label="展开侧栏"
        >
          <PanelLeftOpen className="size-5" />
        </Button>
      )}

      <main className="flex-1 overflow-hidden">
        {!activeEntity ? (
          <Welcome
            onCreate={() => setEntityDialog({ open: true })}
            hasEntities={entities.length > 0}
          />
        ) : (
          <EntityView
            key={activeEntity.id}
            entity={activeEntity}
            onEdit={() => setEntityDialog({ open: true, entity: activeEntity })}
          />
        )}
      </main>

      <EntityDialog
        open={entityDialog.open}
        onOpenChange={(o) => setEntityDialog((s) => ({ ...s, open: o }))}
        entity={entityDialog.entity}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}

function Welcome({ onCreate, hasEntities }: { onCreate: () => void; hasEntities: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Wand2 className="size-8" />
      </span>
      <div>
        <h2 className="font-serif-x text-2xl font-semibold">欢迎来到「心迹」</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          为灵魂链接而生的记录工作台。记录状态强弱与占卜灵光，
          让时间替你看见脉络。
        </p>
      </div>
      <Button size="lg" onClick={onCreate}>
        <Plus className="size-4" />
        {hasEntities ? '选择或新建主体' : '创建第一个主体'}
      </Button>
    </div>
  )
}

function EntityView({ entity, onEdit }: { entity: Entity; onEdit: () => void }) {
  const [tab, setTab] = useState('flow')
  const [statusOpen, setStatusOpen] = useState(false)
  const [divOpen, setDivOpen] = useState(false)
  const [senseOpen, setSenseOpen] = useState(false)

  function handleDelete() {
    if (!window.confirm(`确定删除主体「${entity.name}」及其全部记录吗？此操作不可撤销。`)) return
    deleteEntity(entity.id)
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      {/* 主体头部 */}
      <header className="alpha-card flex shrink-0 flex-col gap-4 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-xl font-serif-x text-lg font-semibold"
              style={{
                color: 'var(--entity-accent)',
                background: 'color-mix(in oklab, var(--entity-accent) 18%, transparent)',
              }}
            >
              {entity.name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-serif-x text-2xl font-semibold leading-tight">
                {entity.name}
              </h2>
              <div className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
                <span>{entity.category || '未分类'}</span>
                {entity.tags.map((t) => (
                  <span key={t} className="flex items-center gap-x-1">
                    <span className="opacity-50">·</span>
                    <span>{t}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="ghost" onClick={onEdit} className="text-muted-foreground">
              <Pencil className="size-4" />
              <span className="hidden sm:inline">编辑</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setStatusOpen(true)}
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            <Activity className="size-4" />
            记录状态
          </Button>
          <Button
            variant="outline"
            onClick={() => setDivOpen(true)}
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            <Sparkles className="size-4" />
            记录占卜
          </Button>
          <Button
            variant="outline"
            onClick={() => setSenseOpen(true)}
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            <Waves className="size-4" />
            感知此刻
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-muted-foreground"
            onClick={() => setTab('analysis')}
            title="查看分析"
          >
            <Wand2 className="size-4" />
          </Button>
        </div>
      </header>

      {/* 内容区 */}
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList
          className="self-start shrink-0"
          style={{
            background:
              'color-mix(in oklab, var(--card) var(--glass-alpha, 78%), transparent)',
            backdropFilter: 'blur(calc(var(--glass-alpha-num, 0.78) * 14px))',
          }}
        >
          <TabsTrigger value="flow">记录流</TabsTrigger>
          <TabsTrigger value="analysis">分析</TabsTrigger>
        </TabsList>
        <TabsContent value="flow" className="mt-0 flex min-h-0 flex-col">
          <RecordFlow entity={entity} />
        </TabsContent>
        <TabsContent value="analysis" className="mt-0 min-h-0 overflow-y-auto">
          <Analysis entity={entity} />
        </TabsContent>
      </Tabs>

      <StatusForm
        open={statusOpen}
        onOpenChange={setStatusOpen}
        entityId={entity.id}
      />
      <DivinationForm
        open={divOpen}
        onOpenChange={setDivOpen}
        entityId={entity.id}
      />
      <SenseNowDialog open={senseOpen} onOpenChange={setSenseOpen} />
    </div>
  )
}
