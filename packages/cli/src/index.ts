import { cac } from 'cac'
import { Orbit, validateIdentity, version } from '@orbit/core'
import type { PlatformStatus, OS } from '@orbit/core'
import { loadConfig, saveConfig } from './storage'

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

cli
  .command('login <id>', 'Login with your identity')
  .action(async (id: string) => {
    // We call initApp inside actions if needed, or at the start
    if (!validateIdentity(id)) {
      console.error(`\x1b[31mError:\x1b[0m Invalid identity. No spaces allowed.`)
      process.exit(1)
    }

    const config = await loadConfig()
    config.currentUser = id
    await saveConfig(config)
    
    Orbit.updateUser(id) 
    console.log(`\x1b[32mSuccess!\x1b[0m Logged in as: ${id}`)
  })

cli
  .command('whoami', 'Show current status')
  .action(async () => {
    const { user, platform } = Orbit.state
    
    console.log(`\x1b[34m--- Full Orbit Status ---\x1b[0m`)
    console.log(`User:     ${user.isLoggedIn ? user.id : '\x1b[31mNot logged in\x1b[0m'}`)
    console.log(`OS:       ${platform.os} (${platform.arch})`)
    console.log(`Mobile:   ${platform.isMobile ? 'Yes' : 'No'}`)
  })

cli
  .command('import <path>', 'Import games from a directory')
  .action((path: string) => {
    console.log(`\x1b[32mImporting from:\x1b[0m ${path}`)
  })

cli.help()

/**
 * TODO: Main execution flow.
 */
async function main() {
  await initApp()
  cli.parse()

  if (!cli.args.length && !process.argv.includes('--help') && !process.argv.includes('-h')) {
    cli.outputHelp()
  }
}

main()
