import type { CAC } from 'cac';
import * as p from '@clack/prompts';
import { ResourceManager, SystemUtils } from '@orbit/core';
import { loadConfig } from '../storage';

export default function registerResource(cli: CAC) {
  cli.command('resource [action] [id]', 'Manage external resources (list, update, open)')
    .option('--tag <tag>', 'Filter resources by tag (e.g. #bios, #dat)')
    .option('--force', 'Force re-download even if already downloaded')
    .action(async (rawAction?: any, rawId?: any, rawOptions?: any) => {
      const config = await loadConfig();
      const manager = new ResourceManager(config);

      const action = typeof rawAction === 'string' ? rawAction : undefined;
      const id = typeof rawId === 'string' ? rawId : undefined;
      const options = (typeof rawAction === 'object' ? rawAction : typeof rawId === 'object' ? rawId : rawOptions) || {};

      let targetAction = action;
      if (!targetAction) {
        p.intro('\x1b[34mExternal Resource Management\x1b[0m');
        const response = await p.select({
          message: 'Select an action:',
          options: [
            { value: 'list', label: 'List', hint: 'List registered resources and download status' },
            { value: 'update', label: 'Update / Sync', hint: 'Download or update external resources' },
            { value: 'open', label: 'Open', hint: 'Open resource folder in system file explorer' }
          ],
        });
        if (p.isCancel(response)) process.exit(0);
        targetAction = String(response);
      }

      if (targetAction === 'list') {
        const resources = await manager.listResources(options?.tag);
        
        if (resources.length === 0) {
          console.log('\x1b[33mNo resources found matching criteria.\x1b[0m');
          return;
        }

        console.log('\x1b[1m--- Orbit External Resources ---\x1b[0m\n');

        for (const res of resources) {
          const statusStr = res.downloaded 
            ? '\x1b[32m[Downloaded]\x1b[0m' 
            : '\x1b[31m[Not Downloaded]\x1b[0m';

          const tagsStr = res.definition.tags.map(t => `\x1b[36m${t}\x1b[0m`).join(' ');
          const versionStr = res.manifest?.version || res.definition.version || 'latest';

          console.log(`\x1b[1m${res.definition.name}\x1b[0m (\x1b[33m${res.definition.id}\x1b[0m) ${statusStr}`);
          console.log(`  Type: ${res.definition.type} | Tags: ${tagsStr} | Version: ${versionStr}`);
          console.log(`  License: ${res.definition.license} (${res.definition.licenseUrl})`);
          console.log(`  Source: ${res.definition.url}`);
          if (res.downloaded) {
            console.log(`  Local Path: \x1b[34m${res.localPath}\x1b[0m`);
          }
          console.log('');
        }
        return;
      }

      if (targetAction === 'open') {
        let targetId = id;
        if (!targetId) {
          const resources = await manager.listResources();
          const downloaded = resources.filter(r => r.downloaded);
          
          if (downloaded.length === 0) {
            const rootDir = manager.getResourcesRootDir();
            SystemUtils.openInExplorer(rootDir);
            console.log(`\x1b[32mOpened root resources directory in explorer:\x1b[0m ${rootDir}`);
            return;
          }

          const selectOpts = [
            { value: '_root', label: 'All Resources (Root Folder)', hint: manager.getResourcesRootDir() },
            ...downloaded.map(r => ({
              value: r.definition.id,
              label: r.definition.name,
              hint: r.localPath
            }))
          ];

          const selected = await p.select({
            message: 'Select resource directory to open:',
            options: selectOpts
          });

          if (p.isCancel(selected)) process.exit(0);
          targetId = String(selected);
        }

        const targetFolder = targetId === '_root' 
          ? manager.getResourcesRootDir() 
          : manager.getResourceDir(targetId);

        SystemUtils.openInExplorer(targetFolder);
        console.log(`\x1b[32mOpened in file explorer:\x1b[0m ${targetFolder}`);
        return;
      }

      if (targetAction === 'update' || targetAction === 'sync') {
        const s = p.spinner();

        if (id) {
          s.start(`Updating resource "${id}"...`);
          try {
            const status = await manager.fetchResource(id, options?.force ?? true);
            s.stop(`Resource "${status.definition.name}" updated successfully.`);
          } catch (err: any) {
            s.stop(`Failed to update resource "${id}".`, 1);
            console.error(`\x1b[31mError:\x1b[0m ${err.message}`);
          }
        } else {
          // Update all resources
          s.start('Updating all registered external resources...');
          try {
            const list = await manager.listResources(options?.tag);
            let count = 0;
            for (const res of list) {
              await manager.fetchResource(res.definition.id, options?.force ?? true);
              count++;
            }
            s.stop(`Updated ${count} resource(s) successfully.`);
          } catch (err: any) {
            s.stop('Failed to update resources.', 1);
            console.error(`\x1b[31mError:\x1b[0m ${err.message}`);
          }
        }
        return;
      }

      console.error(`\x1b[31mUnknown resource action:\x1b[0m ${targetAction}. Use 'list', 'update', or 'open'.`);
    });
}

