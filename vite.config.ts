import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react-swc"
import {defineConfig} from "vite"
import process from "process"
import {viteSingleFile} from "vite-plugin-singlefile"

const single = process.env.SINGLE_FILE === "1"

/**
 * 部署路径：
 * - 放在网站根目录（Netlify / Vercel / 自己的服务器）保持默认 "/"
 * - 放在子目录（如 GitHub Pages 的 /你的仓库名/）设置 VITE_BASE_PATH=/你的仓库名/
 * 单文件模式强制使用根路径，方便本地直接打开生成的 HTML。
 */
const base = single ? "/" : (process.env.VITE_BASE_PATH || "/")

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), ...(single ? [viteSingleFile()] : [])],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
})
