import type { CAC } from 'cac'
import { Orbit } from '@orbit/core'

/**
 * TODO: Detailed status command.
 * Shows user, library, and platform information.
 */
export default (cli: CAC) => {
  cli
    .command('status', 'Show current Orbit status (user, library, platform)')
    .action(async () => {
      const { user, platform, library } = Orbit.state
      
      console.log(`\x1b[34m--- Orbit Status ---\x1b[0m`)
      console.log(`User:     ${user.isLoggedIn ? `\x1b[32m${user.id}\x1b[0m` : '\x1b[31mNot logged in\x1b[0m'}`)
      console.log(`Library:  ${library.isLoaded ? `\x1b[34m${library.path}\x1b[0m` : '\x1b[31mNone\x1b[0m'}`)
      console.log(`OS:       ${platform.os} (${platform.arch})`)
      console.log(`Mobile:   ${platform.isMobile ? 'Yes' : 'No'}`)
    })
}
