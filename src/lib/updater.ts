import { registerPlugin } from '@capacitor/core'

/** 应用版本号（对外展示），可通过 .env 的 VITE_APP_VERSION 修改 */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.2.2'
/** 版本序号，仅自建安装包更新时需要，可通过 VITE_BUILD_CODE 修改 */
export const BUILD_CODE = Number(import.meta.env.VITE_BUILD_CODE || 1)
/**
 * 应用内更新源（仅自建安卓安装包时才需要）。
 * 默认留空 = 关闭更新检查，不会连接任何外部地址。
 * 若你自行发布安装包，在 .env 中设置 VITE_VERSION_URL 指向自己的版本清单即可。
 */
export const VERSION_URL = import.meta.env.VITE_VERSION_URL || ''
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

/** 读取线上版本清单（仅原生环境可用，且必须自行配置更新源） */
async function readRemoteInfo(): Promise<UpdateInfo | null> {
  if (!VERSION_URL) return null
  const { text } = await ApkUpdater.fetchJson({
    url: VERSION_URL + '?t=' + Date.now(),
  })
  const info = JSON.parse(text) as UpdateInfo
  if (typeof info.code !== 'number' || !info.apkUrl || !info.releaseUrl) return null
  return info
}

/** 启动时的自动检查：未配置更新源、没有新版本或网络异常都静默跳过 */
export async function checkUpdate(): Promise<UpdateInfo | null> {
  if (!VERSION_URL || !isNativeAndroid()) return null
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
  // 未配置自建更新源时，直接视为已是最新，不联网也不报错
  if (!VERSION_URL) return { status: 'latest' }
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
