import type { DataState, DivinationRecord, Entity, StatusRecord } from './types'
import { LEVELS, VERIFY_STATUSES } from './format'

// 以 CSV 作为跨设备传输格式：导出为扁平表格，导入时按主体名称还原。

const COLUMNS = [
  'type',
  'entity',
  'level',
  'descTags',
  'freeText',
  'factorsPreset',
  'factorsCustom',
  'factorFree',
  'recordedAt',
  'isBackfill',
  'method',
  'cards',
  'question',
  'result',
  'thoughts',
  'verifyStatus',
  'verifyNote',
  'createdAt',
] as const

function esc(v: string): string {
  if (/[",\n\r]/.test(v)) return '"' + v.replace(/"/g, '""') + '"'
  return v
}

function joinArr(a: string[] | undefined): string {
  return (a || []).join('|')
}

function splitArr(v: string): string[] {
  const t = (v || '').trim()
  if (!t) return []
  return t.split('|').map((s) => s.trim()).filter(Boolean)
}

export function exportRecordsCSV(state: DataState): string {
  const nameMap = new Map(state.entities.map((e) => [e.id, e.name]))
  const rows: string[] = [COLUMNS.join(',')]
  for (const r of state.statusRecords) {
    rows.push(
      [
        'status',
        nameMap.get(r.entityId) ?? r.entityId,
        r.level,
        joinArr(r.descTags),
        r.freeText,
        joinArr(r.factorsPreset),
        joinArr(r.factorsCustom),
        r.factorFree,
        r.recordedAt,
        r.isBackfill ? '1' : '0',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        r.createdAt,
      ]
        .map((c) => esc(String(c)))
        .join(',')
    )
  }
  for (const r of state.divinationRecords) {
    rows.push(
      [
        'divination',
        nameMap.get(r.entityId) ?? r.entityId,
        '',
        '',
        '',
        '',
        '',
        '',
        r.recordedAt,
        '',
        r.method,
        joinArr(r.cards),
        r.question,
        r.result,
        r.thoughts,
        r.verifyStatus,
        r.verifyNote,
        r.createdAt,
      ]
        .map((c) => esc(String(c)))
        .join(',')
    )
  }
  return rows.join('\n')
}

// 轻量 CSV 解析（支持引号包裹、内部逗号与换行）
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(field)
        field = ''
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else {
        field += ch
      }
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function importRecordsCSV(text: string): {
  entities: Entity[]
  statusRecords: StatusRecord[]
  divinationRecords: DivinationRecord[]
} {
  const rows = parseCSV(text)
  if (rows.length < 2) throw new Error('CSV 没有可导入的数据行')
  const header = rows[0].map((h) => h.trim())
  const idx: Record<string, number> = {}
  header.forEach((h, i) => (idx[h] = i))
  if (idx['type'] === undefined) throw new Error('CSV 缺少 type 列')

  const entities: Entity[] = []
  const entityByName = new Map<string, Entity>()
  const statusRecords: StatusRecord[] = []
  const divinationRecords: DivinationRecord[] = []

  const get = (r: string[], col: string) => (idx[col] !== undefined ? (r[idx[col]] ?? '') : '')

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const type = (get(r, 'type') || '').trim().toLowerCase()
    const name = (get(r, 'entity') || '未命名').trim()
    let entity = entityByName.get(name)
    if (!entity) {
      entity = {
        id: uid(),
        name,
        category: '导入',
        tags: [],
        color: '#a78bfa',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      entities.push(entity)
      entityByName.set(name, entity)
    }
    const recordedAt = get(r, 'recordedAt') || new Date().toISOString()
    const createdAt = get(r, 'createdAt') || recordedAt
    if (type === 'status') {
      const level = (get(r, 'level') || '中').trim() as StatusRecord['level']
      statusRecords.push({
        id: uid(),
        entityId: entity.id,
        level: LEVELS.includes(level) ? level : '中',
        descTags: splitArr(get(r, 'descTags')),
        freeText: get(r, 'freeText'),
        factorsPreset: splitArr(get(r, 'factorsPreset')),
        factorsCustom: splitArr(get(r, 'factorsCustom')),
        factorFree: get(r, 'factorFree'),
        recordedAt,
        isBackfill: get(r, 'isBackfill') === '1',
        images: [],
        createdAt,
      })
    } else if (type === 'divination') {
      const vs = (get(r, 'verifyStatus') || '').trim()
      divinationRecords.push({
        id: uid(),
        entityId: entity.id,
        method: get(r, 'method'),
        cards: splitArr(get(r, 'cards')),
        question: get(r, 'question'),
        result: get(r, 'result'),
        thoughts: get(r, 'thoughts'),
        verifyStatus: VERIFY_STATUSES.includes(vs) ? vs : '',
        verifyNote: get(r, 'verifyNote'),
        images: [],
        recordedAt,
        createdAt,
      })
    }
  }

  return { entities, statusRecords, divinationRecords }
}
