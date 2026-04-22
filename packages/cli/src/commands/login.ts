import type { CAC } from 'cac'
import * as p from '@clack/prompts'
import { Orbit, validateIdentity } from '@orbit/core'
import { loadConfig, saveConfig } from '../storage'

/**
 * TODO: Login command.
 * Ensures a library is selected and only allows local usernames (no '@').
 */
export default (cli: CAC) => {
  cli
    .command('login [id]', 'Login with a local identity')
    .action(async (id?: string) => {
      // 1. Check if a library is loaded
      if (!Orbit.state.library.isLoaded) {
        console.error(`\n\x1b[31mError:\x1b[0m No library active. Please set a library first using: \x1b[34morbit library\x1b[0m`)
        process.exit(1)
      }

      let targetId = id

      // 2. Interactive prompt if no ID was passed
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

        if (p.isCancel(response)) {
          p.cancel('Login cancelled.')
          process.exit(0)
        }
        
        targetId = response as string
      } else {
        // Validation for the direct argument
        if (targetId.includes('@')) {
          console.error(`\n\x1b[31mError:\x1b[0m Remote identities with "@" are not supported yet. Use a local name.`)
          process.exit(1)
        }
        if (!validateIdentity(targetId)) {
          console.error(`\n\x1b[31mError:\x1b[0m Invalid identity.`)
          process.exit(1)
        }
      }

      // 3. Persist and update core state
      const config = await loadConfig()
      config.currentUser = targetId
      await saveConfig(config)
      
      Orbit.updateUser(targetId)

      if (!id) {
        p.outro(`\x1b[32mSuccessfully logged in as:\x1b[0m ${targetId}`)
      } else {
        console.log(`\x1b[32mSuccess!\x1b[0m Logged in as: ${targetId}`)
      }
    })
}
