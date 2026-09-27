import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve, join, relative } from 'path'
import fs from 'fs'

// Helper to scan all JS files in electron/ except migrations and preload
function getEntryPoints(dir, baseDir = dir, fileList = {}) {
  const files = fs.readdirSync(dir)
  files.forEach(file => {
    const filePath = join(dir, file)
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'migrations') {
        getEntryPoints(filePath, baseDir, fileList)
      }
    } else if (file.endsWith('.js') && file !== 'preload.js') {
      const relPath = relative(baseDir, filePath)
      const entryKey = relPath.replace(/\.js$/, '').replace(/\\/g, '/')
      fileList[entryKey] = filePath
    }
  })
  return fileList
}

const copyMigrationsPlugin = () => ({
  name: 'copy-migrations',
  closeBundle() {
    const srcDir = resolve(__dirname, 'electron/db/migrations')
    const destDir = resolve(__dirname, 'out/main/db/migrations')
    if (fs.existsSync(srcDir)) {
      fs.mkdirSync(destDir, { recursive: true })
      fs.readdirSync(srcDir).forEach(file => {
        fs.copyFileSync(join(srcDir, file), join(destDir, file))
      })
      console.log('[copy-migrations] Successfully copied migrations to out/main/db/migrations/')
    }
  }
})

export default defineConfig({
  main: {
    plugins: [copyMigrationsPlugin()],
    build: {
      lib: {
        entry: getEntryPoints(resolve(__dirname, 'electron')),
        formats: ['cjs']
      },
      rollupOptions: {
        external: ['better-sqlite3', 'bcryptjs', 'uuid', 'electron'],
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js'
        }
      }
    }
  },
  preload: {
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/preload.js')
      }
    }
  },
  renderer: {
    root: 'src',
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/index.html')
        }
      }
    }
  }
})
