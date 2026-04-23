import type { CAC } from 'cac'
import * as p from '@clack/prompts'
import { Orbit, validateIdentity } from '@orbit/core'
import { loadConfig, saveConfig } from '../storage'

/**
 * TODO: Login command updated for camelCase and professional mapping.
 */
export default (cli: CAC) => {
  cli
    .command('login [id]', 'Login with a local identity')
    .action(async (id?: string) => {
      if (!Orbit.state.library.isLoaded) {
        console.error(`\n\x1b[31mError:\x1b[0m No library active. Please set a library first using: \x1b[34morbit library\x1b[0m`)
        process.exit(1)
      }

      let targetId = id

      if (!targetId) {
        p.intro('\x1b[34mOrbit Login\x1b[0m')
        const response = await p.text({
          message: 'Enter your local username:',
          placeholder: 'alex',
          validate: (v) => {
            if (v.includes('@')) return 'Remote identities (@) are not yet supported.';
            if (!validateIdentity(v)) return 'Invalid identity. No spaces or special chars allowed.';
          }
        })
        if (p.isCancel(response)) process.exit(0)
        targetId = response as string
      }

      const config = await loadConfig()
      config.currentUser = targetId // Now in camelCase
      await saveConfig(config)
      
      Orbit.updateUser(targetId)

      if (!id) p.outro(`\x1b[32mSuccessfully logged in as:\x1b[0m ${targetId}`)
      else console.log(`\x1b[32mSuccess!\x1b[0m Logged in as: ${targetId}`)
    })
}
