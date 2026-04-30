import type { CAC } from 'cac'
import * as p from '@clack/prompts'
import { LibraryService, URN_DEFINITIONS, type ResolveResult } from '@orbit/core'
import { loadConfig } from '../storage'

export default (cli: CAC) => {
  const displayUrnLegend = () => {
    console.log('\n\x1b[34m--- Supported Query Formats ---\x1b[0m')
    URN_DEFINITIONS.forEach(def => {
      console.log(`  \x1b[1m${def.example.padEnd(20)}\x1b[0m ${def.desc}`)
    })
    console.log('')
  }

  const printMetadata = (obj: any, indent = 2) => {
    const spaces = ' '.repeat(indent);
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        console.log(`${spaces}\x1b[1m${key}:\x1b[0m`);
        printMetadata(value, indent + 2);
      } else if (Array.isArray(value)) {
        const items = value.map(v => typeof v === 'object' ? JSON.stringify(v) : v).join(', ');
        console.log(`${spaces}\x1b[1m${key}:\x1b[0m [${items}]`);
      } else {
        console.log(`${spaces}\x1b[1m${key}:\x1b[0m ${value}`);
      }
    }
  }

  const printResult = (res: ResolveResult, showFullMetadata = false) => {
    const sourceName = res.source ? res.source.toUpperCase() : 'UNKNOWN'
    const scopeName = res.local?.exists ? 'LOCAL' : 'REMOTE'
    const statusLabel = ` [${sourceName}${res.local?.exists ? '' : ` - ${scopeName}`}]`
    const statusColor = res.local?.exists ? '\x1b[32m' : '\x1b[35m'
    
    console.log(`\n\x1b[1m${res.name}\x1b[0m${statusColor}${statusLabel}\x1b[0m`)
    console.log(`\x1b[2mConfidence: ${res.confidence} - ${res.confidenceDescription}\x1b[0m`)
    
    if (res.platform) console.log(`\x1b[1mPlatform:\x1b[0m ${res.platform}`)
    
    // Path and Structure display (for both existing and potential local folders)
    if (res.local) {
      const { local } = res
      console.log(`\x1b[1mPath:\x1b[0m ${local.path} ${local.exists ? '' : '\x1b[2m(potential)\x1b[0m'}`)
      console.log(`\x1b[1mLibrary Structure:\x1b[0m`)
      console.log(`  - Games Folder: ${local.exists ? '✅' : '❌'}`)
      console.log(`  - Metadata:     ${local.hasMetadata ? '✅' : '❌'}`)
      console.log(`  - Screenshots:  ${local.hasScreenshots ? '✅' : '❌'}`)
      console.log(`  - Savedata:     ${local.hasSavedata ? '✅' : '❌'}`)
    }

    if (Object.keys(res.ids).length > 0) {
      const idString = Object.entries(res.ids).map(([k, v]) => `${k}: ${v}`).join(', ')
      console.log(`\x1b[1mIDs:\x1b[0m ${idString}`)
    }

    if (showFullMetadata && res.metadata) {
      console.log(`\n\x1b[34m--- Metadata Details ---\x1b[0m`)
      if (res.source === 'local') {
        printMetadata(res.metadata);
      } else {
        console.dir(res.metadata, { depth: null, colors: true });
      }
    }
  }

  cli
    .command('search [query]', 'Search for games in library or online')
    .option('--platform <platform>', 'Filter by platform (comma separated)')
    .option('--content <type>', 'Filter local content (games, userdata)')
    .option('--offline', 'Search only in local library')
    .option('--remote', 'Search only online')
    .option('--both', 'Search both local and online (default)')
    .option('--metadata', 'Show full metadata details')
    .option('--json', 'Output results in JSON format')
    .action(async (query: string | undefined, flags: any) => {
      const config = await loadConfig()
      const library = new LibraryService(config)

      // Determine scope
      let scope: 'offline' | 'remote' | 'both' = 'both'
      const hasScopeFlag = flags.offline || flags.remote || flags.both
      
      if (flags.offline) scope = 'offline'
      else if (flags.remote) scope = 'remote'
      else if (flags.both) scope = 'both'
      else if (!flags.json) {
        // Always prompt if no flag is present and we are in a TTY
        p.intro('\x1b[34mOrbit Search\x1b[0m')
        const selectedScope = await p.select({
          message: 'Select search scope:',
          options: [
            { value: 'offline', label: 'Local Only (Offline)', hint: 'Fastest, scans your library' },
            { value: 'remote', label: 'Online Only (Remote)', hint: 'Search IGDB/Steam' },
            { value: 'both', label: 'Both (Default)', hint: 'Offline-first, then remote' }
          ]
        })
        if (p.isCancel(selectedScope)) process.exit(0)
        scope = selectedScope as any
      }

      let targetQuery = query
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

      // Ask for metadata if remote and not specified
      let showMetadata = flags.metadata
      if (!showMetadata && scope !== 'offline' && !flags.json) {
        const wantMetadata = await p.confirm({
          message: 'Do you want to see the full metadata for the results?',
          initialValue: false
        })
        if (!p.isCancel(wantMetadata)) showMetadata = wantMetadata
      }

      const s = flags.json ? null : p.spinner()
      if (s) s.start(`Searching (${scope}) for "${targetQuery}"...`)

      try {
        const platforms = flags.platform ? flags.platform.split(',') : undefined
        const content = flags.content ? flags.content.split(',') : undefined
        
        const results = await library.resolve(targetQuery, { 
          platforms, 
          content: content as any,
          scope,
          json: flags.json 
        })

        if (s) s.stop(`Search finished. Found ${results.length} results.`)

        if (flags.json) {
          console.log(JSON.stringify(results, null, 2))
          return
        }

        if (results.length === 0) {
          console.log('\x1b[33mNo games found.\x1b[0m')
          return
        }

        if (results.length === 1) {
          printResult(results[0], showMetadata)
        } else {
          console.log('\n\x1b[34m--- Multiple Matches Found ---\x1b[0m')
          const options = results.map((r, i) => {
            const sourceLabel = r.local?.exists ? 'Local' : (r.source ? r.source.toUpperCase() : 'Remote')
            const platformLabel = r.platform ? ` [${r.platform}]` : ''
            const idsLabel = Object.entries(r.ids).map(([k, v]) => `${k}:${v}`).join(', ')
            
            return {
              value: i,
              label: `${r.name}${platformLabel} (${sourceLabel})`,
              hint: `Conf: ${r.confidence} | ${idsLabel} | ${r.local?.relativePath || 'Remote'}`
            }
          })

          const selected = await p.select({
            message: 'Which game did you mean?',
            options
          })

          if (p.isCancel(selected)) process.exit(0)
          printResult(results[selected as number], showMetadata)
        }
      } catch (err: any) {
        if (s) s.stop('Search failed.', 1)
        console.error(`\x1b[31mError:\x1b[0m ${err.message}`)
      }
    })
}
