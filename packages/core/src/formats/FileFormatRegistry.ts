export type FormatContext = 'screenshot' | 'video' | 'game' | 'general';

/**
 * Standardized components extracted from a filename.
 */
export interface ExtractedFormat {
  gameName?: string;
  year?: number;
  timestamp?: Date;
  index?: number;
  originalName?: string;
  tags?: string[];
}

/**
 * A pattern definition for recognizing and parsing specific naming conventions.
 */
export interface FileFormatPattern {
  id: string;
  name: string;
  description: string;
  context: FormatContext;
  examples: string[];
  regex: RegExp;
  /**
   * Maps regex capture groups to a standardized ExtractedFormat object.
   */
  map: (match: RegExpMatchArray) => ExtractedFormat;
}

export const FILE_FORMAT_REGISTRY: FileFormatPattern[] = [
  {
    id: 'orbit-native',
    name: 'Orbit Native',
    description: 'The standard naming convention used by Orbit for processed files',
    context: 'general',
    examples: [
      '2024-02-11 13-34-23 (OriginalName).png',
      '2024-02-11 13-34-23_1 (OriginalName).png'
    ],
    // Group 1: Date (YYYY-MM-DD), Group 2: Time (HH-mm-ss), Group 3: Optional Index, Group 4: Original Name
    regex: /^(\d{4}-\d{2}-\d{2})\s+(\d{2}-\d{2}-\d{2})(?:_(\d+))?\s+\((.+)\)$/,
    map: (m) => {
      const [year, month, day] = m[1].split('-').map(Number);
      const [hours, minutes, seconds] = m[2].split('-').map(Number);
      return {
        timestamp: new Date(year, month - 1, day, hours, minutes, seconds),
        index: m[3] ? parseInt(m[3]) : undefined,
        originalName: m[4]
      };
    }
  },
  {
    id: 'windows-game-bar-screenshot',
    name: 'Windows Game Bar (Screenshot)',
    description: 'Format used by Windows Game Bar for screenshots (Win+Alt+PrtSc)',
    context: 'screenshot',
    examples: [
      'Alpha Protocol 11_02_2024 13_34_23 (1).png',
      'Aaero 02_03_2022 17_02_40.png'
    ],
    // Group 1: Game Name, Group 2: Date (DD_MM_YYYY), Group 3: Time (HH_mm_ss), Group 4: Optional Index
    regex: /^(.+?)\s+(\d{2}_\d{2}_\d{4})\s+(\d{2}_\d{2}_\d{2})(?:\s+\((\d+)\))?$/,
    map: (m) => {
      const [day, month, year] = m[2].split('_').map(Number);
      const [hours, minutes, seconds] = m[3].split('_').map(Number);
      return {
        gameName: m[1],
        timestamp: new Date(year, month - 1, day, hours, minutes, seconds),
        index: m[4] ? parseInt(m[4]) : undefined
      };
    }
  },
  {
    id: 'windows-game-bar-video',
    name: 'Windows Game Bar (Video)',
    description: 'Format used by Windows Game Bar for video captures (Win+Alt+R)',
    context: 'video',
    examples: [
      'RESIDENT EVIL 2 2019-12-23 20-57-37.mp4',
      'Sniper4 2019-10-09 23-45-57.mp4'
    ],
    // Group 1: Game Name, Group 2: Date (YYYY-MM-DD), Group 3: Time (HH-mm-ss)
    regex: /^(.+?)\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}-\d{2}-\d{2})$/,
    map: (m) => {
      const [year, month, day] = m[2].split('-').map(Number);
      const [hours, minutes, seconds] = m[3].split('-').map(Number);
      return {
        gameName: m[1],
        timestamp: new Date(year, month - 1, day, hours, minutes, seconds),
      };
    }
  },
  {
    id: 'euro-truck-2',
    name: 'Euro Truck Simulator 2',
    description: 'Internal screenshot format for ETS2',
    context: 'screenshot',
    examples: ['Euro Truck Simulator 2 29-01-2018 (ets2_00000).png'],
    // Group 1: Game Name, Group 2: Date (DD-MM-YYYY), Group 3: Internal ID/Original Name
    regex: /^(.+?)\s+(\d{2}-\d{2}-\d{4})\s+\((.+?)\)$/,
    map: (m) => {
      const [day, month, year] = m[2].split('-').map(Number);
      return {
        gameName: m[1],
        timestamp: new Date(year, month - 1, day),
        originalName: m[3]
      };
    }
  },
  {
    id: 'steam-indexed',
    name: 'Steam Indexed',
    description: 'Generic indexed format used by Steam for some games',
    context: 'screenshot',
    examples: ['Poster_000.png', 'Screenshot_1.jpg'],
    regex: /^(.+)_(\d+)$/,
    map: (m) => ({
      originalName: m[1],
      index: parseInt(m[2])
    })
  }
];
