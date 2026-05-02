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
    .option('--platform <platform>', 'Default platform for screenshots')
    .option('--recursive', 'Scan source directory recursively', { default: false })
    .option('--dry-run', 'Show what would be done without making changes', { default: false })
    .option('--copy', 'Copy files instead of moving them', { default: false })
    .action(async (action?: string, path?: string, flags?: any) => {
      // 1. Requirements Check
      const auth = Orbit.checkScopes(['USER_LOGGED'])
      if (!auth.authorized || !Orbit.state.library.isLoaded) {
        console.error(`\n\x1b[31mError:\x1b[0m Library and User Login are required.`)
        console.error(`\x1b[33mHint:\x1b[0m Run 'orbit init' to set up your library and login.`)
        process.exit(1)
      }

      let targetAction = action
      // If action is provided, we still want to be interactive if path or platform is missing
      // However, if action is NOT provided, we definitely start interactive selection.
      let isInteractive = !action || !path || !flags.platform

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
        // Since we had to ask for the action, we are definitely in interactive mode
        isInteractive = true
      }

      // 3. Dispatch to specific action logic
      try {
        if (targetAction === 'parse') {
          await parseAction(path, isInteractive, flags)
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
