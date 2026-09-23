import { useRef, useState } from 'react'
import {
  X,
  Plus,
  Download,
  Upload,
  Trash2,
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
import {
  PRESETS,
  buildThemeVars,
  customToParams,
  themeList,
  cardOpacityValue,
  DEFAULT_CUSTOM_THEME,
} from '@/lib/theme'
import { fileToStoredImage } from '@/lib/image'
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

function ThemePanel() {
  const { settings } = useStore()
  const themeId = settings.themeId || 'paper'
  const custom = settings.customTheme || DEFAULT_CUSTOM_THEME
  const bgInput = useRef<HTMLInputElement>(null)
  const [presetName, setPresetName] = useState('')

  const savedThemes = settings.savedThemes || []
  const list = themeList(settings)
  const opacity = cardOpacityValue(settings)

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

  // 把当前自定义配色另存为一个预设主题
  function saveAsPreset() {
    const name = presetName.trim() || `我的主题 ${savedThemes.length + 1}`
    const id = `t${Date.now().toString(36)}`
    const next = [...savedThemes, { id, label: name, colors: { ...custom } }]
    updateSettings({ savedThemes: next, themeId: `saved:${id}` })
    setPresetName('')
    toast.success(`已存为预设「${name}」`)
  }

  function deletePreset(id: string) {
    const target = savedThemes.find((t) => t.id === id)
    if (!target) return
    if (!window.confirm(`确定删除预设「${target.label}」吗？`)) return
    const next = savedThemes.filter((t) => t.id !== id)
    updateSettings({
      savedThemes: next,
      themeId: themeId === `saved:${id}` ? 'paper' : themeId,
    })
  }

  async function handleBgUpload(file: File | undefined) {
    if (!file) return
    try {
      const data = await fileToStoredImage(file, 1920, 0.85)
      updateSettings({ backgroundImage: data })
      toast.success('背景图片已应用')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '图片处理失败')
    }
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      <p className="text-xs text-muted-foreground">
        选择一套预设主题，或切换到「自定义」自由调配主色、背景与点缀色。改动会即时在整个界面生效。
      </p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {list.map((t) => {
          const active = themeId === t.id
          const savedColors = savedThemes.find((s) => `saved:${s.id}` === t.id)?.colors
          let swatch: string
          if (t.saved) {
            swatch = savedColors
              ? buildThemeVars(customToParams(savedColors))['--primary']
              : 'var(--primary)'
          } else if (t.id === 'custom') {
            swatch = 'conic-gradient(from 180deg, #a78bfa, #7dd3fc, #fcd34d, #f0abfc, #a78bfa)'
          } else {
            swatch = buildThemeVars(PRESETS[t.id])['--primary']
          }
          return (
            <div
              key={t.id}
              className={
                'relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ' +
                (active
                  ? 'border-primary bg-primary/10'
                  : 'border-border/50 hover:border-primary/50 hover:bg-accent/40')
              }
            >
              <button
                type="button"
                onClick={() => selectPreset(t.id)}
                className="flex w-full flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    'size-8 rounded-full ring-2 ring-offset-2 ring-offset-background transition',
                    active ? 'ring-primary' : 'ring-transparent'
                  )}
                  style={{ background: swatch }}
                />
                <span className="max-w-full truncate text-[11px] text-foreground">{t.label}</span>
              </button>
              {t.saved && (
                <button
                  type="button"
                  onClick={() => deletePreset(t.id.slice('saved:'.length))}
                  className="absolute right-1 top-1 rounded-full p-0.5 text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive"
                  aria-label={`删除预设 ${t.label}`}
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
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
          <div className="flex gap-2 border-t border-border/40 pt-3">
            <Input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="预设名称（可留空）"
              className="h-8 text-sm"
            />
            <Button type="button" size="sm" variant="secondary" onClick={saveAsPreset}>
              <Plus className="size-4" />
              存为预设
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-border/50 p-4">
        <div>
          <Label>背景图片</Label>
          <p className="text-[11px] text-muted-foreground">
            上传一张图片作为整体背景；卡片会自动加实，保证文字清晰。
          </p>
        </div>
        {settings.backgroundImage && (
          <img
            src={settings.backgroundImage}
            alt="背景预览"
            className="h-24 w-full rounded-lg object-cover"
          />
        )}
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => bgInput.current?.click()}>
            <Upload className="size-4" />
            {settings.backgroundImage ? '更换图片' : '上传图片'}
          </Button>
          {settings.backgroundImage && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => updateSettings({ backgroundImage: undefined })}
            >
              <Trash2 className="size-4" />
              移除
            </Button>
          )}
        </div>
        <input
          ref={bgInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            handleBgUpload(f)
            e.target.value = ''
          }}
        />
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border/50 p-4">
        <div className="flex items-center justify-between">
          <Label>记录卡片透明度</Label>
          <span className="font-mono text-[11px] text-muted-foreground">{opacity}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={opacity}
          onChange={(e) => updateSettings({ cardOpacity: Number(e.target.value) })}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-[var(--primary)] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
        />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">数值越低，背景图越明显</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="shrink-0 text-[11px]"
            onClick={() => updateSettings({ cardOpacity: undefined })}
          >
            恢复默认
          </Button>
        </div>
      </div>
    </div>
  )
}

const TOGGLE_FIELDS: { key: keyof FieldToggles; label: string; hint: string }[] = [
  { key: 'statusFreeText', label: '状态 · 自由补充', hint: '状态记录中的自由文字框' },
  { key: 'statusFactorFree', label: '状态 · 影响因素自由补充', hint: '不便标签化的影响因素' },
  { key: 'divinationThoughts', label: '占卜 · 感想', hint: '占卜记录中的感想栏' },
  { key: 'divinationVerifyNote', label: '占卜 · 应验说明', hint: '应验情况的补充说明' },
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
          <DialogDescription>管理外观主题、字段开关与数据</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="appearance">
              <Palette className="mr-1 size-3.5" />
              外观
            </TabsTrigger>
            <TabsTrigger value="fields">
              <SlidersHorizontal className="mr-1 size-3.5" />
              字段
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
