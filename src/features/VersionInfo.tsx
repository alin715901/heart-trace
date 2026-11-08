import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  APP_VERSION,
  BUILD_CODE,
  checkUpdateManual,
  isNativeAndroid,
  showUpdatePrompt,
} from '@/lib/updater'

/** 设置 → 数据：显示当前版本，并可手动检查是否有新版本 */
export function VersionInfo() {
  const [checking, setChecking] = useState(false)

  async function handleCheck() {
    if (checking) return
    setChecking(true)
    try {
      if (!isNativeAndroid()) {
        toast.info(`当前为 v${APP_VERSION}，此版本由你自行部署`)
        return
      }
      const result = await checkUpdateManual()
      if (result.status === 'available') {
        showUpdatePrompt(result.info)
      } else if (result.status === 'latest') {
        toast.success(`已是最新版本 v${APP_VERSION}（构建号 ${BUILD_CODE}）`)
      } else {
        toast.error('检查失败，请检查网络后重试')
      }
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2.5">
      <div>
        <Label>当前版本</Label>
        <p className="text-[11px] text-muted-foreground">
          v{APP_VERSION} · 构建号 {BUILD_CODE}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={handleCheck}
        disabled={checking}
      >
        <RefreshCw className={cn('size-4', checking && 'animate-spin')} />
        {checking ? '检查中…' : '检查版本'}
      </Button>
    </div>
  )
}
