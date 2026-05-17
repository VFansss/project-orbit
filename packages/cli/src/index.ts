import { cac } from 'cac'
import { Orbit, version, LocalNodeGateway, IgdbHandler, LocalFsHandler, HasheousHandler } from '@orbit/core'
import { loadConfig } from './storage'

// Commands
import registerLogin from './commands/login'
import registerStatus from './commands/status'
import registerLibrary from './commands/library'
import registerScreenshot from './commands/screenshot'
import registerClip from './commands/clip'
import registerConfig from './commands/config'
import registerSearch from './commands/search'
import registerStaging from './commands/staging'
import registerHash from './commands/hash'

const cli = cac('orbit')

export const gateway = new LocalNodeGateway();

/**
 * TODO: Initialize the core state.
 */
async function initApp() {
  const config = await loadConfig()
  Orbit.init({ os: process.platform as any, arch: process.arch, isMobile: false }, config.logLevel)
  
  // Register Gateway Handlers
  gateway.registerHandler('file', new LocalFsHandler());
  if (config.secrets.igdbClientId && config.secrets.igdbClientSecret) {
    gateway.registerHandler('igdb', new IgdbHandler(config.secrets.igdbClientId, config.secrets.igdbClientSecret));
  }
  gateway.registerHandler('hasheous', new HasheousHandler(config.secrets.hasheousApiKey));

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
    registerClip(cli)
    registerConfig(cli)
    registerSearch(cli)
    registerStaging(cli)
    registerHash(cli)

    cli.help((sections) => {
      const cmdsIndex = sections.findIndex(s => s.title === 'Commands')
      if (cmdsIndex !== -1) {
        const bodyLines = sections[cmdsIndex].body.split('\n')
        
        const getCmds = (prefixes: string[]) => bodyLines.filter(line => prefixes.some(p => line.trim().startsWith(p))).join('\n')

        const setup = getCmds(['login', 'library', 'config'])
        const myLibrary = getCmds(['status', 'search'])
        const myMedia = getCmds(['screenshot', 'clip'])
        const maintenance = getCmds(['staging', 'hash'])

        sections.splice(cmdsIndex, 1,
          { title: '\x1b[35mSetup\x1b[0m', body: setup },
          { title: '\x1b[36mMy Library\x1b[0m', body: myLibrary },
          { title: '\x1b[32mMy Media\x1b[0m', body: myMedia },
          { title: '\x1b[33mMaintenance\x1b[0m', body: maintenance }
        )
      }

      // Remove the redundant list of command help examples
      const extraIndex = sections.findIndex(s => s.title?.includes('For more info'))
      if (extraIndex !== -1) {
        sections.splice(extraIndex, 1, {
          title: 'Tip',
          body: 'Run \x1b[1morbit <command> --help\x1b[0m for more information on a specific command.'
        })
      }
    })
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
