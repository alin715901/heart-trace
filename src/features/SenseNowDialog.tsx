import { useEffect, useState } from 'react'
import { Waves, RefreshCw, MoreHorizontal } from 'lucide-react'
import {
  rollPerception,
  perceptionVisual,
  SPACE_OPTIONS,
  PRESENCE_OPTIONS,
  EMOTION_OPTIONS,
  type Perception,
} from '@/lib/perception'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RippleRadar } from '@/components/RippleRadar'

interface SenseNowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SenseNowDialog({ open, onOpenChange }: SenseNowDialogProps) {
  const [result, setResult] = useState<Perception | null>(null)
  const [rolling, setRolling] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  function roll() {
    setRolling(true)
    setResult(rollPerception())
    // 短暂停顿，营造「感知凝聚」的仪式感
    window.setTimeout(() => setRolling(false), 420)
  }

  useEffect(() => {
    if (open) {
      setResult(null)
      roll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const visual = result ? perceptionVisual(result) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/40 sm:max-w-md">
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          className="absolute right-12 top-4 rounded-sm p-0.5 text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
          aria-label="说明"
          title="说明"
        >
          <MoreHorizontal className="size-4" />
        </button>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Waves className="size-4 text-primary" />
            感知此刻
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-2">
          <div
            className="relative flex h-64 items-center justify-center transition-opacity duration-300"
            style={{ opacity: rolling ? 0.35 : 1 }}
          >
            {visual ? (
              <RippleRadar
                distance={visual.distance}
                density={visual.density}
                jitter={visual.jitter}
                intensity={visual.intensity}
                turbulence={visual.turbulence}
                dots={visual.dots}
                size={240}
              />
            ) : (
              <div className="h-40 w-40 rounded-full border border-dashed border-border/50" />
            )}
          </div>

          <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-3">
            <SenseItem label="空间感" value={result?.space} />
            <SenseItem label="存在感" value={result?.presence} />
            <SenseItem label="情绪状态" value={result?.emotion} />
          </div>
        </div>

        <div className="flex justify-center gap-2">
          <Button variant="secondary" onClick={roll} disabled={rolling}>
            <RefreshCw className={'size-4' + (rolling ? ' animate-spin' : '')} />
            再感知一次
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            收起
          </Button>
        </div>
        <SenseInfoDialog open={infoOpen} onOpenChange={setInfoOpen} />
      </DialogContent>
    </Dialog>
  )
}

const INFO_GROUPS = [
  { title: '空间感', hint: '此刻彼此的距离与状态', items: SPACE_OPTIONS },
  { title: '存在感', hint: '此刻周围有多少「人」', items: PRESENCE_OPTIONS },
  { title: '情绪状态', hint: '此刻情绪的强弱与起伏', items: EMOTION_OPTIONS },
]

function SenseInfoDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-h-[85vh] overflow-y-auto border-border/40 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>说明</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {INFO_GROUPS.map((g) => (
            <div key={g.title} className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-foreground">{g.title}</span>
                <span className="text-[11px] text-muted-foreground">{g.hint}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="pt-1 text-center text-[11px] text-muted-foreground">
          仅供参考，请注意辨别。
        </p>
      </DialogContent>
    </Dialog>
  )
}

function SenseItem({ label, value }: { label: string; value?: string }) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-xl border border-border/50 px-3 py-2.5"
      style={{ background: 'color-mix(in oklab, var(--entity-accent) 8%, transparent)' }}
    >
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        className="font-serif-x text-base font-semibold text-foreground transition-opacity"
        style={{ opacity: value ? 1 : 0.4 }}
      >
        {value ?? '感知中…'}
      </span>
    </div>
  )
}
