import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore, addEntity, updateEntity, updateSettings } from '@/lib/storage'
import { ENTITY_COLORS } from '@/lib/seed'
import { cn } from '@/lib/utils'
import type { Entity } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TagInput } from '@/components/TagInput'

interface EntityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entity?: Entity | null
}

export function EntityDialog({ open, onOpenChange, entity }: EntityDialogProps) {
  const { entities, settings } = useStore()
  const isEdit = !!entity

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [color, setColor] = useState(ENTITY_COLORS[0])
  const [tags, setTags] = useState<string[]>([])

  const existingTags = useMemo(
    () => Array.from(new Set(entities.flatMap((e) => e.tags))),
    [entities]
  )

  useEffect(() => {
    if (!open) return
    setCustomCategory('')
    if (entity) {
      setName(entity.name)
      setCategory(entity.category)
      setColor(entity.color)
      setTags(entity.tags)
    } else {
      setName('')
      setCategory(settings.categories[0] ?? '')
      setColor(ENTITY_COLORS[entities.length % ENTITY_COLORS.length])
      setTags([])
    }
  }, [open, entity, settings.categories, entities.length])

  function handleAddCategory() {
    const c = customCategory.trim()
    if (!c) {
      setCustomCategory('')
      return
    }
    if (!settings.categories.includes(c)) {
      updateSettings({ categories: [...settings.categories, c] })
    }
    setCategory(c)
    setCustomCategory('')
  }

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (isEdit && entity) {
      updateEntity(entity.id, { name: trimmed, category, color, tags })
    } else {
      addEntity({ name: trimmed, category, color, tags })
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/40">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑主体' : '新建主体'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>名称</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入主体名称"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>分类</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {settings.categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
                {category && !settings.categories.includes(category) && (
                  <SelectItem value={category}>{category}</SelectItem>
                )}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="新增分类，如：梦角 / OC…"
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCategory()
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleAddCategory}
                disabled={!customCategory.trim()}
              >
                <Plus className="size-4" />
                添加
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>标签</Label>
            <TagInput
              options={existingTags}
              value={tags}
              onChange={setTags}
              placeholder="为该主体添加标签…"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>点缀色</Label>
            <div className="flex flex-wrap items-center gap-2">
              {ENTITY_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'size-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition',
                    color === c ? 'ring-foreground' : 'ring-transparent'
                  )}
                  style={{ background: c }}
                  aria-label={`选择颜色 ${c}`}
                />
              ))}
              <label
                className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-border/70 text-muted-foreground transition hover:text-foreground"
                title="自定义颜色"
                style={{ background: color }}
              >
                <span className="text-[10px] leading-none drop-shadow">＋</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              点击色块快速选色，或点「＋」用取色器自定义任意颜色。
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {isEdit ? '保存' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
