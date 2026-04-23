import type { CAC } from 'cac'
import * as p from '@clack/prompts'
import { performSearch, type SearchType, type SearchOptions, SearchTypeSchema } from '@orbit/core'
import { loadConfig } from '../storage'

/**
 * TODO: Universal search command with interactive fallback.
 * Syntax: orbit search [type] <query> [--offline]
 */
export default (cli: CAC) => {
  cli
    .command('search [val1] [val2]', 'Search for games (local and remote)')
    .option('--offline', 'Skip remote API queries')
    .action(async (val1: string | undefined, val2: string | undefined, options: { offline?: boolean }) => {
      let type: SearchType;
      let query: string;

      // 1. Interactive mode if no arguments provided
      if (!val1) {
        p.intro('\x1b[34mOrbit Search\x1b[0m')
        
        const selectedType = await p.select({
          message: 'How do you want to search?',
          options: [
            { value: 'name', label: 'Game Name (name - default)', hint: 'Fuzzy search by title' },
            { value: 'steam_id', label: 'Steam ID (steam_id)', hint: 'Match by Steam AppID' },
            { value: 'igdb_id', label: 'IGDB ID (igdb_id)', hint: 'Match by IGDB ID' },
            { value: 'hash', label: 'ROM Hash (hash)', hint: 'Match by file hash' },
          ]
        })
        
        if (p.isCancel(selectedType)) {
          p.cancel('Search cancelled.')
          process.exit(0)
        }
        type = selectedType as SearchType

        const enteredQuery = await p.text({
          message: `Enter the ${type}:`,
          validate: (v) => v.length === 0 ? 'Value is required' : undefined
        })

        if (p.isCancel(enteredQuery)) {
          p.cancel('Search cancelled.')
          process.exit(0)
        }
        query = enteredQuery as string
      } else {
        // 2. Direct CLI mode
        // If two args: val1 is type, val2 is query. 
        // If one arg: val1 is query, type is 'name'.
        type = val2 ? (val1 as SearchType) : 'name';
        query = val2 || val1;

        // Validation for type if provided
        if (val2) {
          const valid = SearchTypeSchema.safeParse(val1);
          if (!valid.success) {
            console.error(`\n\x1b[31mError:\x1b[0m Invalid search type "${val1}".`);
            process.exit(1);
          }
        }
      }

      const config = await loadConfig()
      const s = p.spinner()
      s.start(`Searching ${options.offline ? '(offline)' : ''} for ${type}: "${query}"...`)
      
      try {
        const searchOptions: SearchOptions = { type, query, offline: options.offline };
        const results = await performSearch(searchOptions, config);
        
        s.stop(`Search completed. Found ${results.length} results.`)
        
        if (results.length === 0) {
          console.log(`\x1b[33mNo games found.\x1b[0m`)
          return
        }

        console.log(`\n\x1b[34m--- Search Results ---\x1b[0m`)
        results.forEach(res => {
          const yearDisplay = res.year ? `(${res.year})` : ''
          const sourceColor = res.source === 'local' ? '\x1b[32m' : '\x1b[35m'
          
          // Use a label consistent with search types (e.g. igdb_id, steam_id)
          const idLabel = `${res.source}_id`
          let output = `${sourceColor}[${res.source}]\x1b[0m \x1b[1m${res.name}\x1b[0m ${yearDisplay} \x1b[2m[${idLabel}: ${res.id}]\x1b[0m`
          
          if (res.ids.steam) {
            output += ` \x1b[2m[steam_id: ${res.ids.steam}]\x1b[0m`
          }

          console.log(output)
        })
        console.log('')

        if (!val1) {
          p.outro('Search finished.')
        }
      } catch (err: any) {
        s.stop('Search failed.', 1)
        console.error(`\x1b[31mError:\x1b[0m ${err.message}`)
      }
    })
}
