import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)

// 开屏淡出：等首帧绘制后再隐藏，并保留最短展示时间让动画不被闪过
const splash = document.getElementById('splash')
const MIN_DURATION = 2000
const start = Date.now()
let hidden = false

function hideSplash() {
  if (hidden || !splash) return
  hidden = true
  const wait = Math.max(0, MIN_DURATION - (Date.now() - start))
  setTimeout(() => {
    splash.classList.add('splash--hide')
    splash.addEventListener('transitionend', () => splash.remove(), { once: true })
    // 兜底：若 transitionend 未触发也强制移除
    setTimeout(() => splash.remove(), 800)
  }, wait)
}

requestAnimationFrame(() => requestAnimationFrame(hideSplash))
// 安全兜底：即使渲染异常也保证开屏最终消失
setTimeout(hideSplash, 5000)
