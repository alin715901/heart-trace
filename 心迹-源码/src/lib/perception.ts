// 心迹 — 「感知此刻」：一次性随机感知，看完即过
// 三项结果：空间感 / 在场感 / 情绪强度。完全随机，无稀有度，不写入任何记录。

export interface Perception {
  space: string
  presence: string
  emotion: string
}

// 空间感：决定波纹的疏密与远近
export const SPACE_OPTIONS = [
  '就在身边',
  '刚刚来过',
  '正在靠近',
  '距离较远',
  '不在这层',
  '被阻挡了',
  '信号很弱',
  '若即若离',
  '刚离开不久',
  '在附近但没进来',
] as const

// 在场感：决定中心周围光点数量
export const PRESENCE_OPTIONS = [
  '只有一个人',
  '这里有好几个人',
  '有人在附近',
  '有人在附近徘徊',
] as const

// 情绪强度：决定色彩深浅与波动强度
export const EMOTION_OPTIONS = [
  '平静',
  '波动',
  '强烈',
  '忽强忽弱',
  '压抑',
  '冷漠',
  '冷静',
] as const

// 每个空间感对应的可视化参数
// distance: 0(极近) ~ 1(极远)，控制波纹半径基数
// density:  波纹圈数，越多越密集
// jitter:   波纹抖动程度，越大越不稳
interface SpaceVisual {
  distance: number
  density: number
  jitter: number
}

const SPACE_VISUAL: Record<string, SpaceVisual> = {
  就在身边: { distance: 0.06, density: 7, jitter: 0.02 },
  刚刚来过: { distance: 0.2, density: 5, jitter: 0.16 },
  正在靠近: { distance: 0.32, density: 6, jitter: 0.1 },
  距离较远: { distance: 0.66, density: 3, jitter: 0.06 },
  不在这层: { distance: 0.95, density: 2, jitter: 0.3 },
  被阻挡了: { distance: 0.5, density: 4, jitter: 0.42 },
  信号很弱: { distance: 0.78, density: 2, jitter: 0.5 },
  若即若离: { distance: 0.42, density: 5, jitter: 0.34 },
  刚离开不久: { distance: 0.28, density: 4, jitter: 0.22 },
  在附近但没进来: { distance: 0.58, density: 3, jitter: 0.12 },
}

// 在场感 -> 光点数量
const PRESENCE_DOTS: Record<string, number> = {
  只有一个人: 1,
  这里有好几个人: 4,
  有人在附近: 2,
  有人在附近徘徊: 3,
}

interface EmotionVisual {
  intensity: number // 0~1，颜色深浅
  turbulence: number // 0~1，波动与节奏
}

const EMOTION_VISUAL: Record<string, EmotionVisual> = {
  平静: { intensity: 0.28, turbulence: 0.1 },
  波动: { intensity: 0.55, turbulence: 0.6 },
  强烈: { intensity: 1, turbulence: 0.85 },
  忽强忽弱: { intensity: 0.7, turbulence: 1 },
  压抑: { intensity: 0.62, turbulence: 0.3 },
  冷漠: { intensity: 0.2, turbulence: 0.05 },
  冷静: { intensity: 0.34, turbulence: 0.15 },
}

export interface PerceptionVisual {
  distance: number
  density: number
  jitter: number
  intensity: number
  turbulence: number
  dots: number
}

export function perceptionVisual(p: Perception): PerceptionVisual {
  const s = SPACE_VISUAL[p.space] ?? { distance: 0.4, density: 4, jitter: 0.1 }
  const e = EMOTION_VISUAL[p.emotion] ?? { intensity: 0.5, turbulence: 0.3 }
  return {
    ...s,
    intensity: e.intensity,
    turbulence: e.turbulence,
    dots: PRESENCE_DOTS[p.presence] ?? 1,
  }
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// 完全随机，三项独立抽取
export function rollPerception(): Perception {
  return {
    space: pick(SPACE_OPTIONS),
    presence: pick(PRESENCE_OPTIONS),
    emotion: pick(EMOTION_OPTIONS),
  }
}
