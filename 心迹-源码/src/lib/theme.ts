// 心迹 — 主题系统：预设主题 + 自定义主题
// 所有颜色以 OKLCH 表达，保证不同色相下的明度/饱和度协调一致。

import type { Settings } from './types'

// 已存预设主题的 id 前缀
export const SAVED_PREFIX = 'saved:'

export interface ThemeParams {
  h: number // 主色相（度）
  primC: number // 主色饱和度
  bgL: number // 背景明度
  bgC: number // 背景饱和度
  accC: number // 点缀饱和度
}

// 预设主题：淡雅简约 · 以浅色优雅为主，全部为纯色（无渐变）
export const PRESETS: Record<string, ThemeParams> = {
  paper: { h: 280, primC: 0.10, bgL: 0.965, bgC: 0.006, accC: 0.04 }, // 宣纸白
  dailan: { h: 215, primC: 0.11, bgL: 0.955, bgC: 0.012, accC: 0.05 }, // 黛蓝
  moon: { h: 250, primC: 0.045, bgL: 0.95, bgC: 0.005, accC: 0.03 }, // 月灰
  lotus: { h: 350, primC: 0.09, bgL: 0.965, bgC: 0.008, accC: 0.045 }, // 藕荷
  pine: { h: 160, primC: 0.09, bgL: 0.96, bgC: 0.01, accC: 0.04 }, // 松绿
  ink: { h: 290, primC: 0.05, bgL: 0.18, bgC: 0.012, accC: 0.03 }, // 墨（深色）
}

export const THEME_LIST = [
  { id: 'paper', label: '宣纸白' },
  { id: 'dailan', label: '黛蓝' },
  { id: 'moon', label: '月灰' },
  { id: 'lotus', label: '藕荷' },
  { id: 'pine', label: '松绿' },
  { id: 'ink', label: '墨（深）' },
  { id: 'custom', label: '自定义' },
]

function t(l: number, c: number, h: number, alpha?: number) {
  return alpha == null ? `oklch(${l} ${c} ${h})` : `oklch(${l} ${c} ${h} / ${alpha})`
}

// 由一组参数生成完整配色变量
export function buildThemeVars(p: ThemeParams): Record<string, string> {
  const h = p.h
  const light = p.bgL >= 0.6
  const fg = light ? t(0.24, 0.015, h) : t(0.94, 0.02, h)
  const fgMuted = light ? t(0.5, 0.02, h) : t(0.72, 0.03, h)
  const primaryL = light ? 0.55 : 0.72
  const primaryFg = light ? t(0.99, 0.005, h) : t(p.bgL, p.bgC, h)
  const card = light
    ? t(clamp(p.bgL - 0.02, 0.9, 1), p.bgC + 0.002, h)
    : t(p.bgL + 0.065, p.bgC + 0.005, h)
  const popover = light ? t(0.99, 0.004, h) : t(p.bgL + 0.08, p.bgC + 0.01, h)
  const secondary = light ? t(p.bgL - 0.03, p.bgC, h) : t(p.bgL + 0.14, p.bgC, h)
  const muted = light ? t(p.bgL - 0.045, p.bgC, h) : t(p.bgL + 0.12, p.bgC, h)
  const accent = light ? t(p.bgL - 0.05, p.accC, h) : t(p.bgL + 0.18, p.accC, h)
  const border = light
    ? t(0.5, p.bgC + 0.005, h, 0.26)
    : t(0.42, p.bgC + 0.005, h, 0.45)
  const input = light ? t(p.bgL - 0.03, p.bgC, h) : t(p.bgL + 0.18, p.bgC, h)
  const ring = t(primaryL, p.primC, h)
  const sidebar = light ? t(p.bgL - 0.025, p.bgC, h) : t(p.bgL + 0.03, p.bgC, h)
  const sidebarAccent = light ? t(p.bgL - 0.05, p.bgC, h) : t(p.bgL + 0.12, p.bgC, h)
  const sidebarBorder = light
    ? t(0.5, p.bgC + 0.005, h, 0.2)
    : t(0.42, p.bgC + 0.005, h, 0.35)
  const hero = light
    ? t(p.bgL - 0.04, p.accC + 0.015, h)
    : t(p.bgL + 0.14, p.accC + 0.02, h)
  const heroFg = light ? t(0.24, 0.015, h) : t(0.96, 0.02, h)

  const v: Record<string, string> = {
    '--background': t(p.bgL, p.bgC, h),
    '--foreground': fg,
    '--card': card,
    '--card-foreground': fg,
    '--popover': popover,
    '--popover-foreground': fg,
    '--primary': t(primaryL, p.primC, h),
    '--primary-foreground': primaryFg,
    '--secondary': secondary,
    '--secondary-foreground': fg,
    '--muted': muted,
    '--muted-foreground': fgMuted,
    '--accent': accent,
    '--accent-foreground': fg,
    '--destructive': t(0.6, 0.2, 25),
    '--border': border,
    '--input': input,
    '--ring': ring,
    '--success': t(0.6, 0.14, 155),
    '--success-foreground': primaryFg,
    '--warning': t(0.72, 0.14, 80),
    '--warning-foreground': primaryFg,
    '--info': t(0.58, 0.13, 250),
    '--info-foreground': primaryFg,
    '--theme-red': t(0.6, 0.2, 25),
    '--theme-green': t(0.6, 0.14, 155),
    '--theme-gold': t(0.72, 0.14, 80),
    '--theme-blue': t(0.58, 0.13, 250),
    '--chart-1': t(primaryL, p.primC, h),
    '--chart-2': t(0.6, 0.13, 155),
    '--chart-3': t(0.72, 0.14, 80),
    '--chart-4': t(0.6, 0.2, 25),
    '--chart-5': t(0.58, 0.13, 250),
    '--sidebar': sidebar,
    '--sidebar-foreground': fg,
    '--sidebar-primary': t(primaryL, p.primC, h),
    '--sidebar-primary-foreground': primaryFg,
    '--sidebar-accent': sidebarAccent,
    '--sidebar-accent-foreground': fg,
    '--sidebar-border': sidebarBorder,
    '--sidebar-ring': ring,
    '--hero': hero,
    '--hero-foreground': heroFg,
  }
  return v
}

// ===== 颜色工具：hex -> OKLCH =====
function hexToRgb(hex: string) {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((x) => x + x).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const
}

function srgbToLinear(c: number) {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const [r, g, b] = hexToRgb(hex)
  const rl = srgbToLinear(r)
  const gl = srgbToLinear(g)
  const bl = srgbToLinear(b)
  const l_ = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl
  const m_ = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969563 * bl
  const s_ = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl
  const l = Math.cbrt(l_)
  const m = Math.cbrt(m_)
  const s = Math.cbrt(s_)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.sqrt(a * a + bb * bb)
  let H = (Math.atan2(bb, a) * 180) / Math.PI
  if (H < 0) H += 360
  return { l: L, c: C, h: H }
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x))
}

// 自定义主题：由用户挑选的三色推导出一整套协调配色
export function customToParams(custom: {
  primary: string
  background: string
  accent: string
}): ThemeParams {
  const p = hexToOklch(custom.primary)
  const bg = hexToOklch(custom.background)
  const a = hexToOklch(custom.accent)
  return {
    h: p.h,
    primC: clamp(p.c, 0.06, 0.2),
    bgL: clamp(bg.l, 0.12, 0.97),
    bgC: clamp(bg.c, 0.004, 0.06),
    accC: clamp(a.c, 0.03, 0.14),
  }
}

// 取当前生效的自定义配色（自定义模式或已存预设）
function activeCustom(settings: Settings): { primary: string; background: string; accent: string } | null {
  if (settings.themeId === 'custom') return settings.customTheme || null
  if (settings.themeId?.startsWith(SAVED_PREFIX)) {
    const id = settings.themeId.slice(SAVED_PREFIX.length)
    return settings.savedThemes?.find((t) => t.id === id)?.colors || null
  }
  return null
}

export function resolveThemeVars(settings: Settings): Record<string, string> {
  const custom = activeCustom(settings)
  if (custom) return buildThemeVars(customToParams(custom))
  return buildThemeVars(PRESETS[settings.themeId] || PRESETS.paper)
}

export function isLightTheme(settings: Settings): boolean {
  const custom = activeCustom(settings)
  if (custom) return customToParams(custom).bgL >= 0.6
  return (PRESETS[settings.themeId]?.bgL ?? PRESETS.paper.bgL) >= 0.6
}

// 预设列表 = 内置预设 + 用户已存的自定义预设
export function themeList(settings: Settings) {
  const saved = (settings.savedThemes || []).map((t) => ({
    id: SAVED_PREFIX + t.id,
    label: t.label,
    saved: true,
  }))
  return [...THEME_LIST.map((t) => ({ ...t, saved: false })), ...saved]
}

// 面板不透明度默认值：无背景图时通透，有背景图时加实保证可读
export const DEFAULT_CARD_OPACITY = 78
export const DEFAULT_CARD_OPACITY_WITH_BG = 80

export function cardOpacityValue(settings: Settings): number {
  const raw = settings.cardOpacity
  const fallback = settings.backgroundImage
    ? DEFAULT_CARD_OPACITY_WITH_BG
    : DEFAULT_CARD_OPACITY
  if (typeof raw !== 'number' || Number.isNaN(raw)) return fallback
  return Math.min(100, Math.max(0, Math.round(raw)))
}

// 应用背景图片：有图时给卡片加实，保证文字可读
export function applyBackground(settings: Settings) {
  const root = document.documentElement
  const img = settings.backgroundImage
  const body = document.body
  const alpha = cardOpacityValue(settings)
  root.style.setProperty('--glass-alpha', `${alpha}%`)
  // 越透的卡片，背后模糊越轻，背景图看得越清楚
  root.style.setProperty('--glass-alpha-num', String(alpha / 100))
  if (img) {
    root.dataset.bg = 'true'
    body.style.backgroundImage = `url("${img}")`
    body.style.backgroundSize = 'cover'
    body.style.backgroundPosition = 'center'
    body.style.backgroundAttachment = 'fixed'
    body.style.backgroundRepeat = 'no-repeat'
  } else {
    delete root.dataset.bg
    body.style.backgroundImage = ''
    body.style.backgroundSize = ''
    body.style.backgroundPosition = ''
    body.style.backgroundAttachment = ''
    body.style.backgroundRepeat = ''
  }
}

// 把配色变量写到 <html> 上，全局即时生效
export function applyTheme(settings: Settings) {
  const vars = resolveThemeVars(settings)
  const root = document.documentElement
  for (const [k, val] of Object.entries(vars)) {
    root.style.setProperty(k, val)
  }
  root.style.colorScheme = isLightTheme(settings) ? 'light' : 'dark'
}

export const DEFAULT_CUSTOM_THEME = {
  primary: '#a78bfa',
  background: '#171527',
  accent: '#c4b5fd',
}
