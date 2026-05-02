import { cac } from 'cac'
import { Orbit, version } from '@orbit/core'
import { loadConfig } from './storage'

// Commands
import registerLogin from './commands/login'
import registerStatus from './commands/status'
import registerLibrary from './commands/library'
import registerScreenshot from './commands/screenshot'
import registerConfig from './commands/config'
import registerSearch from './commands/search'

const cli = cac('orbit')

/**
 * TODO: Initialize the core state.
 */
async function initApp() {
  const config = await loadConfig()
  Orbit.init({ os: process.platform as any, arch: process.arch, isMobile: false }, config.logLevel)
  
  if (config.currentUser) Orbit.updateUser(config.currentUser)
  if (config.currentLibraryPath) Orbit.updateLibrary(config.currentLibraryPath)

  const { user, library, platform } = Orbit.state
  const userDisplay = user.isLoggedIn ? `\x1b[32m${user.id}\x1b[0m` : '\x1b[33manonymous\x1b[0m'
  const libDisplay = library.isLoaded ? `\x1b[34m${library.path}\x1b[0m` : '\x1b[31mnone\x1b[0m'
  
  console.log(`\x1b[1mWelcome to Orbit v${version}\x1b[0m`)
  console.log(`\x1b[2mUser: ${userDisplay} | Lib: ${libDisplay} | OS: ${platform.os}\x1b[0m\n`)
}

async function main() {
  try {
    await initApp()
    
    // Register all commands
    registerLogin(cli)
    registerStatus(cli)
    registerLibrary(cli)
    registerScreenshot(cli)
    registerConfig(cli)
    registerSearch(cli)

    cli.help()
    cli.parse()

    if (!cli.matchedCommand && process.argv.length <= 2) {
      cli.outputHelp()
    }
  } catch (error: any) {
    console.error(`\n\x1b[31mError:\x1b[0m`, error)
    process.exit(1)
  }
}

main()
