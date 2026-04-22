import type { CAC } from 'cac'
import * as p from '@clack/prompts'
import { Orbit, LIBRARY_MARKER } from '@orbit/core'
import { loadConfig, saveConfig } from '../storage'
import { join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolvePath, getSuggestedLibraryPath } from '../paths'

/**
 * TODO: Library management command.
 */
export default (cli: CAC) => {
  cli
    .command('library [path]', 'Set or initialize the active library directory')
    .action(async (path?: string) => {
      let targetPath = path

      // 1. Get path interactively if not provided
      if (!targetPath) {
        p.intro('\x1b[34mLibrary Setup\x1b[0m')
        const response = await p.text({
          message: 'Enter the directory path for your Orbit library:',
          initialValue: getSuggestedLibraryPath(),
          placeholder: 'If the directory doesn\'t exist, you will be asked to initialize it.',
          validate: (v) => v.length === 0 ? 'Path is required' : undefined
        })
        if (p.isCancel(response)) process.exit(0)
        targetPath = response as string
      }

      // 2. Resolve the path (handles ~/ and makes it absolute)
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
          await writeFile(markerPath, `# Orbit Library Marker\nCreated: ${new Date().toISOString()}`)
          s.stop('Library initialized.')
        } catch (err: any) {
          s.stop('Failed to initialize.', 1)
          console.error(`\x1b[31mError:\x1b[0m ${err.message}`)
          process.exit(1)
        }
      }

      // 4. Persistence
      const config = await loadConfig()
      config.currentLibraryPath = absolutePath
      await saveConfig(config)
      
      Orbit.updateLibrary(absolutePath)

      if (!path) {
        p.outro(`\x1b[32mLibrary active at:\x1b[0m ${absolutePath}`)
      } else {
        console.log(`\x1b[32mSuccess!\x1b[0m Library active at: ${absolutePath}`)
      }
    })
}
