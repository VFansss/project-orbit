import type { CAC } from 'cac'
import { Orbit } from '@orbit/core'

/**
 * TODO: Command to display system and user status.
 */
export default (cli: CAC) => {
  cli
    .command('whoami', 'Show current status')
    .action(async () => {
      const { user, platform } = Orbit.state
      
      console.log(`\x1b[34m--- Full Orbit Status ---\x1b[0m`)
      console.log(`User:     ${user.isLoggedIn ? user.id : '\x1b[31mNot logged in\x1b[0m'}`)
      console.log(`OS:       ${platform.os} (${platform.arch})`)
      console.log(`Mobile:   ${platform.isMobile ? 'Yes' : 'No'}`)
    })
}
