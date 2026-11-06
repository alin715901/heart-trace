import { registerPlugin } from '@capacitor/core'

/** 应用版本号（对外展示），由打包流程注入；本地开发回退到 1.0 */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0'
/** 当前安装包构建号，由打包流程注入；本地开发回退到 8 */
export const BUILD_CODE = Number(import.meta.env.VITE_BUILD_CODE || 8)
/** 线上版本清单 */
export const VERSION_URL = 'https://alin715901.github.io/heart-trace/version.json'
/** 手动检查到新版本后，通知全局弹窗展示 */
export const SHOW_UPDATE_EVENT = 'xinji-show-update'

export interface ListenerHandle {
  remove: () => Promise<void>
}

export interface UpdateInfo {
  version: string
  code: number
  apkUrl: string
  releaseUrl: string
  notes?: string
}

/** 由安卓端注入的原生能力：绕过跨域读取版本、下载安装包、拉起系统安装界面 */
export interface ApkUpdaterPlugin {
  fetchJson(options: { url: string }): Promise<{ text: string }>
  download(options: { url: string }): Promise<{ path: string }>
  install(options: { path: string }): Promise<void>
  openUrl(options: { url: string }): Promise<void>
  addListener(
    eventName: 'progress',
    listenerFunc: (data: { percent: number; received: number; total: number }) => void,
  ): Promise<ListenerHandle>
}

export const ApkUpdater = registerPlugin<ApkUpdaterPlugin>('ApkUpdater')

type CapLike = {
  isNativePlatform?: () => boolean
  getPlatform?: () => string
}

/** 仅在安卓应用内启用更新能力；普通网页不检查、不弹窗 */
export function isNativeAndroid(): boolean {
  const w = window as unknown as {
    Capacitor?: CapLike
    __CAPACITOR__?: unknown
  }
  const cap = w.Capacitor
  if (cap) {
    if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform()
    if (typeof cap.getPlatform === 'function') return cap.getPlatform() === 'android'
  }
  return !!w.__CAPACITOR__
}

/** 读取线上版本清单（仅原生环境可用） */
async function readRemoteInfo(): Promise<UpdateInfo | null> {
  const { text } = await ApkUpdater.fetchJson({
    url: VERSION_URL + '?t=' + Date.now(),
  })
  const info = JSON.parse(text) as UpdateInfo
  if (typeof info.code !== 'number' || !info.apkUrl || !info.releaseUrl) return null
  return info
}

/** 启动时的自动检查：没有新版本或网络异常都静默跳过 */
export async function checkUpdate(): Promise<UpdateInfo | null> {
  if (!isNativeAndroid()) return null
  try {
    const info = await readRemoteInfo()
    return info && info.code > BUILD_CODE ? info : null
  } catch {
    return null
  }
}

export type ManualCheckResult =
  | { status: 'available'; info: UpdateInfo }
  | { status: 'latest' }
  | { status: 'error'; message: string }

/** 手动检查版本：区分「有更新 / 已是最新 / 检查失败」，便于给出明确反馈 */
export async function checkUpdateManual(): Promise<ManualCheckResult> {
  try {
    const info = await readRemoteInfo()
    if (!info) return { status: 'error', message: '版本信息格式不正确' }
    return info.code > BUILD_CODE
      ? { status: 'available', info }
      : { status: 'latest' }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : '网络异常' }
  }
}

/** 通知全局更新弹窗展示指定版本 */
export function showUpdatePrompt(info: UpdateInfo) {
  window.dispatchEvent(new CustomEvent<UpdateInfo>(SHOW_UPDATE_EVENT, { detail: info }))
}
