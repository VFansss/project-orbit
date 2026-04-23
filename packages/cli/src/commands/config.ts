import type { CAC } from 'cac'
import * as p from '@clack/prompts'
import { CONFIG_KEYS, OrbitConfigKeySchema, type OrbitConfigKey } from '@orbit/core'
import { loadConfig, saveConfig } from '../storage'

/**
 * TODO: Config command updated for camelCase and professional mapping.
 */
export default (cli: CAC) => {
  cli
    .command('config [key] [value]', 'Configure settings (e.g. igdbClientId)')
    .action(async (key?: string, value?: string) => {
      let targetKey = key as OrbitConfigKey
      let targetValue = value

      if (key) {
        const result = OrbitConfigKeySchema.safeParse(key)
        if (!result.success) {
          console.error(`\n\x1b[31mError:\x1b[0m Invalid configuration key "${key}".`)
          console.log(`Available keys: \x1b[2m${CONFIG_KEYS.join(', ')}\x1b[0m`)
          process.exit(1)
        }
      }

      if (!targetKey) {
        p.intro('\x1b[34mOrbit Configuration\x1b[0m')
        const selection = await p.select({
          message: 'Select a setting to configure:',
          options: CONFIG_KEYS.map(k => ({ value: k, label: k })),
        })
        if (p.isCancel(selection)) process.exit(0)
        targetKey = selection as OrbitConfigKey
      }

      if (!targetValue) {
        const response = await p.text({
          message: `Enter value for ${targetKey}:`,
          validate: (v) => v.length === 0 ? 'Value is required' : undefined
        })
        if (p.isCancel(response)) process.exit(0)
        targetValue = response as string
      }

      const config = await loadConfig()
      
      if (targetKey === 'igdbClientId' || targetKey === 'igdbClientSecret') {
        config.secrets = { ...config.secrets, [targetKey]: targetValue }
      } else {
        (config as any)[targetKey] = targetValue
      }

      await saveConfig(config)
      
      if (!key) p.outro(`\x1b[32mSuccess!\x1b[0m ${targetKey} has been updated.`)
      else console.log(`\x1b[32mSuccess!\x1b[0m ${targetKey} set.`)
    })
}
