import { useEffect, useMemo, useRef, useState } from 'react'

// 雷达 / 波纹风格视觉：中心点 + 同心波纹
// - 波纹疏密与远近：由 space 决定（distance / density / jitter）
// - 颜色深浅：由 emotion 决定（intensity）
// - 波动节奏：由 turbulence 决定
// - 光点数量：由 presence 决定
interface RippleRadarProps {
  distance: number
  density: number
  jitter: number
  intensity: number
  turbulence: number
  dots: number
  size?: number
}

export function RippleRadar({
  distance,
  density,
  jitter,
  intensity,
  turbulence,
  dots,
  size = 240,
}: RippleRadarProps) {
  const [tick, setTick] = useState(0)
  const raf = useRef<number | null>(null)
  const start = useRef(performance.now())

  // 用 rAF 驱动，让波纹像水波一样持续呼吸（波动越强节奏越快）
  useEffect(() => {
    const period = 1400 - turbulence * 700 // 700~1400ms
    function loop(now: number) {
      setTick((now - start.current) / period)
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [turbulence])

  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - 6

  // 波纹圈数与半径：越近越大越密
  const rings = useMemo(() => {
    const count = Math.max(2, Math.round(density))
    // 基准半径：近 => 大范围铺开；远 => 收缩成一团
    const base = maxR * (0.3 + (1 - distance) * 0.65)
    return Array.from({ length: count }, (_, i) => {
      const ratio = (i + 1) / count
      const phase = (tick + i / count) % 1
      // 波纹由内向外扩散，强弱由 intensity 控制透明度
      const grow = 0.55 + phase * 0.45
      const r = base * ratio * grow
      const opacity = (1 - phase) * (0.2 + intensity * 0.7) * (1 - ratio * 0.25)
      return { r, opacity }
    })
  }, [density, distance, intensity, tick, maxR])

  // 光点分布：环绕中心，数量由 presence 决定
  const dotPositions = useMemo(() => {
    const n = Math.max(0, Math.min(6, dots))
    const ringR = maxR * (0.28 + (1 - distance) * 0.3)
    return Array.from({ length: n }, (_, i) => {
      const wobble = Math.sin(tick * Math.PI * 2 + i) * (4 + turbulence * 8)
      const angle = (Math.PI * 2 * i) / n + tick * 0.25 * turbulence + Math.PI / 6
      return {
        x: cx + Math.cos(angle) * (ringR + wobble),
        y: cy + Math.sin(angle) * (ringR + wobble),
        r: 2 + intensity * 2.5,
        o: 0.5 + intensity * 0.5,
      }
    })
  }, [dots, distance, cx, cy, maxR, tick, intensity, turbulence])

  const coreR = 5 + intensity * 5 + Math.sin(tick * Math.PI * 2) * (1 + turbulence * 2)

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      className="max-w-[280px]"
      role="img"
      aria-label="感知波纹"
    >
      <defs>
        <radialGradient id="sense-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--entity-accent)" stopOpacity={0.35 + intensity * 0.5} />
          <stop offset="100%" stopColor="var(--entity-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 中心辉光 */}
      <circle cx={cx} cy={cy} r={maxR * (0.5 + intensity * 0.4)} fill="url(#sense-core)" />

      {/* 同心波纹 */}
      {rings.map((ring, i) => (
        <circle
          key={i}
          cx={cx + (Math.sin(tick * Math.PI * 2 + i) * jitter * 10)}
          cy={cy + (Math.cos(tick * Math.PI * 2 + i * 1.3) * jitter * 10)}
          r={ring.r}
          fill="none"
          stroke="var(--entity-accent)"
          strokeWidth={1 + intensity * 1.4}
          strokeOpacity={Math.max(0, ring.opacity)}
        />
      ))}

      {/* 在场光点 */}
      {dotPositions.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="var(--entity-accent)" fillOpacity={d.o} />
      ))}

      {/* 中心点 */}
      <circle
        cx={cx}
        cy={cy}
        r={Math.max(3, coreR)}
        fill="var(--entity-accent)"
        fillOpacity={0.55 + intensity * 0.45}
      />
      <circle cx={cx} cy={cy} r={Math.max(1.5, coreR * 0.4)} fill="var(--foreground)" fillOpacity={0.7} />
    </svg>
  )
}
