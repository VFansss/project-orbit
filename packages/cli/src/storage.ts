import { PATHS } from './paths'
import type { OrbitConfig } from '@orbit/core'

/**
 * TODO: CLI-specific load function using Bun.
 */
export async function loadConfig(): Promise<OrbitConfig> {
  const file = Bun.file(PATHS.configFile)
  if (!(await file.exists())) return {}
  return await file.json()
}

/**
 * TODO: CLI-specific save function using Bun.
 */
export async function saveConfig(config: OrbitConfig): Promise<void> {
  await Bun.write(PATHS.configFile, JSON.stringify(config, null, 2))
}
