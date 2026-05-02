import type { CAC } from 'cac'
import * as p from '@clack/prompts'
import { Orbit } from '@orbit/core'
import { join } from 'node:path'
import { readdir, rmdir, stat } from 'node:fs/promises'

/**
 * Recursively cleans empty directories and warns about unhandled files.
 */
export async function cleanStagingAction(handledFiles?: string[], isInteractive: boolean = true) {
  if (!Orbit.state.library.isLoaded) {
    throw new Error('Library is not loaded.')
  }

  const stagingRoot = join(Orbit.state.library.path, '_Staging')
  const handledSet = handledFiles ? new Set(handledFiles) : undefined
  const unhandledFiles: string[] = []

  async function walkAndClean(dir: string): Promise<boolean> {
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      let isEmpty = true

      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          const isSubEmpty = await walkAndClean(fullPath)
          if (!isSubEmpty) {
            isEmpty = false
          }
        } else {
          isEmpty = false
          if (!handledSet || !handledSet.has(fullPath)) {
            unhandledFiles.push(fullPath)
          }
        }
      }

      if (isEmpty && dir !== stagingRoot) {
        await rmdir(dir)
        return true
      }

      return isEmpty
    } catch (err: any) {
      if (err.code === 'ENOENT') return true // Doesn't exist, effectively empty
      return false
    }
  }

  let s
  if (isInteractive) {
    s = p.spinner()
    s.start('Cleaning staging directory...')
  }

  await walkAndClean(stagingRoot)

  if (s) {
    s.stop('Staging directory cleaned.')
  } else {
    p.log.success('Staging directory cleaned.')
  }

  if (unhandledFiles.length > 0) {
    p.log.warn(`Found ${unhandledFiles.length} orphaned file(s) in Staging that were not part of this operation.`)
    if (unhandledFiles.length <= 10) {
      unhandledFiles.forEach(f => p.log.message(`  - ${f}`))
    } else {
      unhandledFiles.slice(0, 10).forEach(f => p.log.message(`  - ${f}`))
      p.log.message(`  ...and ${unhandledFiles.length - 10} more.`)
    }
  }
}

export default (cli: CAC) => {
  cli
    .command('staging [action]', 'Manage the staging directory (clean)')
    .action(async (action?: string) => {
      // 1. Requirements Check
      const auth = Orbit.checkScopes(['USER_LOGGED'])
      if (!auth.authorized || !Orbit.state.library.isLoaded) {
        console.error(`\n\x1b[31mError:\x1b[0m Library and User Login are required.`)
        console.error(`\x1b[33mHint:\x1b[0m Run 'orbit init' to set up your library and login.`)
        process.exit(1)
      }

      let targetAction = action
      if (!targetAction) {
        p.intro('\x1b[34mStaging Management\x1b[0m')
        const response = await p.select({
          message: 'Select an action:',
          options: [
            { value: 'clean', label: 'Clean', hint: 'Remove empty directories in Staging' }
          ],
        })
        if (p.isCancel(response)) process.exit(0)
        targetAction = response as string
      }

      if (targetAction === 'clean') {
        try {
          await cleanStagingAction()
        } catch (err: any) {
          console.error(`\x1b[31mError:\x1b[0m ${err.message}`)
          process.exit(1)
        }
      } else {
        console.error(`\x1b[31mError:\x1b[0m Unknown action "${targetAction}"`)
        process.exit(1)
      }
    })
}
