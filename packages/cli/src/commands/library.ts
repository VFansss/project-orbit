import type { CAC } from 'cac'
import * as p from '@clack/prompts'
import { Orbit, LIBRARY_MARKER, SystemUtils } from '@orbit/core'
import { loadConfig, saveConfig } from '../storage'
import { join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolvePath, getSuggestedLibraryPath } from '../paths'

export default (cli: CAC) => {
  cli
    .command('library [action] [path]', 'Manage the library directory (status, open, set, init)')

    .action(async (action?: string, path?: string) => {
      const config = await loadConfig()

      // Handle 'status' or 'info'
      if (action === 'status' || action === 'info') {
        if (!config.currentLibraryPath) {
          console.log('\x1b[33mNo active library configured.\x1b[0m Run "orbit library" or "orbit init" to create one.')
          return
        }
        const markerExists = await Bun.file(join(config.currentLibraryPath, LIBRARY_MARKER)).exists()
        const user = Orbit.state.user.isLoggedIn ? Orbit.state.user.id : (config.currentUser || 'anonymous')
        console.log('\n\x1b[34m--- Orbit Library Status ---\x1b[0m\n')
        console.log(`  \x1b[1mPath:\x1b[0m    ${config.currentLibraryPath}`)
        console.log(`  \x1b[1mMarker:\x1b[0m  ${markerExists ? '\x1b[32mValid (' + LIBRARY_MARKER + ')\x1b[0m' : '\x1b[31mMissing (' + LIBRARY_MARKER + ')\x1b[0m'}`)
        console.log(`  \x1b[1mUser:\x1b[0m    \x1b[32m${user}\x1b[0m\n`)
        return
      }


      // Handle the 'open' action specifically
      if (action === 'open') {
        if (!config.currentLibraryPath) {
          console.error(`\x1b[31mError:\x1b[0m No active library. Please initialize one first using 'orbit library'.`)
          process.exit(1)
        }
        
        console.log(`\x1b[34mOpening library folder:\x1b[0m ${config.currentLibraryPath}`)
        SystemUtils.openInExplorer(config.currentLibraryPath)
        return
      }

      // Default behavior (set / init)
      let targetPath = (action === 'set' || action === 'init') ? path : action

      
      if (!targetPath) {
        p.intro('\x1b[34mLibrary Setup\x1b[0m')
        const response = await p.text({
          message: 'Enter the directory path for your Orbit library:',
          initialValue: getSuggestedLibraryPath(),
          validate: (v) => v.length === 0 ? 'Path is required' : undefined
        })
        if (p.isCancel(response)) process.exit(0)
        targetPath = response as string
      }

      const absolutePath = resolvePath(targetPath)
      const markerPath = join(absolutePath, LIBRARY_MARKER)
      const markerFile = Bun.file(markerPath)
      const isLibrary = await markerFile.exists()

      if (!isLibrary) {
        const shouldInit = await p.confirm({
          message: `The directory "${absolutePath}" is not an Orbit library. Initialize it?`,
        })
        if (p.isCancel(shouldInit) || !shouldInit) {
          p.cancel('Operation cancelled.')
          process.exit(0)
        }

        const s = p.spinner()
        s.start('Initializing library marker...')
        try {
          await mkdir(absolutePath, { recursive: true })
          await writeFile(markerPath, `# Orbit Library Marker\n# This file identifies this folder as an Orbit library.\ncreated_at = ${new Date().toISOString()}`)
          s.stop('Library initialized.')
        } catch (err: any) {
          s.stop('Failed to initialize.', 1)
          console.error(`\x1b[31mError:\x1b[0m ${err.message}`)
          process.exit(1)
        }
      }

      config.currentLibraryPath = absolutePath

      await saveConfig(config)
      Orbit.updateLibrary(absolutePath)
      console.log(`\x1b[32mSuccess!\x1b[0m Library active at: ${absolutePath}`)
    })
}
