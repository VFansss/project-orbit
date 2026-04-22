import type { CAC } from 'cac'
import * as p from '@clack/prompts'
import { Orbit } from '@orbit/core'
import { parseAction } from './parse'
import { syncAction } from './sync'

/**
 * TODO: Screenshot command router.
 * Dispatches to parse or sync actions based on arguments or user selection.
 */
export default (cli: CAC) => {
  cli
    .command('screenshot [action] [path]', 'Manage screenshots (parse, sync)')
    .action(async (action?: string, path?: string) => {
      // 1. Requirements Check
      const auth = Orbit.checkScopes(['USER_LOGGED'])
      if (!auth.authorized || !Orbit.state.library.isLoaded) {
        console.error(`\n\x1b[31mError:\x1b[0m Library and User Login are required.`)
        process.exit(1)
      }

      let targetAction = action
      const isInteractive = !action

      // 2. Interactive Selection if action is missing
      if (!targetAction) {
        p.intro('\x1b[34mScreenshot Management\x1b[0m')
        const response = await p.select({
          message: 'Select an action:',
          options: [
            { value: 'parse', label: 'Parse', hint: 'Scan a folder for new screenshots' },
            { value: 'sync', label: 'Sync', hint: 'Update metadata' },
          ],
        })
        if (p.isCancel(response)) process.exit(0)
        targetAction = response as string
      }

      // 3. Dispatch to specific action logic
      try {
        if (targetAction === 'parse') {
          await parseAction(path, isInteractive)
        } else if (targetAction === 'sync') {
          await syncAction(isInteractive)
        } else {
          console.error(`\x1b[31mError:\x1b[0m Unknown action "${targetAction}"`)
          process.exit(1)
        }

        if (isInteractive) {
          p.outro(`\x1b[32mSuccess!\x1b[0m Action completed.`)
        } else {
          console.log(`\x1b[32mSuccess!\x1b[0m Action completed.`)
        }
      } catch (err: any) {
        console.error(`\x1b[31mError:\x1b[0m ${err.message}`)
        process.exit(1)
      }
    })
}
