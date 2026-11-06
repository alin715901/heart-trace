import { registerPlugin } from '@capacitor/core'

/** 应用版本号（对外展示） */
export const APP_VERSION = '1.0'
/** 当前安装包构建号，由打包流程注入；本地开发回退到 8 */
export const BUILD_CODE = Number(import.meta.env.VITE_BUILD_CODE || 8)
/** 线上版本清单 */
export const VERSION_URL = 'https://alin715901.github.io/heart-trace/version.json'

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
  const cap = (window as unknown as { Capacitor?: CapLike }).Capacitor
  if (!cap) return false
  if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform()
  return cap.getPlatform?.() === 'android'
}

/** 返回可用的新版本信息，没有新版本或网络异常时返回 null */
export async function checkUpdate(): Promise<UpdateInfo | null> {
  if (!isNativeAndroid()) return null
  try {
    const { text } = await ApkUpdater.fetchJson({
      url: VERSION_URL + '?t=' + Date.now(),
    })
    const info = JSON.parse(text) as UpdateInfo
    if (typeof info.code !== 'number' || !info.apkUrl || !info.releaseUrl) return null
    return info.code > BUILD_CODE ? info : null
  } catch {
    return null
  }
}
