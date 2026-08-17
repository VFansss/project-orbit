import type { BiosReferenceEntry } from '../types';

export class ClrMameProParser {
  /**
   * Helper to infer platform slug from DAT comment string or filename.
   */
  public static inferPlatformSlug(comment?: string, filename?: string): string {
    const text = `${comment || ''} ${filename || ''}`.toLowerCase();

    if (text.includes('playstation 2') || text.includes('ps2')) return 'ps2';
    if (text.includes('playstation') || text.includes('ps1') || text.includes('psx') || (filename && filename.startsWith('scph'))) return 'ps1';
    if (text.includes('game boy advance') || text.includes('gba')) return 'gba';
    if (text.includes('game boy color') || text.includes('gbc')) return 'gbc';
    if (text.includes('game boy') || text.includes('gb')) return 'gb';
    if (text.includes('nintendo 64') || text.includes('n64')) return 'n64';
    if (text.includes('sega cd') || text.includes('mega cd') || text.includes('megacd')) return 'sega-cd';
    if (text.includes('dreamcast')) return 'dreamcast';
    if (text.includes('saturn')) return 'saturn';
    if (text.includes('neo geo') || text.includes('neogeo')) return 'neogeo';
    if (text.includes('3do')) return '3do';
    if (text.includes('atari 2600')) return 'atari2600';
    if (text.includes('atari 7800')) return 'atari7800';

    return 'unknown';
  }

  /**
   * Parses raw Libretro / ClrMamePro System.dat text line by line.
   */
  public static parseSystemBiosDat(rawContent: string): BiosReferenceEntry[] {
    const entries: BiosReferenceEntry[] = [];
    const lines = rawContent.split(/\r?\n/);
    
    let currentComment = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for comment header (e.g. comment "Sony - PlayStation")
      if (trimmed.startsWith('comment')) {
        const match = trimmed.match(/comment\s+"([^"]+)"/i);
        if (match) {
          currentComment = match[1];
        }
        continue;
      }

      // Check for rom entry line (e.g. rom ( name scph1001.bin size 524288 crc ... md5 ... sha1 ... ))
      if (trimmed.startsWith('rom') || trimmed.startsWith('rom (')) {
        const nameMatch = trimmed.match(/name\s+(?:"([^"]+)"|([^\s)]+))/i);
        const sizeMatch = trimmed.match(/\bsize\s+(\d+)/i);
        const crcMatch = trimmed.match(/\bcrc\s+([a-f0-9]+)/i);
        const md5Match = trimmed.match(/\bmd5\s+([a-f0-9]+)/i);
        const sha1Match = trimmed.match(/\bsha1\s+([a-f0-9]+)/i);

        if (nameMatch) {
          const filename = nameMatch[1] || nameMatch[2];
          const platform = ClrMameProParser.inferPlatformSlug(currentComment, filename);
          const description = currentComment ? `${currentComment} (${filename})` : filename;


          entries.push({
            platform,
            filename,
            description,
            size: sizeMatch ? parseInt(sizeMatch[1], 10) : 0,
            crc32: crcMatch ? crcMatch[1].toUpperCase() : undefined,
            md5: md5Match ? md5Match[1].toLowerCase() : undefined,
            sha1: sha1Match ? sha1Match[1].toLowerCase() : undefined
          });
        }
      }
    }

    return entries;
  }
}
