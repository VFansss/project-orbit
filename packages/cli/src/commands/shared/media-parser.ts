import * as p from '@clack/prompts'
import { Orbit, FILE_FORMAT_REGISTRY, LibraryService, mapIGDBToGame, PathService, type FormatContext } from '@orbit/core'
import { join, extname, basename } from 'node:path'
import { readdir, stat, access } from 'node:fs/promises'
import { exec } from 'node:child_process'
import { platform as osPlatform } from 'node:os'
import { emitKeypressEvents } from 'node:readline'
import { resolvePath, getSuggestedLibraryPath } from '../../paths'
import { loadConfig } from '../../storage'
import { OperationBatch, CopyFileCommand, MoveFileCommand } from './operations'
import { cleanStagingAction } from '../staging'
import { formatResultForSelect } from '../ui-utils'

export type MediaType = 'screenshot' | 'clip'

interface MediaConfig {
  extensions: Set<string>
  folderName: string
  registryContext: FormatContext
  displayName: string
}

const MEDIA_CONFIGS: Record<MediaType, MediaConfig> = {
  screenshot: {
    extensions: new Set(['.jpg', '.jpeg', '.png', '.webp']),
    folderName: 'Screenshots',
    registryContext: 'screenshot',
    displayName: 'Screenshots'
  },
  clip: {
    extensions: new Set(['.mp4', '.mkv', '.mov', '.webm', '.avi']),
    folderName: 'Clips', // Following Orbit standard paths convention
    registryContext: 'video',
    displayName: 'Clips'
  }
}

/**
 * Removes invisible Unicode characters (like Zero-Width Space) that can break terminal prompts.
 */
function stripInvisibleChars(str: string): string {
  return str.replace(/[\u200B-\u200D\uFEFF\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
}

/**
 * Checks if a file exists.
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Opens a file using the system's default application.
 */
function openFilePreview(filePath: string) {
  const os = osPlatform()
  if (os === 'win32') {
    exec(`start "" "${filePath}"`)
  } else if (os === 'darwin') {
    exec(`open "${filePath}"`)
  } else {
    exec(`xdg-open "${filePath}"`)
  }
}

/**
 * Shows a countdown prompt. If the user doesn't answer in time, it auto-accepts.
 * If the user interacts (presses any key like arrows), the timer stops.
 */
async function autoConfirmCountdown(message: string, seconds: number = 4): Promise<boolean> {
  let timeoutId: NodeJS.Timeout
  let interrupted = false

  const timeoutPromise = new Promise<boolean>((resolve) => {
    timeoutId = setTimeout(() => {
      if (!interrupted) {
        // Simulate an Enter keypress to resolve the Clack prompt automatically
        process.stdin.emit('keypress', '\r', { name: 'return' })
        resolve(true)
      }
    }, seconds * 1000)
  })

  const onKeypress = (char: string, key: any) => {
    if (key && key.name !== 'return') {
      interrupted = true
      clearTimeout(timeoutId)
    }
  }

  process.stdin.on('keypress', onKeypress)

  const result = await Promise.race([
    p.confirm({
      message: `${message} (Auto-accepting in ${seconds}s)`,
      initialValue: true
    }),
    timeoutPromise
  ])

  process.stdin.removeListener('keypress', onKeypress)
  clearTimeout(timeoutId!)

  if (p.isCancel(result)) process.exit(0)
  
  return result as boolean
}

interface ScannedFile {
  path: string
  name: string
  gameNameHint?: string
  extracted?: any
}

/**
 * Recursively scans a directory for supported files.
 */
async function scanFiles(dir: string, recursive: boolean, config: MediaConfig): Promise<ScannedFile[]> {
  const results: ScannedFile[] = []
  const files = await readdir(dir, { withFileTypes: true })

  for (const file of files) {
    const fullPath = join(dir, file.name)
    if (file.isDirectory() && recursive) {
      results.push(...(await scanFiles(fullPath, recursive, config)))
    } else if (file.isFile()) {
      const ext = extname(file.name).toLowerCase()
      if (config.extensions.has(ext)) {
        // Try to match with registry
        let gameNameHint: string | undefined
        let extractedData: any = undefined
        const nameWithoutExt = basename(file.name, ext)
        
        const tryMatch = (nameToMatch: string) => {
          for (const pattern of FILE_FORMAT_REGISTRY) {
            if (pattern.context === 'general' || pattern.context === config.registryContext) {
              const match = nameToMatch.match(pattern.regex)
              if (match) {
                return pattern.map(match)
              }
            }
          }
          return undefined
        }

        extractedData = tryMatch(nameWithoutExt)

        if (extractedData) {
          if (extractedData.gameName) {
            gameNameHint = extractedData.gameName
          } else if (extractedData.originalName) {
            // It might be a wrapper format (like Orbit Native). Try to match the inner original name.
            const innerData = tryMatch(extractedData.originalName)
            if (innerData && innerData.gameName) {
              gameNameHint = innerData.gameName
            } else {
              // Fallback to the cleaned original name instead of the full wrapper name
              gameNameHint = extractedData.originalName.replace(/[-_]/g, ' ').trim()
            }
          }
        }

        results.push({
          path: fullPath,
          name: file.name,
          gameNameHint: stripInvisibleChars(gameNameHint || nameWithoutExt.replace(/[-_]/g, ' ').trim()),
          extracted: extractedData
        })
      }
    }
  }

  return results
}

/**
 * Generic logic for importing media files (screenshots or clips).
 */
export async function importMediaAction(mediaType: MediaType, path?: string, isInteractive: boolean = true, flags: any = {}) {
  // Suppress Node.js/Bun MaxListenersExceededWarning caused by rapid consecutive Clack prompts
  if (process.stdin.setMaxListeners) process.stdin.setMaxListeners(0)
  if (process.stdout.setMaxListeners) process.stdout.setMaxListeners(0)

  const mConfig = MEDIA_CONFIGS[mediaType]
  const orbitConfig = await loadConfig()
  const library = new LibraryService(orbitConfig)
  
  let targetPath = path
  let platform = flags.platform
  const isRecursive = !!flags.recursive
  const isDryRun = !!flags.dryRun
  const useCopy = !!flags.copy

  // 1. Path Selection
  if (!targetPath && isInteractive) {
    const response = await p.text({
      message: `Enter the source directory path for ${mConfig.displayName}:`,
      initialValue: getSuggestedLibraryPath(),
      validate: (v) => v.length === 0 ? 'Path is required' : undefined
    })
    if (p.isCancel(response)) process.exit(0)
    targetPath = response as string
  }

  if (!targetPath) throw new Error('Path is required for import action.')
  const absoluteSourcePath = resolvePath(targetPath)

  // 2. Platform Selection
  if (!platform && isInteractive) {
    const platforms = await library.getPlatforms()
    const response = await p.select({
      message: 'Select the target platform:',
      options: [
        ...platforms.map(plat => ({ value: plat, label: plat })),
        { value: 'custom', label: 'Other...', hint: 'Type a custom platform name' }
      ]
    })
    if (p.isCancel(response)) process.exit(0)
    
    if (response === 'custom') {
      const customPlat = await p.text({
        message: 'Enter custom platform name:',
        validate: (v) => v.length === 0 ? 'Platform is required' : undefined
      })
      if (p.isCancel(customPlat)) process.exit(0)
      platform = customPlat as string
    } else {
      platform = response as string
    }
  }

  if (!platform) throw new Error('Platform is required.')

  // 3. Scanning
  const s = p.spinner()
  s.start(`Scanning ${absoluteSourcePath}...`)
  let allFiles = await scanFiles(absoluteSourcePath, isRecursive, mConfig)
  s.stop(`Scan completed. Found ${allFiles.length} files.`)

  if (allFiles.length === 0) {
    p.log.warn(`No supported ${mConfig.displayName} files found in the source directory.`)
    return
  }

  // Quality of Life: Handle many files
  if (allFiles.length > 100 && isInteractive) {
    const limitResponse = await p.text({
      message: `Found ${allFiles.length} files. Process only the first 100? (Type "all" or leave empty to process everything)`,
      initialValue: '100'
    })
    if (p.isCancel(limitResponse)) process.exit(0)
    
    const limitStr = (limitResponse as string).trim().toLowerCase()
    if (limitStr !== 'all' && limitStr !== '') {
      const limit = parseInt(limitStr)
      if (!isNaN(limit)) {
        allFiles = allFiles.slice(0, limit)
        p.log.info(`Processing first ${allFiles.length} files.`)
      }
    }
  }

  // 4. Grouping
  const groups = new Map<string, ScannedFile[]>()
  for (const file of allFiles) {
    const key = file.gameNameHint || 'Unknown'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(file)
  }

  p.log.info(`Identified ${groups.size} potential game groups.`)

  // 5. Validation Loop (Batching)
  const batch = new OperationBatch()
  const groupNames = Array.from(groups.keys()).sort()
  const ignores = await library.getIgnores()
  
  let skippedCount = 0
  let lastSelectedGame: any = null
  
  p.log.step('Starting validation phase...')
  
  for (const groupName of groupNames) {
    if (ignores.includes(groupName)) {
      p.log.warn(`Skipping permanently ignored group: ${groupName}`)
      continue
    }

    const aliases = await library.getAliases()
    const suggestion = aliases[groupName]
    const suggestedQuery = suggestion || groupName

    const files = groups.get(groupName)!
    let selectedGame: any = null
    let groupResolved = false

    p.log.message(`\n\x1b[34mGroup: ${groupName}\x1b[0m (${files.length} files)`)

    // Initial Resolve attempt
    const results = await library.resolve(groupName, { scope: 'local', platforms: [platform] })

    // Auto match for exact local match
    if (results.length > 0 && results[0].confidence === 0) {
      selectedGame = results[0]
      p.log.success(`[Auto] Match: ${selectedGame.name} (Conf: 0)`)
      groupResolved = true
    } else if (results.length > 0 && results[0].confidence <= 2 && isInteractive) {
      const res = results[0]
      // Simulating the 3-4s delay by asking explicit confirmation for good but not perfect matches
      const confirm = await autoConfirmCountdown(`Match found: ${res.name} (${res.confidenceDescription}). Use this?`)
      if (confirm) {
        selectedGame = res
        groupResolved = true
      }
    }

    if (!groupResolved && isInteractive && suggestion) {
      p.log.message(`  \x1b[2mSuggested query: ${suggestion}\x1b[0m`)
    }

    // Refinement Loop
    while (!groupResolved && isInteractive) {
      const menuOptions: any[] = []
      
      const previewHint = files.length === 1 ? `Open the ${mediaType}` : `Select from ${files.length} files to preview`
      menuOptions.push({ value: 'preview', label: 'Preview File', hint: previewHint })

      if (lastSelectedGame && files.length === 1) {
        menuOptions.push({ value: 'previous', label: `It's ${lastSelectedGame.name}, use that`, hint: 'Use the game selected for the previous file' })
      }
      
      menuOptions.push({ value: 'search', label: 'Search', hint: 'Find locally/online for metadata, and save them if possible' })
      menuOptions.push({ value: 'skip', label: 'Skip Group', hint: 'Skip this session or permanently' })

      const action = await p.select({
        message: `Action for group "${groupName}":`,
        options: menuOptions
      })
      
      if (p.isCancel(action)) process.exit(0)

      if (action === 'previous') {
        selectedGame = lastSelectedGame
        groupResolved = true
      } else if (action === 'preview') {
        if (files.length === 1) {
          openFilePreview(files[0].path)
        } else {
          let previewing = true
          while (previewing) {
            const previewAction = await p.select({
              message: 'Select a file to preview:',
              options: [
                ...files.map((f, i) => ({ value: i, label: f.name })),
                { value: 'back', label: 'Back to actions' }
              ]
            })
            
            if (p.isCancel(previewAction) || previewAction === 'back') {
              previewing = false
            } else {
              openFilePreview(files[previewAction as number].path)
            }
          }
        }
        // Loop repeats
      } else if (action === 'skip') {
        const skipType = await p.select({
          message: 'Skip Group Option:',
          options: [
            { value: 'once', label: 'Skip once', hint: 'For this session only' },
            { value: 'perm', label: 'Ignore permanently', hint: 'Never ask again for this group name' },
            { value: 'back', label: 'Go back', hint: 'Return to actions' }
          ]
        })

        if (p.isCancel(skipType) || skipType === 'back') {
          // Loop repeats (back to actions)
        } else {
          if (skipType === 'perm') {
            await library.saveIgnore(groupName)
            p.log.warn(`Group "${groupName}" added to permanent ignore list.`)
          }
          groupResolved = true
          selectedGame = null
        }
      } else if (action === 'search') {
        const query = await p.text({ message: 'Search query:', initialValue: suggestedQuery })
        if (p.isCancel(query)) process.exit(0)
        
        let onlineFallback = true

        // 1. Local Search First
        s.start('Searching locally...')
        const localResults = await library.resolve(query as string, { scope: 'local', platforms: [platform] })
        s.stop('Local search completed.')

        if (localResults.length > 0) {
          const options = localResults.map((r, i) => formatResultForSelect(r, i))

          const selected = await p.select({
            message: 'Select the local game:',
            options: [
              ...options,
              { value: 'none', label: 'None of them', hint: 'Search online instead' }
            ]
          })
          
          if (p.isCancel(selected)) process.exit(0)
          
          if (selected !== 'none') {
            selectedGame = localResults[selected as number]
            groupResolved = true
            onlineFallback = false
            
            // Save alias for local manual match
            const targetId = selectedGame.ids.igdb ? `igdb:${selectedGame.ids.igdb}` : (selectedGame.ids.steam ? `steam:${selectedGame.ids.steam}` : `name:${selectedGame.name}:${platform}`)
            await library.saveAlias(groupName, targetId)
          }
        }

        // 2. Online Search Fallback
        if (onlineFallback) {
          s.start('Searching online...')
          const searchResults = await library.resolve(query as string, { scope: 'online', platforms: [platform] })
          s.stop('Online search completed.')

          if (searchResults.length === 0) {
            p.log.warn('No results found online.')
            // Loop repeats
          } else {
            const options = searchResults.map((r, i) => formatResultForSelect(r, i))

            const selected = await p.select({
              message: 'Select the online game:',
              options: [
                ...options,
                { value: 'none', label: 'None of them', hint: 'Go back to action selection' }
              ]
            })
            
            if (p.isCancel(selected)) process.exit(0)
            
            if (selected !== 'none') {
              selectedGame = searchResults[selected as number]
              
              // Automatically save metadata for online results
              s.start('Saving metadata...')
              try {
                let gameToSave;
                if (selectedGame.source === 'igdb' && selectedGame.ids.igdb) {
                  gameToSave = await library.fetchFullGameData('igdb', selectedGame.ids.igdb);
                }
                
                if (!gameToSave) {
                  gameToSave = mapIGDBToGame(selectedGame.metadata)
                }

                gameToSave.platform = platform as any
                await library.saveMetadata(gameToSave)
                s.stop('Metadata saved.')
                groupResolved = true

                // Save alias for online manual match
                const targetId = selectedGame.ids.igdb ? `igdb:${selectedGame.ids.igdb}` : `name:${selectedGame.name}:${platform}`
                await library.saveAlias(groupName, targetId)
              } catch (e: any) {
                s.stop('Failed to save metadata.')
                p.log.error(e.message)
                groupResolved = true
              }
            }
          }
        }
      }
    }

    if (selectedGame) {
      lastSelectedGame = selectedGame // Remember for the next iteration
      
      let safeGameName = selectedGame.name
      if (selectedGame.source === 'local') {
        safeGameName = PathService.getSafeFolderName(selectedGame.name)
      } else {
        try {
          const mapped = mapIGDBToGame(selectedGame.metadata)
          safeGameName = PathService.getSafeFolderName(mapped.name, mapped.metadata.general.release_year)
        } catch {
          safeGameName = PathService.getSafeFolderName(selectedGame.name)
        }
      }

      const stagingBase = join(Orbit.state.library.path, '_Staging', 'UserData', Orbit.state.user.id!, mConfig.folderName, platform, safeGameName)
      const finalBase = join(Orbit.state.library.path, 'UserData', Orbit.state.user.id!, mConfig.folderName, platform, safeGameName)

      const usedNames = new Set<string>()

      for (const file of files) {
        let fileDate = new Date()
        try {
          const fileStat = await stat(file.path)
          fileDate = fileStat.mtime
        } catch {}

        if (file.extracted?.timestamp) {
          fileDate = file.extracted.timestamp
        }

        const pad = (n: number) => n.toString().padStart(2, '0')
        const dateStr = `${fileDate.getFullYear()}-${pad(fileDate.getMonth() + 1)}-${pad(fileDate.getDate())}`
        const timeStr = `${pad(fileDate.getHours())}-${pad(fileDate.getMinutes())}-${pad(fileDate.getSeconds())}`
        
        let baseTimestamp = `${dateStr} ${timeStr}`
        if (file.extracted?.index !== undefined) {
          baseTimestamp += `_${file.extracted.index}`
        }

        const originalFileFullName = file.extracted?.originalName ? file.extracted.originalName : file.name

        let newFileName = `${baseTimestamp} -- ${originalFileFullName}`
        let counter = 1
        while (usedNames.has(newFileName)) {
          newFileName = `${baseTimestamp}_${counter} -- ${originalFileFullName}`
          counter++
        }
        usedNames.add(newFileName)

        const stagingPath = join(stagingBase, newFileName)
        const finalPath = join(finalBase, newFileName)
        
        // Check if already exists in destination
        if (await fileExists(finalPath)) {
          skippedCount++
          continue
        }

        const CommandClass = useCopy ? CopyFileCommand : MoveFileCommand
        batch.add(new CommandClass(file.path, stagingPath, finalPath, {
          gameName: safeGameName,
          platform
        }))
      }
    }
  }

  if (skippedCount > 0) {
    p.log.info(`Skipped ${skippedCount} files that already exist in the library.`)
  }

  // 6. Execution
  if (batch.length === 0) {
    p.log.warn('No operations to perform.')
    return
  }

  if (isDryRun) {
    batch.printDryRun()
    return
  }

  // Show detailed summary
  p.log.message('\n\x1b[34m--- Operation Summary ---\x1b[0m')
  const commands = batch.getCommands()
  // Group commands by game for a cleaner summary
  const summaryMap = new Map<string, number>()
  for (const cmd of commands) {
    const count = summaryMap.get(cmd.metadata.gameName) || 0
    summaryMap.set(cmd.metadata.gameName, count + 1)
  }
  
  for (const [gameName, count] of summaryMap.entries()) {
    p.log.message(`  \x1b[1m${gameName}\x1b[0m: ${count} file(s) to ${useCopy ? 'copy' : 'move'}`)
  }
  p.log.message(`\x1b[34m-------------------------\x1b[0m\n`)

  const proceed = await p.confirm({
    message: `Ready to process ${batch.length} total files. Proceed to staging?`,
    initialValue: true
  })
  if (!proceed || p.isCancel(proceed)) return

  const sExec = p.spinner()
  sExec.start('Staging files...')
  await batch.executeStaging((cur, tot) => {
    sExec.message(`Staging: ${cur}/${tot} files...`)
  })
  sExec.stop(`Staging completed. Files are ready in \x1b[34m_Staging\x1b[0m folder.`)

  const commit = await p.confirm({
    message: 'Commit changes to the library?',
    initialValue: true
  })

  if (commit && !p.isCancel(commit)) {
    sExec.start('Finalizing commit...')
    await batch.commitFinal((cur, tot) => {
      sExec.message(`Committing: ${cur}/${tot} files...`)
    })
    sExec.stop('Commit successful!')
    
    // Clean staging after a successful commit
    const handledStagingFiles = batch.getCommands().map(c => c.targetStaging)
    await cleanStagingAction(handledStagingFiles, true)
  } else {
    sExec.start('Rolling back staging...')
    await batch.rollbackStaging()
    sExec.stop('Staging cleared.')
    
    // Also clean up empty directories after rollback
    await cleanStagingAction([], false)
  }
}

