import * as p from '@clack/prompts'
import { Orbit } from '@orbit/core'
import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { resolvePath, getSuggestedLibraryPath } from '../../paths'

/**
 * TODO: Logic for parsing screenshots.
 */
export async function parseAction(path?: string, isInteractive: boolean) {
  let targetPath = path

  if (!targetPath && isInteractive) {
    const response = await p.text({
      message: 'Enter the source directory path:',
      initialValue: getSuggestedLibraryPath(),
      validate: (v) => v.length === 0 ? 'Path is required' : undefined
    })
    if (p.isCancel(response)) process.exit(0)
    targetPath = response as string
  }

  if (!targetPath) {
    throw new Error('Path is required for parse action.')
  }

  const { user, library } = Orbit.state
  const absolutePath = resolvePath(targetPath)
  const screenshotFolder = join(library.path, 'UserData', user.id!, 'screenshots')

  if (isInteractive) {
    p.log.info(`Source: \x1b[34m${absolutePath}\x1b[0m`)
    p.log.info(`Destination: \x1b[34m${screenshotFolder}\x1b[0m`)
  } else {
    console.log(`Source:      ${absolutePath}`)
    console.log(`Destination: ${screenshotFolder}`)
  }

  await mkdir(screenshotFolder, { recursive: true })
  
  const s = p.spinner()
  s.start('Scanning files...')
  // Future Core Logic...
  s.stop('Scan completed (PoC mode).')
}
