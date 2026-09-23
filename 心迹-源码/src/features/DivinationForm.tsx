import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useStore, addDivinationRecord, updateDivinationRecord } from '@/lib/storage'
import { VERIFY_STATUSES, toDatetimeLocal, fromDatetimeLocal } from '@/lib/format'
import type { DivinationRecord } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ImageUploader } from '@/components/ImageUploader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DivinationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  record?: DivinationRecord | null
}

export function DivinationForm({ open, onOpenChange, entityId, record }: DivinationFormProps) {
  const { settings } = useStore()
  const isEdit = !!record

  const [method, setMethod] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [cards, setCards] = useState<string[]>([''])
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState('')
  const [thoughts, setThoughts] = useState('')
  const [verifyStatus, setVerifyStatus] = useState('')
  const [verifyNote, setVerifyNote] = useState('')
  const [recordedAt, setRecordedAt] = useState(toDatetimeLocal(new Date().toISOString()))
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    if (record) {
      setMethod(record.method)
      setUseCustom(!settings.divinationMethods.includes(record.method))
      setCards(record.cards.length ? record.cards : [''])
      setQuestion(record.question)
      setResult(record.result)
      setThoughts(record.thoughts)
      setVerifyStatus(record.verifyStatus)
      setVerifyNote(record.verifyNote)
      setRecordedAt(toDatetimeLocal(record.recordedAt))
      setImages(record.images ?? [])
    } else {
      setMethod(settings.divinationMethods[0] ?? '')
      setUseCustom(false)
      setCards([''])
      setQuestion('')
      setResult('')
      setThoughts('')
      setVerifyStatus('')
      setVerifyNote('')
      setRecordedAt(toDatetimeLocal(new Date().toISOString()))
      setImages([])
    }
  }, [open, record, settings.divinationMethods])

  function setCard(i: number, v: string) {
    setCards((prev) => prev.map((c, idx) => (idx === i ? v : c)))
  }
  function addCard() {
    setCards((prev) => [...prev, ''])
  }
  function removeCard(i: number) {
    setCards((prev) => (prev.length <= 1 ? [''] : prev.filter((_, idx) => idx !== i)))
  }

  function handleSave() {
    const filteredCards = cards.map((c) => c.trim()).filter(Boolean)
    const payload = {
      entityId,
      method: method.trim(),
      cards: filteredCards,
      question: question.trim(),
      result: result.trim(),
      thoughts: settings.fieldToggles.divinationThoughts ? thoughts.trim() : '',
      verifyStatus,
      verifyNote: settings.fieldToggles.divinationVerifyNote ? verifyNote.trim() : '',
      images,
      recordedAt: fromDatetimeLocal(recordedAt),
    }
    if (isEdit && record) updateDivinationRecord(record.id, payload)
    else addDivinationRecord(payload)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[90vh] overflow-y-auto border-border/40">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑占卜记录' : '记一次占卜'}</DialogTitle>
          <DialogDescription>牌面、问题、结果与感想，留待日后回看应验。</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>占卜方式</Label>
              <Select
                value={useCustom ? '__custom__' : method}
                onValueChange={(v) => {
                  if (v === '__custom__') {
                    setUseCustom(true)
                  } else {
                    setUseCustom(false)
                    setMethod(v)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择占卜方式…" />
                </SelectTrigger>
                <SelectContent>
                  {settings.divinationMethods.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">＋ 自定义方式…</SelectItem>
                </SelectContent>
              </Select>
              {useCustom && (
                <Input
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder="输入占卜方式，如：星盘 / 灵摆…"
                />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>时间</Label>
              <input
                type="datetime-local"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>牌面（可多张）</Label>
            <div className="flex flex-col gap-2">
              {cards.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={c}
                    onChange={(e) => setCard(i, e.target.value)}
                    placeholder={`第 ${i + 1} 张`}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeCard(i)}
                    className="shrink-0 text-muted-foreground"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" size="sm" variant="secondary" onClick={addCard} className="w-fit">
                <Plus className="size-4" />
                添加牌面
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>牌面 / 过程图片（选填）</Label>
            <ImageUploader value={images} onChange={setImages} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>问题</Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="你提出的问题…"
              rows={3}
              className="resize-none"
              style={{ fieldSizing: 'fixed' }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>结果</Label>
            <Textarea
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="看到的指示、解读…"
              rows={3}
              className="resize-none"
              style={{ fieldSizing: 'fixed' }}
            />
          </div>

          {settings.fieldToggles.divinationThoughts && (
            <div className="flex flex-col gap-2">
              <Label>感想</Label>
              <Textarea
                value={thoughts}
                onChange={(e) => setThoughts(e.target.value)}
                placeholder="当下的感受与联想…"
                rows={3}
                className="resize-none"
                style={{ fieldSizing: 'fixed' }}
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>应验状态（选填）</Label>
              <Select value={verifyStatus} onValueChange={setVerifyStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="暂不设置" />
                </SelectTrigger>
                <SelectContent>
                  {VERIFY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {settings.fieldToggles.divinationVerifyNote && (
              <div className="flex flex-col gap-2">
                <Label>应验说明（选填）</Label>
                <Input
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
                  placeholder="应验 / 未应验 的情况…"
                />
              </div>
            )}
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
