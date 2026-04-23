#!/usr/bin/env node
// Package ClaudePulse as a macOS .app
// Uses @electron/packager with explicit ignore to include out/ directory

const { packager } = require('@electron/packager')
const path = require('path')
const fs = require('fs')

async function main() {
  const projectDir = path.resolve(__dirname, '..')

  console.log('[package] Building ClaudePulse.app...')

  const appPaths = await packager({
    dir: projectDir,
    name: 'ClaudePulse',
    platform: 'darwin',
    arch: 'x64',
    out: path.join(projectDir, 'dist'),
    overwrite: true,
    appBundleId: 'com.r1ckyin.claudepulse',
    appCategoryType: 'public.app-category.developer-tools',
    extraResource: [
      path.join(projectDir, 'scripts', 'claude-pulse-reporter.js'),
    ],
    // Explicitly control what gets included
    ignore: (filePath) => {
      if (!filePath) return false
      if (filePath === '/package.json') return false
      if (filePath.startsWith('/out')) return false
      // Include node_modules but skip broken symlinks in .bin
      if (filePath.startsWith('/node_modules')) {
        if (filePath.includes('/.bin/')) return true
        return false
      }
      if (filePath === '/') return false
      return true
    },
  })

  console.log(`[package] Success! App created at: ${appPaths[0]}`)

  // Copy reporter to Resources
  const resourcesDir = path.join(appPaths[0], 'ClaudePulse.app', 'Contents', 'Resources')
  const scriptsDir = path.join(resourcesDir, 'scripts')
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true })
  }
  fs.copyFileSync(
    path.join(projectDir, 'scripts', 'claude-pulse-reporter.js'),
    path.join(scriptsDir, 'claude-pulse-reporter.js')
  )
  console.log('[package] Reporter script copied to Resources/scripts/')

  // Copy to /Applications so it appears in Launchpad
  const appSrc = path.join(appPaths[0], 'ClaudePulse.app')
  const appDest = '/Applications/ClaudePulse.app'
  try {
    fs.cpSync(appSrc, appDest, { recursive: true, force: true })
    console.log('[package] Installed to /Applications/ClaudePulse.app')
  } catch (e) {
    console.log('[package] Could not copy to /Applications (try with sudo)')
  }
}

main().catch((err) => {
  console.error('[package] Failed:', err)
  process.exit(1)
})
