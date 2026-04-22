import type { CAC } from 'cac'
import { Orbit, validateIdentity } from '@orbit/core'
import { loadConfig, saveConfig } from '../storage'

/**
 * TODO: Command to handle user identity.
 */
export default (cli: CAC) => {
  cli
    .command('login <id>', 'Login with your identity')
    .action(async (id: string) => {
      if (!validateIdentity(id)) {
        console.error(`\x1b[31mError:\x1b[0m Invalid identity. No spaces allowed.`)
        process.exit(1)
      }

      const config = await loadConfig()
      config.currentUser = id
      await saveConfig(config)
      
      Orbit.updateUser(id) 
      console.log(`\x1b[32mSuccess!\x1b[0m Logged in as: ${id}`)
    })
}
