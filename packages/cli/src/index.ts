import { cac } from 'cac'
import { Orbit, version } from '@orbit/core'
import type { PlatformStatus, OS } from '@orbit/core'
import { loadConfig } from './storage'

// Command imports
import registerLogin from './commands/login'
import registerWhoami from './commands/whoami'
import registerImport from './commands/import'

const cli = cac('orbit')

/**
 * TODO: CLI-specific platform detection.
 */
function getCLIPlatform(): PlatformStatus {
  const { platform, arch } = process
  let os: OS = 'unknown'
  if (platform === 'win32') os = 'windows'
  else if (platform === 'linux') os = 'linux'
  else if (platform === 'darwin') os = 'macos'

  return { os, arch, isMobile: false }
}

/**
 * TODO: Initialize the core state and show a quick status line.
 */
async function initApp() {
  // 1. Tell the Core who we are (Platform)
  Orbit.init(getCLIPlatform())

  // 2. Read local settings and tell the Core who the user is
  const config = await loadConfig()
  if (config.currentUser) {
    Orbit.updateUser(config.currentUser)
  }

  const { user, platform } = Orbit.state
  const userDisplay = user.isLoggedIn ? `\x1b[32m${user.id}\x1b[0m` : '\x1b[33manonymous\x1b[0m'
  
  // Nice welcome message
  console.log(`\x1b[2mWelcome to Orbit v${version} | User: ${userDisplay} | OS: ${platform.os}\x1b[0m\n`)
}

// Register all commands
registerLogin(cli)
registerWhoami(cli)
registerImport(cli)

cli.help()

/**
 * TODO: Main execution flow.
 * Wrapped in try/catch to handle missing arguments or errors gracefully.
 */
async function main() {
  try {
    await initApp()
    cli.parse()

    if (!cli.args.length && !process.argv.includes('--help') && !process.argv.includes('-h')) {
      cli.outputHelp()
    }
  } catch (error: any) {
    console.error(`\n\x1b[31mError:\x1b[0m ${error.message}`)
    process.exit(1)
  }
}

main()
