import { useEffect, useState } from 'react'
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

// 用应用的统一弹窗替代浏览器原生的 window.confirm，
// 通过模块级状态 + 订阅机制，给任意位置提供一个 Promise 化的 confirmDialog()。

type ConfirmState = { open: boolean; message: string }
type Listener = () => void

let state: ConfirmState = { open: false, message: '' }
let resolver: ((value: boolean) => void) | null = null
let listeners: Listener[] = []

function emit() {
  for (const l of listeners) l()
}

/**
 * 统一的「确认 / 取消」弹窗，返回 Promise<boolean>。
 * 替代 window.confirm：避免浏览器系统弹窗，风格与全站 Dialog 一致。
 */
export function confirmDialog(message: string): Promise<boolean> {
  // 若上一次尚未关闭，先以取消收尾，避免弹窗堆叠
  if (resolver) {
    resolver(false)
    resolver = null
  }
  state = { open: true, message }
  emit()
  return new Promise<boolean>((resolve) => {
    resolver = resolve
  })
}

function useConfirmState(): ConfirmState {
  const [s, setS] = useState<ConfirmState>(state)
  useEffect(() => {
    const handler = () => setS(state)
    listeners.push(handler)
    return () => {
      listeners = listeners.filter((l) => l !== handler)
    }
  }, [])
  return s
}

export function ConfirmHost() {
  const s = useConfirmState()

  const settle = (result: boolean) => {
    state = { open: false, message: s.message }
    const r = resolver
    resolver = null
    emit()
    r?.(result)
  }

  return (
    <AlertDialog
      open={s.open}
      onOpenChange={(open) => {
        if (!open) settle(false)
      }}
    >
      <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>请确认</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {s.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>取消</AlertDialogCancel>
          <AlertDialogAction onClick={() => settle(true)}>确定</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
