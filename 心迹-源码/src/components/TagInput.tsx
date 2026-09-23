import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface TagInputProps {
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
  allowAdd?: boolean
  placeholder?: string
}

// 标签选择器：从预设池点选 + 自定义添加，支持移除
export function TagInput({
  options,
  value,
  onChange,
  allowAdd = true,
  placeholder,
}: TagInputProps) {
  const [draft, setDraft] = useState('')
  const selected = new Set(value)
  const pool = Array.from(new Set([...options, ...value])).filter(Boolean)

  function toggle(tag: string) {
    if (selected.has(tag)) onChange(value.filter((v) => v !== tag))
    else onChange([...value, tag])
  }

  function addCustom() {
    const t = draft.trim()
    if (!t) return
    if (!value.includes(t)) onChange([...value, t])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {pool.map((tag) => {
          const on = selected.has(tag)
          return (
            <button
              type="button"
              key={tag}
              onClick={() => toggle(tag)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors',
                on
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
              )}
            >
              {on && <Check className="size-3" />}
              {tag}
            </button>
          )
        })}
        {pool.length === 0 && (
          <span className="text-xs text-muted-foreground">暂无可选标签，可点击下方添加</span>
        )}
      </div>
      {allowAdd && (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder ?? '自定义标签…'}
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustom()
              }
            }}
          />
          <Button type="button" size="sm" variant="secondary" onClick={addCustom}>
            <Plus className="size-4" />
            添加
          </Button>
        </div>
      )}
    </div>
  )
}
