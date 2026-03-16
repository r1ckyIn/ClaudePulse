import type { ForgeConfig } from '@electron-forge/shared-types'

const config: ForgeConfig = {
  packagerConfig: {
    name: 'ClaudePulse',
    executableName: 'ClaudePulse',
    icon: './assets/icons/app-icon',
    appBundleId: 'com.r1ckyin.claudepulse',
    appCategoryType: 'public.app-category.developer-tools',
    extraResource: ['./scripts/claude-pulse-reporter.js'],
    osxSign: {},
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
        name: 'ClaudePulse',
      },
    },
  ],
}

export default config
