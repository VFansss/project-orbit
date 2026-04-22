import { cac } from 'cac'
import { Orbit, version } from '@orbit/core'
import { loadConfig } from './storage'

// Simple flat commands
import registerLogin from './commands/login'
import registerWhoami from './commands/whoami'
import registerImport from './commands/import'
import registerLibrary from './commands/library'

const cli = cac('orbit')

/**
 * TODO: Simple initialization and command execution.
 */
async function main() {
  try {
    // 1. Setup State
    Orbit.init({ os: process.platform as any, arch: process.arch, isMobile: false })
    
    const config = await loadConfig()
    if (config.currentUser) Orbit.updateUser(config.currentUser)
    if (config.currentLibraryPath) Orbit.updateLibrary(config.currentLibraryPath)

    // 2. Welcome Message
    const { user, library } = Orbit.state
    console.log(`\x1b[1mWelcome to Orbit v${version}\x1b[0m`)
    console.log(`\x1b[2mUser: ${user.id || 'anonymous'} | Lib: ${library.path || 'none'}\x1b[0m\n`)

    // 3. Register Commands
    registerLogin(cli)
    registerWhoami(cli)
    registerImport(cli)
    registerLibrary(cli)

    cli.help()
    cli.parse()
  } catch (error: any) {
    console.error(`\x1b[31mError:\x1b[0m ${error.message}`)
    process.exit(1)
  }
}

main()
