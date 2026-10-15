import { useSyncExternalStore } from 'react'
import type {
  DataState,
  DivinationRecord,
  Entity,
  FieldToggles,
  Settings,
  StatusRecord,
} from './types'
import { defaultSettings } from './seed'

const KEY = 'xinji-data-v1'

function blankState(): DataState {
  return {
    entities: [],
    statusRecords: [],
    divinationRecords: [],
    settings: defaultSettings(),
    activeEntityId: null,
  }
}

function load(): DataState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return blankState()
    const parsed = JSON.parse(raw)
    const base = blankState()
    const parsedSettings = parsed.settings || {}
    const settings: Settings = {
      ...base.settings,
      ...parsedSettings,
      fieldToggles: { ...base.settings.fieldToggles, ...(parsedSettings.fieldToggles || {}) },
      savedThemes: Array.isArray(parsedSettings.savedThemes)
        ? (parsedSettings as any).savedThemes
        : base.settings.savedThemes,
    }
    // 预设标签迁移：删除“痒”，将“灵觉”重命名为“灵知”
    if (Array.isArray(settings.sensationFeelingOptions)) {
      settings.sensationFeelingOptions = settings.sensationFeelingOptions.filter((t) => t !== '痒')
    }
    if (Array.isArray(settings.perceptionOptions)) {
      settings.perceptionOptions = settings.perceptionOptions.map((t) =>
        t === '灵觉' ? '灵知' : t
      )
    }
    return {
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      statusRecords: (Array.isArray(parsed.statusRecords) ? parsed.statusRecords : []).map(
        (r: any) => ({ ...r, images: Array.isArray(r.images) ? r.images : [] })
      ),
      divinationRecords: (Array.isArray(parsed.divinationRecords) ? parsed.divinationRecords : []).map(
        (r: any) => ({ ...r, images: Array.isArray(r.images) ? r.images : [] })
      ),
      settings,
      activeEntityId: parsed.activeEntityId ?? null,
    }
  } catch {
    return blankState()
  }
}

let state: DataState = load()
const listeners = new Set<() => void>()

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('心迹：本地存储写入失败', e)
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

function getSnapshot(): DataState {
  return state
}

export function useStore(): DataState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function getState(): DataState {
  return state
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ===== 主体 =====
export function setActiveEntity(id: string | null) {
  state = { ...state, activeEntityId: id }
  emit()
}

export function addEntity(data: Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>): Entity {
  const now = new Date().toISOString()
  const e: Entity = { ...data, id: uid(), createdAt: now, updatedAt: now }
  state = { ...state, entities: [...state.entities, e], activeEntityId: state.activeEntityId ?? e.id }
  emit()
  return e
}

export function updateEntity(id: string, patch: Partial<Entity>) {
  state = {
    ...state,
    entities: state.entities.map((e) =>
      e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e
    ),
  }
  emit()
}

// 重命名标签：所有含该标签的主体同步改名（即重命名左侧栏文件夹）
export function renameEntityTag(oldTag: string, newTag: string) {
  const from = oldTag.trim()
  const to = newTag.trim()
  if (!from || !to || from === to) return
  state = {
    ...state,
    entities: state.entities.map((e) => {
      if (!e.tags.includes(from)) return e
      const merged = Array.from(new Set(e.tags.map((t) => (t === from ? to : t))))
      return { ...e, tags: merged, updatedAt: new Date().toISOString() }
    }),
  }
  emit()
}

// 删除标签：从所有主体上移除该标签（即删除左侧栏文件夹），主体本身保留
export function deleteEntityTag(tag: string) {
  const t = tag.trim()
  if (!t) return
  state = {
    ...state,
    entities: state.entities.map((e) =>
      e.tags.includes(t)
        ? { ...e, tags: e.tags.filter((x) => x !== t), updatedAt: new Date().toISOString() }
        : e
    ),
  }
  emit()
}

export function deleteEntity(id: string) {
  const remaining = state.entities.filter((e) => e.id !== id)
  state = {
    ...state,
    entities: remaining,
    statusRecords: state.statusRecords.filter((r) => r.entityId !== id),
    divinationRecords: state.divinationRecords.filter((r) => r.entityId !== id),
    activeEntityId:
      state.activeEntityId === id ? (remaining[0]?.id ?? null) : state.activeEntityId,
  }
  emit()
}

// ===== 状态记录 =====
export function addStatusRecord(data: Omit<StatusRecord, 'id' | 'createdAt'>) {
  const r: StatusRecord = { ...data, id: uid(), createdAt: new Date().toISOString() }
  state = { ...state, statusRecords: [...state.statusRecords, r] }
  emit()
}

export function updateStatusRecord(id: string, patch: Partial<StatusRecord>) {
  state = {
    ...state,
    statusRecords: state.statusRecords.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  }
  emit()
}

export function deleteStatusRecord(id: string) {
  state = { ...state, statusRecords: state.statusRecords.filter((r) => r.id !== id) }
  emit()
}

// ===== 占卜记录 =====
export function addDivinationRecord(data: Omit<DivinationRecord, 'id' | 'createdAt'>) {
  const r: DivinationRecord = { ...data, id: uid(), createdAt: new Date().toISOString() }
  state = { ...state, divinationRecords: [...state.divinationRecords, r] }
  emit()
}

export function updateDivinationRecord(id: string, patch: Partial<DivinationRecord>) {
  state = {
    ...state,
    divinationRecords: state.divinationRecords.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  }
  emit()
}

export function deleteDivinationRecord(id: string) {
  state = { ...state, divinationRecords: state.divinationRecords.filter((r) => r.id !== id) }
  emit()
}

// ===== 设置 =====
export function updateSettings(patch: Partial<Settings>) {
  state = { ...state, settings: { ...state.settings, ...patch } }
  emit()
}

export function updateFieldToggles(patch: Partial<FieldToggles>) {
  state = {
    ...state,
    settings: { ...state.settings, fieldToggles: { ...state.settings.fieldToggles, ...patch } },
  }
  emit()
}

// ===== 导入 / 导出 / 重置 =====
export function importData(raw: string) {
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object') throw new Error('无效的数据文件')
  state = {
    entities: Array.isArray(parsed.entities) ? parsed.entities : [],
    statusRecords: Array.isArray(parsed.statusRecords) ? parsed.statusRecords : [],
    divinationRecords: Array.isArray(parsed.divinationRecords) ? parsed.divinationRecords : [],
    settings: {
      ...defaultSettings(),
      ...(parsed.settings || {}),
      fieldToggles: { ...defaultSettings().fieldToggles, ...((parsed.settings || {}).fieldToggles || {}) },
    },
    activeEntityId: parsed.activeEntityId ?? null,
  }
  emit()
}

export function exportState(): string {
  return JSON.stringify(state, null, 2)
}

// 合并导入（JSON 备份）：保留当前数据与设置，并入文件中的新数据。
// 关键点：不同设备导出的同一主体 id 不同，因此按「姓名」识别同一人，
// 并把导入记录映射到当前主体 id；记录再按「主体 + 时间 + 内容」去重，
// 避免同一个人/同一条记录被重复导入变成两份。
export function mergeData(raw: string) {
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object') throw new Error('无效的数据文件')
  const incomingEntities: Entity[] = Array.isArray(parsed.entities) ? parsed.entities : []
  const incomingStatus: StatusRecord[] = Array.isArray(parsed.statusRecords) ? parsed.statusRecords : []
  const incomingDiv: DivinationRecord[] = Array.isArray(parsed.divinationRecords) ? parsed.divinationRecords : []

  const norm = (s?: string) => (s || '').trim().toLowerCase()

  // 1) 主体按姓名合并：同名视为同一人，保留当前主体并把记录映射到当前 id
  const nameToId = new Map<string, string>()
  for (const e of state.entities) nameToId.set(norm(e.name), e.id)
  const idMap = new Map<string, string>() // 导入主体的旧 id -> 当前 id
  const newEntities: Entity[] = []
  for (const e of incomingEntities) {
    const key = norm(e.name)
    if (nameToId.has(key)) {
      const curId = nameToId.get(key)!
      idMap.set(e.id, curId)
      // 合并标签，避免丢失对方主体的标签
      const cur = state.entities.find((x) => x.id === curId)!
      const mergedTags = Array.from(new Set([...cur.tags, ...(e.tags || [])]))
      state.entities = state.entities.map((x) => (x.id === curId ? { ...x, tags: mergedTags } : x))
    } else {
      nameToId.set(key, e.id)
      newEntities.push(e)
    }
  }
  const mergedEntities = [...state.entities, ...newEntities]

  // 2) 记录去重签名：主体 id + 发生时间 + 关键内容（不含 id / 图片，跨设备才可比）
  const recordSig = (r: StatusRecord | DivinationRecord, entityId: string): string => {
    const base = `${entityId}|${r.recordedAt}`
    if ('level' in r) {
      const s = r as StatusRecord
      return base + '|' + JSON.stringify([
        s.level, s.descTags, s.freeText, s.factorsPreset, s.factorsCustom,
        s.factorFree, s.sensationParts, s.sensationFeelings, s.perceptions, s.sensationFree,
      ])
    }
    const d = r as DivinationRecord
    return base + '|' + JSON.stringify([
      d.method, d.cards, d.question, d.result, d.thoughts, d.verifyStatus, d.verifyNote,
    ])
  }

  const statusSigs = new Set(state.statusRecords.map((r) => recordSig(r, r.entityId)))
  const mergedStatus: StatusRecord[] = [...state.statusRecords]
  for (const r of incomingStatus) {
    const eid = idMap.get(r.entityId) ?? r.entityId
    const rr = { ...r, entityId: eid }
    const sig = recordSig(rr, eid)
    if (!statusSigs.has(sig)) {
      statusSigs.add(sig)
      mergedStatus.push(rr)
    }
  }

  const divSigs = new Set(state.divinationRecords.map((r) => recordSig(r, r.entityId)))
  const mergedDiv: DivinationRecord[] = [...state.divinationRecords]
  for (const r of incomingDiv) {
    const eid = idMap.get(r.entityId) ?? r.entityId
    const rr = { ...r, entityId: eid }
    const sig = recordSig(rr, eid)
    if (!divSigs.has(sig)) {
      divSigs.add(sig)
      mergedDiv.push(rr)
    }
  }

  state = {
    ...state,
    entities: mergedEntities,
    statusRecords: mergedStatus,
    divinationRecords: mergedDiv,
  }
  emit()
}

// 合并导入（CSV 跨设备传输用：追加而非覆盖）
export function appendData(partial: {
  entities?: Entity[]
  statusRecords?: StatusRecord[]
  divinationRecords?: DivinationRecord[]
}) {
  state = {
    ...state,
    entities: [...state.entities, ...(partial.entities || [])],
    statusRecords: [...state.statusRecords, ...(partial.statusRecords || [])],
    divinationRecords: [...state.divinationRecords, ...(partial.divinationRecords || [])],
  }
  emit()
}

export function resetAll() {
  state = blankState()
  emit()
}
