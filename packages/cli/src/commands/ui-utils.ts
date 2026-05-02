import { type ResolveResult, PathService } from '@orbit/core'

/**
 * Formats a ResolveResult for a Clack select menu.
 */
export function formatResultForSelect(r: ResolveResult, index: number) {
  const sourceLabel = r.local?.exists || r.local?.hasMetadata ? 'Local' : (r.source ? r.source.toUpperCase() : 'Remote')
  const yearLabel = r.year ? ` (${r.year})` : ''
  const platformLabel = r.platform ? ` [${r.platform}]` : ''
  const idsLabel = Object.entries(r.ids).map(([k, v]) => `${k}:${v}`).join(', ')
  
  const locs: string[] = []
  if (r.local) {
    if (r.local.exists) locs.push('Games')
    if (r.local.hasMetadata) locs.push('Metadata')
    if (r.local.hasSavedata) locs.push('Savedata')
    if (r.local.hasScreenshots) locs.push('Screenshots')
  }
  
  let destHint = 'Remote'
  if (locs.length > 0) {
    destHint = locs.join(' | ')
  } else if (r.platform) {
    // Predicted path for remote results: platform\SafeFolderName (Year)
    const safeName = PathService.getSafeFolderName(r.name, r.year)
    destHint = `${r.platform}\\${safeName}`
  }

  return {
    value: index,
    label: `${r.name}${yearLabel}${platformLabel} (${sourceLabel})`,
    hint: `Conf: ${r.confidence} | ${idsLabel} | ${destHint}`
  }
}
