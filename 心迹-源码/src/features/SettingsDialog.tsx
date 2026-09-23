import { useRef, useState } from 'react'
import {
  X,
  Plus,
  Download,
  Upload,
  Trash2,
  Tags,
  SlidersHorizontal,
  Database,
  Palette,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useStore,
  getState,
  updateSettings,
  updateFieldToggles,
  exportState,
  importData,
  appendData,
  resetAll,
} from '@/lib/storage'
import { exportRecordsCSV, importRecordsCSV } from '@/lib/csv'
import { PRESETS, THEME_LIST, buildThemeVars, DEFAULT_CUSTOM_THEME } from '@/lib/theme'
import { cn } from '@/lib/utils'
import type { FieldToggles } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function TagPoolEditor({
  title,
  items,
  onAdd,
  onRemove,
}: {
  title: string
  items: string[]
  onAdd: (v: string) => void
  onRemove: (v: string) => void
}) {
  const [draft, setDraft] = useState('')
  function add() {
    const t = draft.trim()
    if (!t || items.includes(t)) {
      setDraft('')
      return
    }
    onAdd(t)
    setDraft('')
  }
  return (
    <div className="flex flex-col gap-2">
      <Label>{title}</Label>
      <div className="flex flex-wrap gap-1.5">
        {items.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-xs text-primary"
          >
            {t}
            <button type="button" onClick={() => onRemove(t)} aria-label={`删除 ${t}`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-muted-foreground">暂无</span>}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`添加${title}…`}
          className="h-8 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <Button type="button" size="sm" variant="secondary" onClick={add}>
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function ThemePanel() {
  const { settings } = useStore()
  const themeId = settings.themeId || 'paper'
  const custom = settings.customTheme || DEFAULT_CUSTOM_THEME

  function selectPreset(id: string) {
    if (id === 'custom') {
      updateSettings({
        themeId: 'custom',
        customTheme: settings.customTheme || DEFAULT_CUSTOM_THEME,
      })
    } else {
      updateSettings({ themeId: id })
    }
  }

  function updateCustom(key: keyof typeof DEFAULT_CUSTOM_THEME, value: string) {
    updateSettings({
      themeId: 'custom',
      customTheme: { ...custom, [key]: value },
    })
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      <p className="text-xs text-muted-foreground">
        选择一套预设主题，或切换到「自定义」自由调配主色、背景与点缀色。改动会即时在整个界面生效。
      </p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {THEME_LIST.map((t) => {
          const active = themeId === t.id
          const swatch =
            t.id === 'custom'
              ? 'conic-gradient(from 180deg, #a78bfa, #7dd3fc, #fcd34d, #f0abfc, #a78bfa)'
              : buildThemeVars(PRESETS[t.id])['--primary']
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectPreset(t.id)}
              className={
                'flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ' +
                (active
                  ? 'border-primary bg-primary/10'
                  : 'border-border/50 hover:border-primary/50 hover:bg-accent/40')
              }
            >
              <span
                className={cn(
                  'size-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition',
                  active ? 'ring-primary' : 'ring-transparent'
                )}
                style={{ background: swatch }}
              />
              <span className="text-[11px] text-foreground">{t.label}</span>
            </button>
          )
        })}
      </div>

      {themeId === 'custom' && (
        <div className="flex flex-col gap-3 rounded-xl border border-border/50 p-4">
          <p className="text-sm font-medium text-foreground">自定义配色</p>
          {(
            [
              { key: 'primary', label: '主色', hint: '按钮、强调与图表主色' },
              { key: 'background', label: '背景', hint: '整体底色基调' },
              { key: 'accent', label: '点缀', hint: '卡片、侧栏高亮' },
            ] as const
          ).map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3">
              <div>
                <Label>{row.label}</Label>
                <p className="text-[11px] text-muted-foreground">{row.hint}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {custom[row.key]}
                </span>
                <input
                  type="color"
                  value={custom[row.key]}
                  onChange={(e) => updateCustom(row.key, e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border border-border/50 bg-transparent"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const TOGGLE_FIELDS: { key: keyof FieldToggles; label: string; hint: string }[] = [
  { key: 'statusFreeText', label: '状态 · 自由补充', hint: '状态记录中的自由文字框' },
  { key: 'statusFactorFree', label: '状态 · 影响因素自由补充', hint: '不便标签化的影响因素' },
  { key: 'divinationThoughts', label: '占卜 · 感想', hint: '占卜记录中的感想栏' },
  { key: 'divinationVerifyNote', label: '占卜 · 应验说明', hint: '应验情况的补充说明' },
  { key: 'entityTags', label: '主体 · 标签', hint: '主体的自定义标签（暂为预留开关）' },
]

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, entities, statusRecords, divinationRecords } = useStore()
  const jsonInput = useRef<HTMLInputElement>(null)
  const csvInput = useRef<HTMLInputElement>(null)

  function handleExportJSON() {
    const stamp = new Date().toISOString().slice(0, 10)
    download(`心迹备份-${stamp}.json`, exportState(), 'application/json')
    toast.success('已导出备份（JSON）')
  }

  function handleExportCSV() {
    const stamp = new Date().toISOString().slice(0, 10)
    download(`心迹记录-${stamp}.csv`, exportRecordsCSV(getState()), 'text/csv')
    toast.success('已导出 CSV')
  }

  async function handleImportJSON(file: File) {
    try {
      const text = await file.text()
      importData(text)
      toast.success('备份已恢复')
      onOpenChange(false)
    } catch (e) {
      toast.error('导入失败：文件格式不正确')
    }
  }

  async function handleImportCSV(file: File) {
    try {
      const text = await file.text()
      const partial = importRecordsCSV(text)
      appendData(partial)
      toast.success(`已导入 ${partial.entities.length} 个主体、${partial.statusRecords.length + partial.divinationRecords.length} 条记录`)
    } catch (e) {
      toast.error('CSV 导入失败：' + (e instanceof Error ? e.message : '格式错误'))
    }
  }

  function handleReset() {
    if (!window.confirm('确定清空全部数据吗？此操作不可撤销，建议先导出备份。')) return
    resetAll()
    toast.success('已清空全部数据')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[90vh] overflow-y-auto border-border/40 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>管理外观主题、标签库、字段开关与数据（跨设备传输）。</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appearance">
              <Palette className="mr-1 size-3.5" />
              外观
            </TabsTrigger>
            <TabsTrigger value="fields">
              <SlidersHorizontal className="mr-1 size-3.5" />
              字段
            </TabsTrigger>
            <TabsTrigger value="tags">
              <Tags className="mr-1 size-3.5" />
              标签库
            </TabsTrigger>
            <TabsTrigger value="data">
              <Database className="mr-1 size-3.5" />
              数据
            </TabsTrigger>
          </TabsList>

          {/* 外观 / 主题 */}
          <TabsContent value="appearance" className="pt-2">
            <ThemePanel />
          </TabsContent>

          {/* 字段开关 */}
          <TabsContent value="fields" className="flex flex-col gap-4 pt-2">
            <p className="text-xs text-muted-foreground">
              关闭后，对应字段在记录表单中将不再显示。已存在的数据仍保留。
            </p>
            {TOGGLE_FIELDS.map((f) => (
              <div
                key={f.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2.5"
              >
                <div>
                  <Label>{f.label}</Label>
                  <p className="text-[11px] text-muted-foreground">{f.hint}</p>
                </div>
                <Switch
                  checked={settings.fieldToggles[f.key]}
                  onCheckedChange={(v) => updateFieldToggles({ [f.key]: v })}
                />
              </div>
            ))}
          </TabsContent>

          {/* 标签库 */}
          <TabsContent value="tags" className="flex flex-col gap-5 pt-2">
            <TagPoolEditor
              title="状态描述标签"
              items={settings.statusDescTags}
              onAdd={(v) => updateSettings({ statusDescTags: [...settings.statusDescTags, v] })}
              onRemove={(v) =>
                updateSettings({ statusDescTags: settings.statusDescTags.filter((x) => x !== v) })
              }
            />
            <TagPoolEditor
              title="影响因素预设"
              items={settings.presetFactors}
              onAdd={(v) => updateSettings({ presetFactors: [...settings.presetFactors, v] })}
              onRemove={(v) =>
                updateSettings({ presetFactors: settings.presetFactors.filter((x) => x !== v) })
              }
            />
            <TagPoolEditor
              title="占卜方式"
              items={settings.divinationMethods}
              onAdd={(v) => updateSettings({ divinationMethods: [...settings.divinationMethods, v] })}
              onRemove={(v) =>
                updateSettings({
                  divinationMethods: settings.divinationMethods.filter((x) => x !== v),
                })
              }
            />
            <TagPoolEditor
              title="主体分类"
              items={settings.categories}
              onAdd={(v) => updateSettings({ categories: [...settings.categories, v] })}
              onRemove={(v) =>
                updateSettings({ categories: settings.categories.filter((x) => x !== v) })
              }
            />
          </TabsContent>

          {/* 数据 */}
          <TabsContent value="data" className="flex flex-col gap-4 pt-2">
            <p className="text-xs text-muted-foreground">
              当前共有 {entities.length} 个主体、{statusRecords.length + divinationRecords.length} 条记录。
              跨设备建议使用「备份(JSON)」整体迁移，或「CSV」在表格间传输。
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={handleExportJSON}>
                <Download className="size-4" />
                导出备份 (JSON)
              </Button>
              <Button variant="secondary" onClick={() => jsonInput.current?.click()}>
                <Upload className="size-4" />
                导入备份 (JSON)
              </Button>
              <Button variant="secondary" onClick={handleExportCSV}>
                <Download className="size-4" />
                导出 CSV
              </Button>
              <Button variant="secondary" onClick={() => csvInput.current?.click()}>
                <Upload className="size-4" />
                导入 CSV
              </Button>
            </div>
            <input
              ref={jsonInput}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImportJSON(f)
                e.target.value = ''
              }}
            />
            <input
              ref={csvInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImportCSV(f)
                e.target.value = ''
              }}
            />
            <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <p className="mb-2 text-sm text-destructive">危险区</p>
              <Button variant="destructive" onClick={handleReset}>
                <Trash2 className="size-4" />
                清空全部数据
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
