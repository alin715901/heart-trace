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

// ===== 多选一弹窗（用于导入时的「合并 / 覆盖」等选择） =====

export type ChoiceOption = { value: string; label: string; destructive?: boolean }

type ChoiceState = { open: boolean; title: string; message: string; options: ChoiceOption[] }
type ChoiceListener = () => void

let choiceState: ChoiceState = { open: false, title: '请选择', message: '', options: [] }
let choiceResolver: ((value: string | null) => void) | null = null
let choiceListeners: ChoiceListener[] = []

function emitChoice() {
  for (const l of choiceListeners) l()
}

/**
 * 统一的多选一弹窗，返回选中的 value，取消/关闭返回 null。
 * 用于导入数据时让用户选择「合并当前数据 / 覆盖当前数据」。
 */
export function choiceDialog(
  message: string,
  options: ChoiceOption[],
  title = '请选择'
): Promise<string | null> {
  // 若上一次尚未关闭，先以取消收尾，避免弹窗堆叠
  if (choiceResolver) {
    choiceResolver(null)
    choiceResolver = null
  }
  choiceState = { open: true, title, message, options }
  emitChoice()
  return new Promise<string | null>((resolve) => {
    choiceResolver = resolve
  })
}

function useChoiceState(): ChoiceState {
  const [s, setS] = useState<ChoiceState>(choiceState)
  useEffect(() => {
    const handler = () => setS(choiceState)
    choiceListeners.push(handler)
    return () => {
      choiceListeners = choiceListeners.filter((l) => l !== handler)
    }
  }, [])
  return s
}

export function ChoiceHost() {
  const s = useChoiceState()

  const settle = (value: string | null) => {
    choiceState = { open: false, title: s.title, message: s.message, options: s.options }
    const r = choiceResolver
    choiceResolver = null
    emitChoice()
    r?.(value)
  }

  return (
    <AlertDialog
      open={s.open}
      onOpenChange={(open) => {
        if (!open) settle(null)
      }}
    >
      <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{s.title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {s.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel onClick={() => settle(null)}>取消</AlertDialogCancel>
          {s.options.map((o) => (
            <AlertDialogAction
              key={o.value}
              onClick={() => settle(o.value)}
              className={o.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            >
              {o.label}
            </AlertDialogAction>
          ))}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
