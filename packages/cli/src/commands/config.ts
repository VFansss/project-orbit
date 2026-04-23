import type { CAC } from 'cac'
import * as p from '@clack/prompts'
import { CONFIG_KEYS, type OrbitConfigKey } from '@orbit/core'
import { loadConfig, saveConfig } from '../storage'

/**
 * TODO: Robust config command.
 * Prevents invalid values and provides select menus for enumerable settings.
 */
export default (cli: CAC) => {
  cli
    .command('config [key] [value]', 'Configure settings (e.g. igdbClientId)')
    .action(async (key?: string, value?: string) => {
      let targetKey = key as OrbitConfigKey
      let targetValue = value

      // 1. Smart Key Matching (Case-Insensitive)
      if (key) {
        const actualKey = CONFIG_KEYS.find(k => k.toLowerCase() === key.toLowerCase());
        if (!actualKey) {
          console.error(`\n\x1b[31mError:\x1b[0m Invalid configuration key "${key}".`)
          console.log(`Available keys: \x1b[2m${CONFIG_KEYS.join(', ')}\x1b[0m`)
          process.exit(1)
        }
        targetKey = actualKey as OrbitConfigKey;
      }

      // 2. Interactive Key Selection
      if (!targetKey) {
        p.intro('\x1b[34mOrbit Configuration\x1b[0m')
        const selection = await p.select({
          message: 'Select a setting to configure:',
          options: CONFIG_KEYS.map(k => ({ value: k, label: k })),
        })
        if (p.isCancel(selection)) process.exit(0)
        targetKey = selection as OrbitConfigKey
      }

      // 3. Interactive Value Input with Boundaries
      if (!targetValue) {
        if (targetKey === 'logLevel') {
          // Force valid choices for logLevel
          const selection = await p.select({
            message: `Select value for ${targetKey}:`,
            options: [
              { value: 'ERROR', label: 'ERROR (Silent)' },
              { value: 'INFO', label: 'INFO (Normal)' },
              { value: 'DEBUG', label: 'DEBUG (Technical Logs)' },
            ]
          })
          if (p.isCancel(selection)) process.exit(0)
          targetValue = selection as string
        } else {
          const response = await p.text({
            message: `Enter value for ${targetKey}:`,
            validate: (v) => (!v || v.toString().length === 0) ? 'Value is required' : undefined
          })
          if (p.isCancel(response)) process.exit(0)
          targetValue = response as string
        }
      }

      // 4. Apply boundaries/defaults for specific keys
      if (targetKey === 'logLevel') {
        const val = targetValue.toUpperCase()
        targetValue = ['ERROR', 'INFO', 'DEBUG'].includes(val) ? val : 'ERROR'
      }

      // 5. Save the configuration
      const config = await loadConfig()
      
      if (targetKey === 'igdbClientId' || targetKey === 'igdbClientSecret') {
        config.secrets = { ...config.secrets, [targetKey]: targetValue }
      } else {
        (config as any)[targetKey] = targetValue
      }

      await saveConfig(config)
      
      if (!key) {
        p.outro(`\x1b[32mSuccess!\x1b[0m ${targetKey} updated to ${targetValue}.`)
      } else {
        console.log(`\x1b[32mSuccess!\x1b[0m ${targetKey} set to ${targetValue}.`)
      }
    })
}
