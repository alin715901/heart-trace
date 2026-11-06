import { useEffect, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
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

/**
 * 应用内更新：启动后检查新版本，可选择更新或暂不更新；
 * 更新时在应用内下载并显示进度，完成后拉起系统安装界面；
 * 失败则给出手动更新入口。
 */
export function UpdateHost() {
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [percent, setPercent] = useState(0)
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
    setPhase('downloading')
    setPercent(0)
    setError('')
    try {
      listener.current = await ApkUpdater.addListener('progress', (d) => {
        if (typeof d.percent === 'number' && d.percent >= 0) {
          setPercent(Math.min(100, Math.round(d.percent)))
        }
      })
      const { path } = await ApkUpdater.download({ url: info.apkUrl })
      setPercent(100)
      await ApkUpdater.install({ path })
      setPhase('installing')
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

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
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
              `发现新版本 v${info.version}（当前 v${APP_VERSION}）。\n${info.notes || '包含体验优化与问题修复。'}\n更新为覆盖安装，已有记录不会丢失。`}
            {phase === 'downloading' &&
              '请在下载完成后按系统提示安装，期间请保持网络畅通。'}
            {phase === 'installing' &&
              '已拉起安装界面。安装完成后重新打开应用即可，原有记录仍在。'}
            {phase === 'failed' &&
              `自动更新失败${error ? `：${error}` : ''}。可前往发布页手动下载安装包。`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {phase === 'downloading' && (
          <div className="space-y-2 py-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-primary/15">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-right text-xs text-muted-foreground">{percent}%</p>
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
              <AlertDialogCancel onClick={close}>暂不更新</AlertDialogCancel>
              <AlertDialogAction onClick={startUpdate}>立即更新</AlertDialogAction>
            </>
          )}
          {phase === 'downloading' && (
            <Button variant="outline" disabled className="w-full sm:w-auto">
              下载中…
            </Button>
          )}
          {phase === 'installing' && (
            <AlertDialogAction onClick={close}>知道了</AlertDialogAction>
          )}
          {phase === 'failed' && (
            <>
              <AlertDialogCancel onClick={close}>稍后再说</AlertDialogCancel>
              <AlertDialogAction onClick={manual}>前往手动更新</AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
