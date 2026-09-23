import { useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ViewerImage {
  src: string
  caption?: string
}

interface ImageViewerProps {
  images: ViewerImage[]
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
}

// 全屏图片查看器：可左右切换、Esc 关闭、点击背景关闭
export function ImageViewer({ images, index, onIndexChange, onClose }: ImageViewerProps) {
  const total = images.length
  const current = images[index]

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onIndexChange((index - 1 + total) % total)
      if (e.key === 'ArrowRight') onIndexChange((index + 1) % total)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [index, total, onIndexChange, onClose])

  if (!current) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="图片查看"
    >
      <Button
        size="icon"
        variant="ghost"
        onClick={onClose}
        className="absolute right-4 top-4 text-white/80 hover:bg-white/10 hover:text-white"
        aria-label="关闭"
      >
        <X className="size-5" />
      </Button>

      {total > 1 && (
        <div className="absolute left-1/2 top-5 -translate-x-1/2 text-xs text-white/70">
          {index + 1} / {total}
        </div>
      )}

      {total > 1 && (
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            onIndexChange((index - 1 + total) % total)
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="上一张"
        >
          <ChevronLeft className="size-6" />
        </Button>
      )}

      <img
        src={current.src}
        alt={current.caption ?? ''}
        className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      />

      {current.caption && (
        <p className="mt-3 max-w-lg text-center text-xs text-white/70">{current.caption}</p>
      )}

      {total > 1 && (
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation()
            onIndexChange((index + 1) % total)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="下一张"
        >
          <ChevronRight className="size-6" />
        </Button>
      )}
    </div>
  )
}
