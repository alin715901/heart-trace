import { useEffect, useState } from 'react'
import { useStore, addStatusRecord, updateStatusRecord } from '@/lib/storage'
import { LEVELS, levelMeta, toDatetimeLocal, fromDatetimeLocal } from '@/lib/format'
import type { Level, StatusRecord } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { TagInput } from '@/components/TagInput'
import { ImageUploader } from '@/components/ImageUploader'

interface StatusFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  record?: StatusRecord | null
}

export function StatusForm({ open, onOpenChange, entityId, record }: StatusFormProps) {
  const { settings } = useStore()
  const isEdit = !!record

  const [level, setLevel] = useState<Level>('中')
  const [descTags, setDescTags] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')
  const [factors, setFactors] = useState<string[]>([])
  const [factorFree, setFactorFree] = useState('')
  const [recordedAt, setRecordedAt] = useState(toDatetimeLocal(new Date().toISOString()))
  const [isBackfill, setIsBackfill] = useState(false)
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    if (record) {
      setLevel(record.level)
      setDescTags(record.descTags)
      setFreeText(record.freeText)
      setFactors([...record.factorsPreset, ...record.factorsCustom])
      setFactorFree(record.factorFree)
      setRecordedAt(toDatetimeLocal(record.recordedAt))
      setIsBackfill(record.isBackfill)
      setImages(record.images ?? [])
    } else {
      setLevel('中')
      setDescTags([])
      setFreeText('')
      setFactors([])
      setFactorFree('')
      setRecordedAt(toDatetimeLocal(new Date().toISOString()))
      setIsBackfill(false)
      setImages([])
    }
  }, [open, record])

  function handleSave() {
    const factorSet = factors.filter(Boolean)
    const factorsPreset = factorSet.filter((f) => settings.presetFactors.includes(f))
    const factorsCustom = factorSet.filter((f) => !settings.presetFactors.includes(f))
    const payload = {
      entityId,
      level,
      descTags: descTags.filter(Boolean),
      freeText: settings.fieldToggles.statusFreeText ? freeText : '',
      factorsPreset,
      factorsCustom,
      factorFree: settings.fieldToggles.statusFactorFree ? factorFree : '',
      recordedAt: fromDatetimeLocal(recordedAt),
      isBackfill,
      images,
    }
    if (isEdit && record) updateStatusRecord(record.id, payload)
    else addStatusRecord(payload)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[90vh] overflow-y-auto border-border/40">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑状态记录' : '记一个状态'}</DialogTitle>
          <DialogDescription>记录此刻与这个主体的链接强弱与影响因素。</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>状态核心等级</Label>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((lv) => (
                <button
                  type="button"
                  key={lv}
                  onClick={() => setLevel(lv)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-sm transition-colors',
                    level === lv ? 'border-transparent' : 'border-border hover:bg-accent/60'
                  )}
                  style={
                    level === lv
                      ? {
                          color: `var(--theme-${levelMeta[lv].tone})`,
                          background: `color-mix(in oklab, var(--theme-${levelMeta[lv].tone}) 16%, transparent)`,
                          borderColor: `color-mix(in oklab, var(--theme-${levelMeta[lv].tone}) 40%, transparent)`,
                        }
                      : undefined
                  }
                >
                  {lv}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>描述标签</Label>
            <TagInput
              options={settings.statusDescTags}
              value={descTags}
              onChange={setDescTags}
              placeholder="补充描述，如：喜悦、焦虑…"
            />
          </div>

          {settings.fieldToggles.statusFreeText && (
            <div className="flex flex-col gap-2">
              <Label>自由补充</Label>
              <Textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="任何想记录的文字…"
                rows={3}
                className="resize-none"
                style={{ fieldSizing: 'fixed' }}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>影响因素</Label>
            <TagInput
              options={settings.presetFactors}
              value={factors}
              onChange={setFactors}
              placeholder="选择或自定义影响因素…"
            />
          </div>

          {settings.fieldToggles.statusFactorFree && (
            <div className="flex flex-col gap-2">
              <Label>影响因素 · 自由补充</Label>
              <Textarea
                value={factorFree}
                onChange={(e) => setFactorFree(e.target.value)}
                placeholder="不便用标签概括的影响因素…"
                rows={3}
                className="resize-none"
                style={{ fieldSizing: 'fixed' }}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>图片（选填）</Label>
            <ImageUploader value={images} onChange={setImages} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>发生时间</Label>
              <input
                type="datetime-local"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [color-scheme:dark]"
              />
            </div>
            <div className="flex items-end justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
              <div className="flex flex-col">
                <Label className="mb-0.5">这是补记</Label>
                <span className="text-[11px] text-muted-foreground">非当下记录，回溯补填</span>
              </div>
              <Switch checked={isBackfill} onCheckedChange={setIsBackfill} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
