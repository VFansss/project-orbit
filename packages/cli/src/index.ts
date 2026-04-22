import { cac } from 'cac'
import { Orbit, version } from '@orbit/core'
import { loadConfig } from './storage'

// Simple flat commands
import registerLogin from './commands/login'
import registerStatus from './commands/status'
import registerImport from './commands/import'
import registerLibrary from './commands/library'

const cli = cac('orbit')

/**
 * TODO: Initialize the core state and show a quick status line.
 */
async function initApp() {
  Orbit.init({ os: process.platform as any, arch: process.arch, isMobile: false })
  
  const config = await loadConfig()
  if (config.currentUser) Orbit.updateUser(config.currentUser)
  if (config.currentLibraryPath) Orbit.updateLibrary(config.currentLibraryPath)

  const { user, library, platform } = Orbit.state
  const userDisplay = user.isLoggedIn ? `\x1b[32m${user.id}\x1b[0m` : '\x1b[33manonymous\x1b[0m'
  const libDisplay = library.isLoaded ? `\x1b[34m${library.path}\x1b[0m` : '\x1b[31mnone\x1b[0m'
  
  console.log(`\x1b[1mWelcome to Orbit v${version}\x1b[0m`)
  console.log(`\x1b[2mUser: ${userDisplay} | Lib: ${libDisplay} | OS: ${platform.os}\x1b[0m\n`)
}

/**
 * TODO: Main execution flow.
 * Simple and direct to let CAC and Bun handle the execution.
 */
async function main() {
  try {
    await initApp()
    
    // 3. Register Commands
    registerLogin(cli)
    registerStatus(cli)
    registerImport(cli)
    registerLibrary(cli)

    cli.help()
    cli.parse()

    // If no command was matched and we just ran 'orbit'
    if (!cli.matchedCommand && process.argv.length <= 2) {
      cli.outputHelp()
    }
  } catch (error: any) {
    console.error(`\x1b[31mError:\x1b[0m ${error.message}`)
    process.exit(1)
  }
}

main()
