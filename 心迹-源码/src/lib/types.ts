// 心迹 — 核心数据类型定义

export type Level = '强' | '中' | '弱' | '断连'

export interface Entity {
  id: string
  name: string
  category: string
  tags: string[]
  color: string // 该主体在界面中的点缀色
  createdAt: string
  updatedAt: string
}

export interface StatusRecord {
  id: string
  entityId: string
  level: Level
  descTags: string[] // 可扩展描述标签
  freeText: string // 自由补充文字
  factorsPreset: string[] // 预设影响因素
  factorsCustom: string[] // 自定义影响因素
  factorFree: string // 影响因素自由补充
  recordedAt: string // 状态发生时间（可补记）
  isBackfill: boolean // 是否补记
  images: string[] // 图片（data URL，仅本地保存）
  createdAt: string
}

export interface DivinationRecord {
  id: string
  entityId: string
  method: string // 占卜方式
  cards: string[] // 牌面（可多张）
  question: string
  result: string
  thoughts: string
  verifyStatus: string // 应验状态（选填）
  verifyNote: string // 应验说明（选填）
  images: string[] // 图片（data URL，仅本地保存）
  recordedAt: string
  createdAt: string
}

export interface FieldToggles {
  statusFreeText: boolean
  statusFactorFree: boolean
  divinationThoughts: boolean
  divinationVerifyNote: boolean
  entityTags: boolean
}

export interface CustomTheme {
  primary: string // 主色（hex）
  background: string // 背景色（hex）
  accent: string // 点缀色（hex）
}

export interface Settings {
  statusDescTags: string[]
  presetFactors: string[]
  divinationMethods: string[]
  categories: string[]
  fieldToggles: FieldToggles
  themeId: string // 当前主题：预设 id 或 'custom'
  customTheme?: CustomTheme // 自定义主题配色
}

export interface DataState {
  entities: Entity[]
  statusRecords: StatusRecord[]
  divinationRecords: DivinationRecord[]
  settings: Settings
  activeEntityId: string | null
}
