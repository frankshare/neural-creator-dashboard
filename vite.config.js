import {defineConfig} from 'vite';

// base 用相对路径，构建产物可以直接部署在任意子路径。
export default defineConfig({
  base: './',
  server: {
    watch: {
      // 编辑器与自动化工具常用「写临时文件 → 改名」的原子写法，会在目录里留下
      // `.README.md.<pid>.<guid>.tmpdir/xxx.tmp` 这类中间产物。Windows 上文件此时仍被占用，
      // Vite 的 FSWatcher 去 watch 它会抛 EBUSY —— 而那是**未捕获的 error 事件，
      // 会直接杀掉整个 dev server**（血泪教训：改一次 README 就把服务器搞崩了）。
      // 排除这些临时产物，从根上避免。
      // 注意：这里显式带上 Vite 的默认忽略项，避免设置 ignored 后反而去 watch node_modules。
      ignored: [
        '**/.git/**',
        '**/node_modules/**',
        '**/.*.tmpdir/**',
        '**/*.tmpdir/**',
        '**/*.tmp'
      ]
    }
  }
});
