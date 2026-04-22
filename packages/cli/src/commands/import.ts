import type { CAC } from 'cac'
import { Orbit } from '@orbit/core'

/**
 * TODO: Placeholder for the import functionality.
 */
export default (cli: CAC) => {
  cli
    .command('import <path>', 'Import games from a directory')
    .action((path: string) => {
      const auth = Orbit.checkScopes(['USER_LOGGED'])

      if (!auth.authorized) {
        console.error(`\x1b[31mError:\x1b[0m Access denied. Missing: \x1b[33m${auth.missing}\x1b[0m`)
        console.log(`Please login first: \x1b[2morbit login <id>\x1b[0m`)
        process.exit(1)
      }

      console.log(`\x1b[32mImporting from:\x1b[0m ${path}`)
    })
}
