import * as p from '@clack/prompts'

/**
 * TODO: Logic for syncing screenshot metadata.
 */
export async function syncAction(isInteractive: boolean) {
  if (isInteractive) {
    p.log.step('Syncing metadata...')
  } else {
    console.log('\x1b[33mSyncing...\x1b[0m')
  }
  console.log('Nothing to sync yet.')
}
