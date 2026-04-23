import type { CAC } from 'cac'
import * as p from '@clack/prompts'
import { getIGDBGame, getGameByExternalId } from '@orbit/core'
import { loadConfig } from '../storage'

/**
 * TODO: Precise metadata retrieval command.
 * Parameters aligned with 'search' command: igdb_id, steam_id, local.
 */
export default (cli: CAC) => {
  cli
    .command('get [source] [id]', 'Get full metadata for a specific game')
    .action(async (source?: string, id?: string) => {
      let targetSource = source;
      let targetId = id;

      // 1. Interactive fallback if arguments are missing
      if (!source || !id) {
        if (source && !id && process.stdin.isTTY) {
           console.error(`\n\x1b[31mError:\x1b[0m Missing identifier. Usage: \x1b[34morbit get <source> <id>\x1b[0m`);
           process.exit(1);
        }

        if (!targetSource) {
          p.intro('\x1b[34mOrbit Get Details\x1b[0m')
          const selectedSource = await p.select({
            message: 'Select the data source:',
            options: [
              { value: 'igdb_id', label: 'IGDB ID', hint: 'The numerical ID on igdb.com' },
              { value: 'steam_id', label: 'Steam ID', hint: 'The Steam AppID' },
              { value: 'local', label: 'Local', hint: 'The exact folder name in your library' },
            ]
          })
          if (p.isCancel(selectedSource)) process.exit(0)
          targetSource = selectedSource as string
        }

        if (!targetId) {
          const enteredId = await p.text({
            message: `Enter the ${targetSource}:`,
            validate: (v) => v.length === 0 ? 'Value is required' : undefined
          })
          if (p.isCancel(enteredId)) process.exit(0)
          targetId = enteredId as string
        }
      }

      const config = await loadConfig()
      const { igdbClientId, igdbClientSecret } = config.secrets

      const s = p.spinner()
      s.start(`Fetching details from ${targetSource} for: ${targetId}...`)
      
      try {
        let result: any;
        
        if (targetSource === 'igdb_id') {
          if (!igdbClientId || !igdbClientSecret) throw new Error("IGDB keys not configured.");
          result = await getIGDBGame(targetId!, igdbClientId, igdbClientSecret);
        } else if (targetSource === 'steam_id') {
          if (!igdbClientId || !igdbClientSecret) throw new Error("IGDB keys not configured.");
          // Source 1 is Steam in IGDB
          result = await getGameByExternalId(targetId!, 1, igdbClientId, igdbClientSecret);
        }

        if (!result || (Array.isArray(result) && result.length === 0)) {
          s.stop('Game not found.', 1);
          return;
        }

        const game = Array.isArray(result) ? result[0] : result;
        s.stop(`Details retrieved for: ${game.name}`);
        console.log(`\n\x1b[34m--- Metadata Inspection ---\x1b[0m`)
        console.dir(game, { depth: null, colors: true });
        console.log('');

      } catch (err: any) {
        s.stop('Error.', 1);
        console.error(`\x1b[31mError:\x1b[0m ${err.message}`);
      }
    })
}
