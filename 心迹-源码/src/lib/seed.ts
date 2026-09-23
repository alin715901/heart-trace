import type { FieldToggles, Settings } from './types'

export function defaultFieldToggles(): FieldToggles {
  return {
    statusFreeText: true,
    statusFactorFree: true,
    divinationThoughts: true,
    divinationVerifyNote: true,
    entityTags: true,
  }
}

export function defaultSettings(): Settings {
  return {
    statusDescTags: ['喜悦', '平静', '焦虑', '疲惫', '灵感', '思念', '迷茫', '笃定', '期待', '释然'],
    presetFactors: ['工作', '学业', '人际', '健康', '环境', '梦境', '创作', '家庭', '亲密关系', '情绪'],
    divinationMethods: ['塔罗', '雷诺曼', '神谕卡', '六爻', '周易', '星盘', '灵摆', '骰子'],
    categories: ['梦角', 'OC', '角色', '投射', '灵感体'],
    fieldToggles: defaultFieldToggles(),
    themeId: 'paper',
    customTheme: undefined,
  }
}

// 预置主体点缀色，新建时按顺序取用
export const ENTITY_COLORS = [
  '#a78bfa', // 紫
  '#7dd3fc', // 天蓝
  '#fca5a5', // 珊瑚
  '#86efac', // 绿
  '#fcd34d', // 金
  '#f0abfc', // 粉
  '#93c5fd', // 蓝
  '#fdba74', // 橙
]
