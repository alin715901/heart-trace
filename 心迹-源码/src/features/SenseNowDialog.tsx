import { useEffect, useState } from 'react'
import { Waves, RefreshCw } from 'lucide-react'
import { rollPerception, perceptionVisual, type Perception } from '@/lib/perception'
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
            <SenseItem label="在场感" value={result?.presence} />
            <SenseItem label="情绪" value={result?.emotion} />
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
