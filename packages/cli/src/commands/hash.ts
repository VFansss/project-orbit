import type { CAC } from 'cac'
import * as p from '@clack/prompts'
import { calculateFileHashes, type HashAlgorithm } from '@orbit/core'
import { resolvePath } from '../paths'
import { access } from 'node:fs/promises'


/**
 * Hash calculation command.
 */
export default (cli: CAC) => {
  cli
    .command('hash [action] [path]', 'Calculate file hashes (calculate, file, path)')
    .option('--algo <algorithms>', 'Comma separated algorithms (crc32,md5,sha1,sha256)')
    .option('--allow-large', 'Allow hashing files larger than 1GB', { default: false })
    .option('--scan-zip', 'Scan inside .zip archives in memory', { default: false })
    .option('--path <path>', 'Path to the target file')
    .option('--file <file>', 'Path to the target file')
    .action(async (action?: string, path?: string, flags: any = {}) => {
      const knownActions = ['calculate', 'file', 'path', 'calc']
      let targetAction = action
      let targetPath = flags.path || flags.file || path

      // If action is passed as a file path directly (e.g. 'orbit hash ./mygame.iso')
      if (action && !knownActions.includes(action.toLowerCase())) {
        targetPath = action
        targetAction = 'calculate'
      } else if (action && knownActions.includes(action.toLowerCase())) {
        targetAction = 'calculate'
      }

      // 1. Interactive action selection if missing
      if (!targetAction && !targetPath) {
        p.intro('\x1b[34mOrbit Hash Utility\x1b[0m')
        const response = await p.select({
          message: 'Select an action:',
          options: [
            { value: 'calculate', label: 'Calculate', hint: 'Compute hashes for a file or path' }
          ],
        })
        if (p.isCancel(response)) process.exit(0)
        targetAction = response as string
      }

      // 2. Path Selection
      if (!targetPath) {
        const response = await p.text({
          message: 'Enter the file path:',
          validate: (v) => v.trim().length === 0 ? 'Path is required' : undefined
        })
        if (p.isCancel(response)) process.exit(0)
        targetPath = response as string
      }

      const absolutePath = resolvePath(targetPath)

      // 2b. Existence check
      try {
        await access(absolutePath)
      } catch {
        console.error(`\n\x1b[31mError:\x1b[0m File not found: ${absolutePath}`)
        process.exit(1)
      }

      // 3. Algorithm Selection
      let algorithms: HashAlgorithm[] = []
      
      if (flags.algo) {
        algorithms = flags.algo.split(',').map((s: string) => s.trim().toLowerCase()) as HashAlgorithm[]
      } else if (path || (action && !knownActions.includes(action.toLowerCase())) || flags.path || flags.file) {
        // Direct non-interactive CLI invocation defaults to all algorithms
        algorithms = ['crc32', 'md5', 'sha1', 'sha256']
      } else {
        // Interactive menu prompt
        const response = await p.multiselect({
          message: 'Select algorithms to calculate (Space to select, Enter to confirm):',
          options: [
            { value: 'crc32', label: 'CRC32', hint: 'Standard for ROM sets' },
            { value: 'md5', label: 'MD5', hint: 'Fast, used by Hasheous' },
            { value: 'sha1', label: 'SHA1', hint: 'Recommended for disc media' },
            { value: 'sha256', label: 'SHA256', hint: 'Most secure / fast on modern CPUs' },
          ],
          initialValues: ['crc32', 'md5', 'sha1', 'sha256'],
          required: true
        })
        if (p.isCancel(response)) process.exit(0)
        algorithms = response as HashAlgorithm[]
      }

      // 4. Execution
      const shouldScanZip = !!(flags['scan-zip'] || flags.scanZip)
      const isZip = absolutePath.toLowerCase().endsWith('.zip')
      const s = p.spinner()
      if (isZip && shouldScanZip) {
        s.start(`Analyzing ZIP contents in memory: ${targetPath}...`)
      } else {
        s.start(`Calculating hashes for: ${targetPath}...`)
      }
      
      try {
        const results = await calculateFileHashes(absolutePath, algorithms, flags.allowLarge, shouldScanZip)
        s.stop('Calculation finished.')

        if (isZip && shouldScanZip) {
          console.log(`\n\x1b[33mNote:\x1b[0m Evaluated internal contents of ZIP archive.`)
        }

        console.log(`\n\x1b[34m--- Results ---\x1b[0m`)
        for (const res of results) {
          console.log(`\x1b[1mFile:\x1b[0m ${res.file} (${(res.size / 1024 / 1024).toFixed(2)} MB)`)
          if (res.hashes.crc32) console.log(`  \x1b[1mCRC32:\x1b[0m  ${res.hashes.crc32}`)
          if (res.hashes.md5)   console.log(`  \x1b[1mMD5:\x1b[0m    ${res.hashes.md5}`)
          if (res.hashes.sha1)  console.log(`  \x1b[1mSHA1:\x1b[0m   ${res.hashes.sha1}`)
          if (res.hashes.sha256)console.log(`  \x1b[1mSHA256:\x1b[0m ${res.hashes.sha256}`)
          console.log('')
        }
        console.log(`\x1b[34m---------------\x1b[0m\n`)

      } catch (err: any) {
        s.stop('Calculation failed.', 1)
        console.error(`\n\x1b[31mError:\x1b[0m ${err.message}`)
        process.exit(1)
      }
    })
}
