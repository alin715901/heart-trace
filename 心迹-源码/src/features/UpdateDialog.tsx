import { useEffect, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  ApkUpdater,
  APP_VERSION,
  SHOW_UPDATE_EVENT,
  checkUpdate,
  type ListenerHandle,
  type UpdateInfo,
} from '@/lib/updater'

type Phase = 'idle' | 'prompt' | 'downloading' | 'installing' | 'failed'

function mb(n: number): string {
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}

/**
 * 应用内更新：启动后检查新版本，可选择更新或暂不更新；
 * 更新时保持弹窗打开并显示下载进度，完成后拉起系统安装界面；
 * 失败则给出手动更新入口。
 */
export function UpdateHost() {
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [percent, setPercent] = useState(0)
  const [bytes, setBytes] = useState({ received: 0, total: 0 })
  const [error, setError] = useState('')
  const listener = useRef<ListenerHandle | null>(null)

  useEffect(() => {
    let alive = true
    // 等开屏动画结束后再提示，避免遮住启动画面
    const timer = window.setTimeout(async () => {
      const found = await checkUpdate()
      if (!alive || !found) return
      setInfo(found)
      setPhase('prompt')
    }, 1800)
    return () => {
      alive = false
      window.clearTimeout(timer)
      listener.current?.remove().catch(() => {})
    }
  }, [])

  // 响应「设置 → 数据 → 检查版本」：手动发现新版本时弹出同一个更新窗口
  useEffect(() => {
    const onShow = (e: Event) => {
      const detail = (e as CustomEvent<UpdateInfo>).detail
      if (!detail) return
      setInfo(detail)
      setPhase('prompt')
    }
    window.addEventListener(SHOW_UPDATE_EVENT, onShow)
    return () => window.removeEventListener(SHOW_UPDATE_EVENT, onShow)
  }, [])

  async function startUpdate() {
    if (!info) return
    // 关键：切到下载态后必须让弹窗保持打开，进度条才会显示。
    // 所有按钮都用普通按钮，避免点击时被弹窗组件自动关闭并清空状态。
    setPhase('downloading')
    setPercent(0)
    setBytes({ received: 0, total: 0 })
    setError('')
    try {
      listener.current = await ApkUpdater.addListener('progress', (d) => {
        if (typeof d.percent === 'number' && d.percent >= 0) {
          setPercent(Math.min(100, Math.round(d.percent)))
        }
        if (typeof d.received === 'number' && typeof d.total === 'number') {
          setBytes({ received: d.received, total: d.total })
        }
      })
      const { path } = await ApkUpdater.download({ url: info.apkUrl })
      setPercent(100)
      setPhase('installing')
      await ApkUpdater.install({ path })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('failed')
    } finally {
      await listener.current?.remove().catch(() => {})
      listener.current = null
    }
  }

  function close() {
    setPhase('idle')
    setInfo(null)
    setError('')
  }

  async function manual() {
    if (!info) return
    try {
      await ApkUpdater.openUrl({ url: info.releaseUrl })
    } catch {
      // 打不开时保留链接文字，用户可自行复制
    }
    close()
  }

  if (phase === 'idle' || !info) return null

  const inProgress = phase === 'downloading' || phase === 'installing'
  const known = bytes.total > 0

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        // 仅在「发现新版本」这一步允许被遮罩/返回键关闭（等同暂不更新）；
        // 下载、安装、失败阶段保持弹窗，避免进度条一闪就没了。
        if (!open && phase === 'prompt') close()
      }}
    >
      <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {phase === 'prompt' && '发现新版本'}
            {phase === 'downloading' && '正在下载更新'}
            {phase === 'installing' && '正在安装'}
            {phase === 'failed' && '更新未完成'}
          </AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {phase === 'prompt' &&
              `${info.version === APP_VERSION ? `发现新版本 · 构建号 ${info.code}` : `发现新版本 v${info.version}`}（当前 v${APP_VERSION}）。\n${info.notes || '包含体验优化与问题修复。'}\n更新为覆盖安装，已有记录不会丢失。`}
            {phase === 'downloading' &&
              '正在下载安装包，请保持网络畅通，完成后会弹出系统安装提示。'}
            {phase === 'installing' &&
              '下载完成，已拉起系统安装界面。安装完成后重新打开应用即可，原有记录仍在。'}
            {phase === 'failed' &&
              `自动更新失败${error ? `：${error}` : ''}。可前往发布页手动下载安装包。`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {inProgress && (
          <div className="space-y-2 py-1">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary/15">
              <div
                className={
                  'h-full rounded-full bg-primary transition-all duration-200' +
                  (known || phase === 'installing' ? '' : ' animate-pulse')
                }
                style={{ width: `${phase === 'installing' ? 100 : known ? percent : 15}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {phase === 'installing'
                  ? '下载完成，等待安装…'
                  : known
                    ? `已下载 ${mb(bytes.received)} / ${mb(bytes.total)}`
                    : '正在连接下载…'}
              </span>
              <span className="tabular-nums">
                {phase === 'downloading' && known ? `${percent}%` : ''}
              </span>
            </div>
          </div>
        )}

        {phase === 'failed' && (
          <p className="break-all rounded-md bg-muted p-2 text-xs text-muted-foreground">
            {info.releaseUrl}
          </p>
        )}

        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          {phase === 'prompt' && (
            <>
              <Button type="button" variant="outline" onClick={close}>
                暂不更新
              </Button>
              <Button type="button" onClick={startUpdate}>
                立即更新
              </Button>
            </>
          )}
          {phase === 'downloading' && (
            <Button type="button" variant="outline" disabled className="w-full sm:w-auto">
              下载中…
            </Button>
          )}
          {phase === 'installing' && (
            <Button type="button" onClick={close}>
              知道了
            </Button>
          )}
          {phase === 'failed' && (
            <>
              <Button type="button" variant="outline" onClick={close}>
                稍后再说
              </Button>
              <Button type="button" onClick={manual}>
                前往手动更新
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
