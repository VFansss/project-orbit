import type { CAC } from 'cac'
import * as p from '@clack/prompts'
import { Orbit, LIBRARY_MARKER, LibraryService, URN_DEFINITIONS } from '@orbit/core'
import { loadConfig, saveConfig } from '../storage'
import { join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolvePath, getSuggestedLibraryPath } from '../paths'

export default (cli: CAC) => {
  const displayUrnLegend = () => {
    console.log('\n\x1b[34m--- Supported Query Formats ---\x1b[0m')
    URN_DEFINITIONS.forEach(def => {
      console.log(`  \x1b[1m${def.example.padEnd(20)}\x1b[0m ${def.desc}`)
    })
    console.log('')
  }

  cli
    .command('library [action] [val]', 'Manage Orbit library (set, resolve)')
    .option('--platform <platform>', 'Filter by platform (comma separated)')
    .option('--json', 'Output results in JSON format')
    .option('--offline', 'Skip online resolution')
    .option('--remote', 'Force online resolution even if found locally')
    .action(async (action: string | undefined, val: string | undefined, flags: any) => {
      // Check for help flag manually if needed or just handle empty action
      if (flags.help) return

      const config = await loadConfig()

      // Default behavior if no action
      if (!action) {
        console.log('Usage: orbit library <set|resolve> [args] [options]')
        displayUrnLegend()
        return
      }

      if (action === 'set') {
        // ... (rest of the code remains the same)
        let targetPath = val
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
        return
      }

      if (action === 'resolve') {
        if (!config.currentLibraryPath) {
          console.error('\x1b[31mError:\x1b[0m No library active. Use \x1b[34morbit library set <path>\x1b[0m first.')
          process.exit(1)
        }

        let targetQuery = val
        if (!targetQuery && !flags.json) {
          displayUrnLegend()
          const response = await p.text({
            message: 'Enter the query:',
            placeholder: 'e.g. name:XCOM 2 or steam:268500',
            validate: (v) => v.length === 0 ? 'Query is required' : undefined
          })
          if (p.isCancel(response)) process.exit(0)
          targetQuery = response as string
        }

        if (!targetQuery) {
          console.error('\x1b[31mError:\x1b[0m Query is required.')
          process.exit(1)
        }

        const library = new LibraryService(config)
        const s = flags.json ? null : p.spinner()
        if (s) s.start(`Resolving "${targetQuery}"...`)

        try {
          const platforms = flags.platform ? flags.platform.split(',') : undefined
          const results = await library.resolve(targetQuery, { 
            platforms, 
            offline: flags.offline, 
            remote: flags.remote 
          })

          if (s) s.stop(`Resolution finished. Found ${results.length} results.`)

          if (flags.json) {
            console.log(JSON.stringify(results, null, 2))
            return
          }

          if (results.length === 0) {
            console.log('\x1b[33mNo games found.\x1b[0m')
            return
          }
// Handle results display and interactive choice
if (results.length === 1) {
  const res = results[0]
  console.log(`\n\x1b[32mMatch Found\x1b[0m`)
  console.log(`\x1b[1mName:\x1b[0m ${res.name}`)
  console.log(`\x1b[1mConfidence:\x1b[0m ${res.confidence} - ${res.confidenceDescription}`)
  if (res.platform) console.log(`\x1b[1mPlatform:\x1b[0m ${res.platform}`)
  if (res.relativePath) console.log(`\x1b[1mRelative Path:\x1b[0m ${res.relativePath}`)
  if (res.path) console.log(`\x1b[1mAbsolute Path:\x1b[0m ${res.path}`)
  if (Object.keys(res.ids).length > 0) {
    console.log(`\x1b[1mIDs:\x1b[0m ${JSON.stringify(res.ids)}`)
  }
} else {
  console.log('\n\x1b[34m--- Multiple Matches Found ---\x1b[0m')
  const options = results.map((r, i) => ({
    value: i,
    label: `${r.name} [${r.platform || 'Unknown'}]`,
    hint: `Conf: ${r.confidence} | ${r.relativePath || 'Remote'}`
  }))

            const selected = await p.select({
              message: 'Which game did you mean?',
              options
            })
            if (p.isCancel(selected)) process.exit(0)
            const res = results[selected as number]
            console.log(`\n\x1b[32mSelected:\x1b[0m ${res.name}`)
            if (res.path) console.log(`\x1b[1mPath:\x1b[0m ${res.path}`)
          }
        } catch (err: any) {
          if (s) s.stop('Resolution failed.', 1)
          console.error(`\x1b[31mError:\x1b[0m ${err.message}`)
        }
        return
      }

      console.error(`\x1b[31mError:\x1b[0m Unknown library action "${action}". Use "set" or "resolve".`)
    })
}
