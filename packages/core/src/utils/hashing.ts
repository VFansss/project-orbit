import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename } from 'node:path';
import yauzl from 'yauzl';
import type { Readable } from 'node:stream';

/**
 * Supported hash algorithms.
 */
export type HashAlgorithm = 'crc32' | 'md5' | 'sha1' | 'sha256';

/**
 * Standardized file hashes used for game identification.
 */
export interface FileHashes {
  crc32?: string;
  md5?: string;
  sha1?: string;
  sha256?: string;
}

export interface HashResult {
  file: string;
  size: number;
  hashes: FileHashes;
}

/**
 * A simple CRC32 implementation that supports streaming/chunking.
 */
class CRC32 {
  private static table: Int32Array = (() => {
    const t = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      t[i] = c;
    }
    return t;
  })();

  private crc = -1;

  update(data: Uint8Array) {
    let c = this.crc;
    const t = CRC32.table;
    for (let i = 0; i < data.length; i++) {
      c = t[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
    }
    this.crc = c;
  }

  digest(): string {
    return ((this.crc ^ -1) >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }
}

/**
 * Helper to calculate hashes from any Readable stream.
 */
function calculateHashesFromStream(stream: Readable, algorithms: HashAlgorithm[]): Promise<FileHashes> {
  return new Promise((resolve, reject) => {
    const hashers: Record<string, any> = {};
    
    if (algorithms.includes('md5')) hashers.md5 = new Bun.CryptoHasher("md5");
    if (algorithms.includes('sha1')) hashers.sha1 = new Bun.CryptoHasher("sha1");
    if (algorithms.includes('sha256')) hashers.sha256 = new Bun.CryptoHasher("sha256");
    if (algorithms.includes('crc32')) hashers.crc32 = new CRC32();

    stream.on('data', (chunk: Buffer) => {
      const uint8 = new Uint8Array(chunk);
      if (hashers.md5) hashers.md5.update(uint8);
      if (hashers.sha1) hashers.sha1.update(uint8);
      if (hashers.sha256) hashers.sha256.update(uint8);
      if (hashers.crc32) hashers.crc32.update(uint8);
    });

    stream.on('end', () => {
      const results: FileHashes = {};
      if (hashers.md5) results.md5 = hashers.md5.digest("hex");
      if (hashers.sha1) results.sha1 = hashers.sha1.digest("hex");
      if (hashers.sha256) results.sha256 = hashers.sha256.digest("hex");
      if (hashers.crc32) results.crc32 = hashers.crc32.digest();
      resolve(results);
    });

    stream.on('error', (err) => {
      reject(new Error(`Stream error during hashing: ${err.message}`));
    });
  });
}

/**
 * Extracts and hashes files inside a ZIP archive entirely in memory.
 */
function hashZipEntries(filePath: string, algorithms: HashAlgorithm[]): Promise<HashResult[]> {
  return new Promise((resolve, reject) => {
    const results: HashResult[] = [];
    
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err || new Error("Failed to open zip"));

      zipfile.readEntry();

      zipfile.on("entry", (entry: yauzl.Entry) => {
        if (/\/$/.test(entry.fileName)) {
          // Directory file names end with '/'. Skip them.
          zipfile.readEntry();
        } else {
          // File entry
          zipfile.openReadStream(entry, async (err, readStream) => {
            if (err || !readStream) return reject(err || new Error("Failed to read zip entry"));
            
            try {
              const hashes = await calculateHashesFromStream(readStream, algorithms);
              results.push({
                file: entry.fileName,
                size: entry.uncompressedSize,
                hashes
              });
              zipfile.readEntry(); // Read next entry
            } catch (streamErr) {
              reject(streamErr);
            }
          });
        }
      });

      zipfile.on("end", () => {
        resolve(results);
      });

      zipfile.on("error", (err) => {
        reject(err);
      });
    });
  });
}

/**
 * Calculates requested hashes for a file using streaming.
 * If the file is a .zip, it calculates hashes for all internal files in memory.
 * 
 * @param filePath Path to the file.
 * @param algorithms Array of algorithms to compute. Defaults to all.
 * @param allowLargeFiles If false, throws an error if file size > 1GB.
 */
export async function calculateFileHashes(
  filePath: string, 
  algorithms: HashAlgorithm[] = ['crc32', 'md5', 'sha1', 'sha256'],
  allowLargeFiles: boolean = false,
  scanZip: boolean = false
): Promise<HashResult[]> {
  
  const stats = await stat(filePath);
  const sizeGB = stats.size / (1024 * 1024 * 1024);
  
  if (sizeGB > 1 && !allowLargeFiles) {
    throw new Error(`File is too large (${sizeGB.toFixed(2)} GB). Safety block active. Use the correct flag to allow large files.`);
  }

  if (scanZip && filePath.toLowerCase().endsWith('.zip')) {
    return await hashZipEntries(filePath, algorithms);
  } else {
    // Normal file
    const stream = createReadStream(filePath);
    const hashes = await calculateHashesFromStream(stream, algorithms);
    return [{
      file: basename(filePath),
      size: stats.size,
      hashes
    }];
  }
}

