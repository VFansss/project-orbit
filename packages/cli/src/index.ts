import { cac } from 'cac'

/**
 * TODO: The CLI now lives in its own package.
 * It will eventually import logic from @orbit/core.
 */
const cli = cac('orbit')

cli
  .command('import <path>', 'Import games from a directory')
  .action((path: string) => {
    console.log(`\x1b[32mImporting from:\x1b[0m ${path}`)
  })

cli.help()
cli.parse()
