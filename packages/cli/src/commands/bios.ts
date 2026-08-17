import type { CAC } from 'cac';
import * as p from '@clack/prompts';
import { Orbit, BiosService, type IDataGateway } from '@orbit/core';
import { loadConfig } from '../storage';
import { resolvePath, getSuggestedPath } from '../paths';
import { homedir } from 'node:os';
import { join } from 'node:path';

export default function registerBios(cli: CAC, gateway: IDataGateway) {
  cli.command('bios [action] [path]', 'Manage system BIOS and firmware (import, verify)')
    .option('-r, --recursive', 'Scan source directory recursively', { default: false })
    .option('--copy', 'Copy files to library (default)', { default: true })
    .option('--move', 'Move files instead of copying them', { default: false })
    .option('--force', 'Force overwrite existing BIOS files', { default: false })
    .option('--platform <platform>', 'Specify or fallback platform name')

    .action(async (rawAction?: any, rawPath?: any, flags?: any) => {
      // Requirements Check
      const auth = Orbit.checkScopes(['USER_LOGGED']);
      if (!auth.authorized || !Orbit.state.library.isLoaded) {
        console.error(`\n\x1b[31mError:\x1b[0m Library and User Login are required.`);
        console.error(`\x1b[33mHint:\x1b[0m Run 'orbit init' to set up your library and login.`);
        process.exit(1);
      }

      const config = await loadConfig();
      const biosService = new BiosService(config, gateway);


      const action = typeof rawAction === 'string' ? rawAction : undefined;
      const path = typeof rawPath === 'string' ? rawPath : undefined;
      const options = (typeof rawAction === 'object' ? rawAction : typeof rawPath === 'object' ? rawPath : flags) || {};

      let targetAction = action;
      if (!targetAction) {
        p.intro('\x1b[34mOrbit System BIOS Management\x1b[0m');
        const response = await p.select({
          message: 'Select an action:',
          options: [
            { value: 'import', label: 'Import', hint: 'Identify and import BIOS binary file(s) into Bios/' },
            { value: 'verify', label: 'Verify', hint: 'Check validity and checksums of installed BIOS files' }
          ],
        });
        if (p.isCancel(response)) process.exit(0);
        targetAction = String(response);
      }

      if (targetAction === 'import' || targetAction === 'parse') {
        let targetPath = path;

        if (!targetPath) {
          const response = await p.text({
            message: 'Enter source file or folder path containing BIOS file(s):',
            initialValue: getSuggestedPath('import-source'),
            validate: (v) => v.trim().length === 0 ? 'Path is required' : undefined
          });

          if (p.isCancel(response)) process.exit(0);
          targetPath = String(response);
        }

        const absolutePath = resolvePath(targetPath);

        const isRecursive = options.recursive || options.r;
        const s = p.spinner();
        if (isRecursive) {
          s.start(`Scanning source directory RECURSIVELY at "${absolutePath}"...`);
        } else {
          s.start(`Scanning top-level files at "${absolutePath}" (pass -r/--recursive for subfolders)...`);
        }

        try {
          const shouldCopy = options.move ? false : (options.copy !== false);
          const results = await biosService.importBios(absolutePath, {
            copy: shouldCopy,
            force: options.force,
            recursive: isRecursive,
            platformFallback: options.platform
          });

          s.stop(`Import finished. Processed ${results.length} file(s).`);

          if (results.length === 0) {
            console.log('\x1b[33mNo files were found in source directory.\x1b[0m');
            return;
          }

          console.log('\n\x1b[34m--- Orbit BIOS Import Summary ---\x1b[0m\n');
          
          const imported = results.filter(r => r.actionTaken === 'imported');
          const skipped = results.filter(r => r.actionTaken === 'skipped_already_exists');
          const warned = results.filter(r => r.actionTaken === 'warn_unsupported_platform');
          const ignored = results.filter(r => r.actionTaken === 'ignored_unidentified');

          // 1. Ignored Non-BIOS Summary
          if (ignored.length > 0) {
            console.log(`\x1b[2m[x Ignored]\x1b[0m   ${ignored.length} Non-BIOS file(s) \x1b[2m(Left untouched at source)\x1b[0m`);
            if (ignored.length <= 5) {
              for (const item of ignored) {
                console.log(`  \x1b[2m• ${item.sourcePath}\x1b[0m`);
              }
            }
            console.log('');
          }

          // 2. Warnings (Un-curated platforms)
          for (const res of warned) {
            console.log(`\x1b[33m[! Warning]\x1b[0m  \x1b[1m${res.filename}\x1b[0m \x1b[33m(Matched platform "${res.platform}", which is not currently curated - Left untouched)\x1b[0m`);
            console.log(`  \x1b[2mFrom Source: ${res.sourcePath}\x1b[0m`);
            console.log(`  \x1b[2mSHA1: ${res.sha1}\x1b[0m\n`);
          }

          // 3. Skipped (Already existing identical BIOS)
          for (const res of skipped) {
            console.log(`\x1b[36m[= Skipped]\x1b[0m  \x1b[1m${res.filename}\x1b[0m \x1b[2m(Already exists in Bios/${res.platform}/ with matching hash)\x1b[0m`);
            console.log(`  \x1b[2mFrom Source: ${res.sourcePath}\x1b[0m\n`);
          }

          // 4. Imported BIOS (Prominently listed at bottom!)
          for (const res of imported) {
            const desc = res.matchedEntry?.description ? ` (\x1b[2m${res.matchedEntry.description}\x1b[0m)` : '';
            const matchInfo = res.matchMethod ? ` \x1b[32m[Matched via ${res.matchMethod.toUpperCase()} Hash]\x1b[0m` : '';
            console.log(`\x1b[32m[✓ Imported]\x1b[0m \x1b[1m${res.filename}\x1b[0m ➡️ Bios/\x1b[36m${res.platform}\x1b[0m/${desc}${matchInfo}`);
            console.log(`  \x1b[2mFrom Source: ${res.sourcePath}\x1b[0m`);
            console.log(`  \x1b[2mCRC32: ${res.crc32} | MD5: ${res.md5} | SHA1: ${res.sha1}\x1b[0m\n`);
          }


          if (options.move) {
            console.log('\x1b[33m[! Warning]\x1b[0m Source files were \x1b[1mmoved\x1b[0m (deleted from source location).');
          } else {
            console.log('\x1b[36m[Note]\x1b[0m Files were \x1b[1mcopied\x1b[0m to library (source files left untouched). Use \x1b[1m--move\x1b[0m to move files.');
          }

          console.log(`\x1b[32mSuccess!\x1b[0m Imported \x1b[1m${imported.length}\x1b[0m BIOS file(s).`);

        } catch (err: any) {
          s.stop('Import failed.', 1);
          console.error(`\x1b[31mError:\x1b[0m ${err.message}`);
          process.exit(1);
        }
        return;
      }

      if (targetAction === 'verify') {
        const s = p.spinner();
        s.start('Verifying installed BIOS checksums and firmware integrity...');

        try {
          const reports = await biosService.verifyBios(options.platform || path);
          s.stop(`Verification finished. Scanned ${reports.length} file(s).`);

          if (reports.length === 0) {
            console.log('\x1b[33mNo installed BIOS files found in library Bios/ folder.\x1b[0m');
            return;
          }

          console.log('\n\x1b[34m--- BIOS Verification Report ---\x1b[0m\n');
          let validCount = 0;
          let corruptedCount = 0;

          for (const rep of reports) {
            if (rep.status === 'valid') {
              validCount++;
              console.log(`\x1b[32m[OK]\x1b[0m Bios/\x1b[36m${rep.platform}\x1b[0m/\x1b[1m${rep.filename}\x1b[0m (SHA1: ${rep.foundSha1?.substring(0, 8)}...)`);
            } else {
              corruptedCount++;
              console.log(`\x1b[31m[CORRUPTED/MISMATCH]\x1b[0m Bios/\x1b[36m${rep.platform}\x1b[0m/\x1b[1m${rep.filename}\x1b[0m`);
              console.log(`  Expected: ${rep.expectedSha1}`);
              console.log(`  Found:    ${rep.foundSha1}`);
            }
          }

          console.log(`\nVerified ${reports.length} BIOS file(s): \x1b[32m${validCount} Valid\x1b[0m, \x1b[31m${corruptedCount} Corrupted\x1b[0m.`);
        } catch (err: any) {
          s.stop('Verification failed.', 1);
          console.error(`\x1b[31mError:\x1b[0m ${err.message}`);
          process.exit(1);
        }
        return;
      }

      console.error(`\x1b[31mUnknown bios action:\x1b[0m ${targetAction}. Use 'import' or 'verify'.`);
    });
}
