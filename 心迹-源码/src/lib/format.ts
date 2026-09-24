import type { Level } from './types'

export const LEVELS: Level[] = ['强', '中', '弱', '断连']

// 每个等级的强弱分值（用于趋势图连线）与配色（随主题自适应）
export const levelMeta: Record<
  Level,
  { score: number; tone: 'green' | 'blue' | 'gold' | 'red'; color: string }
> = {
  强: { score: 3, tone: 'green', color: 'var(--theme-green)' },
  中: { score: 2, tone: 'blue', color: 'var(--theme-blue)' },
  弱: { score: 1, tone: 'gold', color: 'var(--theme-gold)' },
  断连: { score: 0, tone: 'red', color: 'var(--theme-red)' },
}

export const VERIFY_STATUSES = ['暂不设置', '待验证', '已应验', '未应验', '部分应验', '说不清']

export const verifyMeta: Record<
  string,
  { tone: 'blue' | 'green' | 'red' | 'gold' | 'neutral' }
> = {
  待验证: { tone: 'blue' },
  已应验: { tone: 'green' },
  未应验: { tone: 'red' },
  部分应验: { tone: 'gold' },
  说不清: { tone: 'neutral' },
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`
}

export function fromDatetimeLocal(v: string): string {
  const d = new Date(v)
  if (isNaN(d.getTime())) return new Date().toISOString()
  return d.toISOString()
}
