import type { ForgeConfig } from '@electron-forge/shared-types'

const config: ForgeConfig = {
  packagerConfig: {
    name: 'ClaudePulse',
    executableName: 'ClaudePulse',
    appBundleId: 'com.r1ckyin.claudepulse',
    appCategoryType: 'public.app-category.developer-tools',
    extraResource: ['./scripts/claude-pulse-reporter.js'],
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
  ],
}

export default config
