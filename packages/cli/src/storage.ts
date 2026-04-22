import { homedir } from 'node:os'
import { join } from 'node:path'
import type { OrbitConfig } from '@orbit/core'

/**
 * TODO: CLI-specific storage path.
 */
export const CONFIG_PATH = join(homedir(), '.orbitrc.json')

/**
 * TODO: CLI-specific load function using Bun.
 */
export async function loadConfig(): Promise<OrbitConfig> {
  const file = Bun.file(CONFIG_PATH)
  if (!(await file.exists())) return {}
  return await file.json()
}

/**
 * TODO: CLI-specific save function using Bun.
 */
export async function saveConfig(config: OrbitConfig): Promise<void> {
  await Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2))
}
