import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vite.dev/config/
// 使用函数形式，方便按环境设置 base
export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    // 生产环境部署在 https://dream.dreamflycn.com/shop/，开发环境仍然用根路径
    base: isProd ? "/shop/" : "/",
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // server: {
    //   proxy: {
    //     '/shop': {
    //       target: 'https://dream.dreamflycn.com',
    //       changeOrigin: true,
    //       // 保持路径为 /shop/xxx
    //       rewrite: (p) => p.replace(/^\/shop/, '/shop'),
    //     },
    //   },
    // },
  };
});
