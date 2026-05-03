import { copyFile, rename, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export interface FileOperationMetadata {
  gameName: string
  platform: string
  formatId?: string
}

/**
 * Interface for a file operation command.
 */
export interface FileOperationCommand {
  type: 'copy' | 'move' | 'ignore'
  source: string
  targetStaging: string
  targetFinal: string
  metadata: FileOperationMetadata

  stage(): Promise<void>
  commit(): Promise<void>
  cleanup(): Promise<void>
  describe(): string
}

/**
 * Concrete implementation for Copy operation.
 */
export class CopyFileCommand implements FileOperationCommand {
  type = 'copy' as const

  constructor(
    public source: string,
    public targetStaging: string,
    public targetFinal: string,
    public metadata: FileOperationMetadata
  ) {}

  async stage() {
    await mkdir(dirname(this.targetStaging), { recursive: true })
    await copyFile(this.source, this.targetStaging)
  }

  async commit() {
    await mkdir(dirname(this.targetFinal), { recursive: true })
    // We move from staging to final to be efficient
    await rename(this.targetStaging, this.targetFinal)
  }

  async cleanup() {
    try {
      await rm(this.targetStaging, { force: true })
    } catch {
      // Ignore cleanup errors
    }
  }

  describe() {
    return `[COPY] ${this.source} -> ${this.targetFinal} (${this.metadata.gameName})`
  }
}

/**
 * Concrete implementation for Move operation.
 */
export class MoveFileCommand implements FileOperationCommand {
  type = 'move' as const

  constructor(
    public source: string,
    public targetStaging: string,
    public targetFinal: string,
    public metadata: FileOperationMetadata
  ) {}

  async stage() {
    await mkdir(dirname(this.targetStaging), { recursive: true })
    await rename(this.source, this.targetStaging)
  }

  async commit() {
    await mkdir(dirname(this.targetFinal), { recursive: true })
    await rename(this.targetStaging, this.targetFinal)
  }

  async cleanup() {
    try {
      await rm(this.targetStaging, { force: true })
    } catch {
      // Ignore cleanup errors
    }
  }

  describe() {
    return `[MOVE] ${this.source} -> ${this.targetFinal} (${this.metadata.gameName})`
  }
}

/**
 * Manages a batch of file operations.
 */
export class OperationBatch {
  private commands: FileOperationCommand[] = []

  add(command: FileOperationCommand) {
    this.commands.push(command)
  }

  get length() {
    return this.commands.length
  }

  getCommands() {
    return this.commands
  }

  async executeStaging(onProgress?: (current: number, total: number) => void) {
    let current = 0
    for (const cmd of this.commands) {
      if (cmd.type !== 'ignore') {
        await cmd.stage()
      }
      current++
      onProgress?.(current, this.commands.length)
    }
  }

  async commitFinal(onProgress?: (current: number, total: number) => void) {
    let current = 0
    for (const cmd of this.commands) {
      if (cmd.type !== 'ignore') {
        await cmd.commit()
      }
      current++
      onProgress?.(current, this.commands.length)
    }
  }

  async rollbackStaging() {
    for (const cmd of this.commands) {
      await cmd.cleanup()
    }
  }

  printDryRun() {
    console.log('\n\x1b[34m--- Planned Operations (Dry Run) ---\x1b[0m')
    if (this.commands.length === 0) {
      console.log('No operations to perform.')
    }
    for (const cmd of this.commands) {
      console.log(`  ${cmd.describe()}`)
    }
    console.log('\x1b[34m------------------------------------\x1b[0m\n')
  }
}
