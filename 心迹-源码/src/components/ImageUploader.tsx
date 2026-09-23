import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { fileToStoredImage } from '@/lib/image'

interface ImageUploaderProps {
  value: string[]
  onChange: (v: string[]) => void
  max?: number
}

export function ImageUploader({ value, onChange, max = 6 }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    setErr('')
    const next = [...value]
    try {
      for (const f of Array.from(files)) {
        if (next.length >= max) {
          setErr(`最多 ${max} 张`)
          break
        }
        const url = await fileToStoredImage(f)
        next.push(url)
      }
      onChange(next)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '图片处理失败')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((src, i) => (
          <div
            key={i}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border/60 bg-black/20"
          >
            <a href={src} target="_blank" rel="noreferrer">
              <img src={src} alt="" className="h-full w-full object-cover" />
            </a>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="移除图片"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border/60 text-muted-foreground transition-colors hover:bg-accent/40 disabled:opacity-50"
          >
            <ImagePlus className="size-5" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <p className="text-[11px] text-muted-foreground">
        {busy ? '处理中…' : err || `可上传最多 ${max} 张，自动压缩以节省空间（仅存于本设备）`}
      </p>
    </div>
  )
}
