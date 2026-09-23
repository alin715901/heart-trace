import { useEffect, useRef, useState } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface TagInputProps {
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
  allowAdd?: boolean
  placeholder?: string
  /** 单选模式：点击即替换选中项（用于占卜方式这类只能选一个的字段） */
  single?: boolean
  /** 自定义添加的标签写入标签池，下次打开仍在 */
  onAddOption?: (tag: string) => void
  /** 删除标签时同步从标签池移除 */
  onRemoveOption?: (tag: string) => void
}

const LONG_PRESS_MS = 500

// 标签选择器：从预设池点选 + 自定义添加，长按标签可删除
export function TagInput({
  options,
  value,
  onChange,
  allowAdd = true,
  placeholder,
  single = false,
  onAddOption,
  onRemoveOption,
}: TagInputProps) {
  const [draft, setDraft] = useState('')
  const [deleteMode, setDeleteMode] = useState(false)
  const timer = useRef<number | null>(null)
  const longPressed = useRef(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const selected = new Set(value)
  const pool = Array.from(new Set([...options, ...value])).filter(Boolean)

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    []
  )

  // 点击标签区域以外的任何地方，退出「长按删除」状态
  useEffect(() => {
    if (!deleteMode) return
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setDeleteMode(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDeleteMode(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [deleteMode])

  function clearTimer() {
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  function startPress() {
    longPressed.current = false
    clearTimer()
    timer.current = window.setTimeout(() => {
      longPressed.current = true
      setDeleteMode(true)
    }, LONG_PRESS_MS)
  }

  function toggle(tag: string) {
    if (single) {
      onChange(selected.has(tag) ? [] : [tag])
      return
    }
    if (selected.has(tag)) onChange(value.filter((v) => v !== tag))
    else onChange([...value, tag])
  }

  function handleChipClick(tag: string) {
    // 长按触发的是删除模式，不执行选中
    if (longPressed.current) {
      longPressed.current = false
      return
    }
    if (deleteMode) setDeleteMode(false)
    toggle(tag)
  }

  function removeTag(tag: string) {
    onChange(value.filter((v) => v !== tag))
    onRemoveOption?.(tag)
    setDeleteMode(false)
  }

  function addCustom() {
    const t = draft.trim()
    if (!t) return
    if (single) onChange([t])
    else if (!value.includes(t)) onChange([...value, t])
    if (!options.includes(t)) onAddOption?.(t)
    setDraft('')
  }

  return (
    <div ref={wrapRef} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {pool.map((tag) => {
          const on = selected.has(tag)
          return (
            <span key={tag} className="relative">
              <button
                type="button"
                onPointerDown={startPress}
                onPointerUp={clearTimer}
                onPointerLeave={clearTimer}
                onPointerCancel={clearTimer}
                onContextMenu={(e) => e.preventDefault()}
                onClick={() => handleChipClick(tag)}
                className={cn(
                  'inline-flex touch-manipulation select-none items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors',
                  on
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:bg-accent'
                )}
              >
                {on && <Check className="size-3" />}
                {tag}
              </button>
              {deleteMode && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground"
                  aria-label={`删除标签 ${tag}`}
                >
                  <X className="size-2.5" />
                </button>
              )}
            </span>
          )
        })}
        {pool.length === 0 && (
          <span className="text-xs text-muted-foreground">暂无可选项，可在下方添加</span>
        )}
      </div>
      {allowAdd && (
        <>
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
          <p className="text-[11px] text-muted-foreground">长按标签可删除</p>
        </>
      )}
    </div>
  )
}
