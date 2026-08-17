import type { OrbitResourceDefinition } from '../types';

export const biosResources: OrbitResourceDefinition[] = [
  {
    id: 'libretro-system-bios',
    name: 'Libretro System BIOS DAT',
    description: 'Official Libretro / RetroArch BIOS DAT file containing system firmware checksums (CRC32, MD5, SHA1)',
    type: 'data',
    tags: ['#bios', '#dat', '#libretro'],
    url: 'https://raw.githubusercontent.com/libretro/libretro-database/master/dat/System.dat',
    license: 'CC-BY-SA 4.0',
    licenseUrl: 'https://github.com/libretro/libretro-database/blob/master/LICENSE',
    version: 'latest'
  }
];
