import type { CAC } from 'cac';
import * as p from '@clack/prompts';
import { Orbit, BiosService } from '@orbit/core';
import { loadConfig } from '../storage';
import { resolvePath, getSuggestedPath } from '../paths';

import { homedir } from 'node:os';
import { join } from 'node:path';

export default function registerBios(cli: CAC) {
  cli.command('bios [action] [path]', 'Manage system BIOS and firmware (import, verify)')
    .option('--copy', 'Copy files instead of moving them', { default: false })
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
      const biosService = new BiosService(config);

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

        const s = p.spinner();
        s.start(`Scanning and identifying BIOS firmware at "${absolutePath}"...`);

        try {
          const results = await biosService.importBios(absolutePath, {
            copy: options.copy,
            force: options.force,
            platformFallback: options.platform
          });


          s.stop(`Import finished. Processed ${results.length} file(s).`);

          if (results.length === 0) {
            console.log('\x1b[33mNo valid BIOS files were processed.\x1b[0m');
            return;
          }

          console.log('\n\x1b[34m--- Imported BIOS Summary ---\x1b[0m\n');
          const ignoredList: string[] = [];

          for (const res of results) {
            if (res.actionTaken === 'imported') {
              console.log(`\x1b[32m[Imported]\x1b[0m \x1b[1m${res.filename}\x1b[0m ➡️ Bios/\x1b[36m${res.platform}\x1b[0m/`);
              console.log(`  Description: ${res.matchedEntry?.description || res.filename}`);
              console.log(`  SHA1: ${res.sha1}`);
              console.log('');
            } else if (res.actionTaken === 'skipped_already_exists') {
              console.log(`\x1b[36m[Skipped - Already Exists]\x1b[0m \x1b[1m${res.filename}\x1b[0m in Bios/\x1b[36m${res.platform}\x1b[0m/`);
              console.log(`  SHA1: ${res.sha1}`);
              console.log('');
            } else if (res.actionTaken === 'staged_unsupported') {
              console.log(`\x1b[33m[ALERT - Platform Not Curated]\x1b[0m \x1b[1m${res.filename}\x1b[0m ➡️ _staging/bios/`);
              console.log(`  Matched Platform: \x1b[36m${res.platform}\x1b[0m (Not currently curated in Orbit)`);
              console.log(`  SHA1: ${res.sha1}`);
              console.log('');
            } else if (res.actionTaken === 'ignored_unidentified') {
              ignoredList.push(res.sourcePath);
            }
          }

          if (ignoredList.length > 0) {
            console.log(`\x1b[33m[Notice] Ignored ${ignoredList.length} Unrecognized File(s) (Left Untouched at Source):\x1b[0m`);
            for (const path of ignoredList) {
              console.log(`  - ${path}`);
            }
            console.log('');
          }

          console.log('\x1b[32mSuccess!\x1b[0m BIOS import processing complete.');


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
