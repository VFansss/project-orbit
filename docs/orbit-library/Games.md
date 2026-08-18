# Games Specification

- [Games Specification](#games-specification)
  - [1. Core Philosophy](#1-core-philosophy)
  - [2. File System Structure](#2-file-system-structure)
    - [2.1 Single Edition Layout (Standard)](#21-single-edition-layout-standard)
    - [2.2 Multi-Edition Layout (Multiple Releases)](#22-multi-edition-layout-multiple-releases)
  - [3. Container Mandate \& File Formats](#3-container-mandate--file-formats)
    - [3.1 Single Container Rule](#31-single-container-rule)
    - [3.2 Supported Formats \& Golden Preservation Standards](#32-supported-formats--golden-preservation-standards)
    - [3.3 Multi-Part Archives (PC Exclusive)](#33-multi-part-archives-pc-exclusive)
  - [4. Standardized Special Subfolders](#4-standardized-special-subfolders)
  - [5. Checksums \& Archive Passwords](#5-checksums--archive-passwords)
  - [6. Naming Conventions](#6-naming-conventions)
  - [7. Relationship with Metadata](#7-relationship-with-metadata)

---

## 1. Core Philosophy

The `Games/` directory stores the actual binary payloads, installation media, disc images, and accompanying assets of games organized by platform.

- **File-System First:** Every game is self-contained, transparent, and inspectable without proprietary database locks.
- **Container Mandate for Modern \& PC Games:** Modern and PC games must be preserved as clean, single containers (ISOs, installer packages, or compressed archives). Uncompressed loose files are never left scattered in root game folders.
- **Golden Preservation Standards for Retro ROMs:** For classic consoles and handhelds, Orbit prefers the official "Golden Preservation Format" curated for each specific platform (e.g. `.chd` for PlayStation, `.gba` for Game Boy Advance, `.nes` for NES).
- **Separation of Concerns:** Game folders store binary data and physical extras (manuals, patches, fixes). Metadata (synopses, genres, ratings, developer info) is stored centrally in the [`Metadata/`](./Metadata.md) directory.

---

## 2. File System Structure

Games are organized by platform slug, followed by canonical game folders:

```text
Games/<platform>/<Game Name (Year) [Edition]>/
```

- **`Game Name`** *(mandatory)*: The official display name of the title.
- **`(Year)`** *(mandatory)*: Initial release year. If the exact year is partially or completely unknown, wildcard mask syntax using `'X'` is supported (e.g., `"199X"`, `"200X"`, `"201X"`, `"20XX"`, or `"2XXX"`).
- **`[Edition]`** *(optional)*: Specific release tag or store identifier (e.g. `[Retail]`, `[Digital]`, `[GOG]`, `[2CD]`).

---

### 2.1 Single Edition Layout (Standard)

In the standard case (90% of titles), all files and special folders reside directly in the game folder:

```text
Games/pc/Far Cry (2004)/
├── Far Cry.iso                         # Main game container (or setup.exe + .bin, or .zip)
├── Manual/                             # Manuals, guides, maps
│   └── Manual.pdf
├── Patch/                              # Official updates & patches
│   └── far_cry_v1.4_cumulative.exe
├── Fix/                                # Community fixes, widescreen mods, wrappers
│   ├── Far_Cry_64bit_EC_Fix.zip
│   └── FCLoader_v5.2.zip
├── Translation/                        # Language conversions & localized text
│   └── Far.Cry.CNV.ITA.exe
├── NoCD/                               # Preservation & compatibility bypasses
│   └── FarCry_NoCD_v1.4.zip
├── Extra/                              # Wallpapers, soundtracks, artworks
│   └── Soundtrack.zip
├── Serial/                             # CD-Keys and serial numbers
│   └── keys.txt
└── checksum/                           # Cryptographic checksum sidecars
    └── Far Cry.iso.sha256
```

---

### 2.2 Multi-Edition Layout (Multiple Releases)

When preserving multiple distinct releases of the same title (e.g., Original Retail 2CD alongside Digital DRM-Free Edition):

```text
Games/pc/Far Cry (2004)/
├── Manual/                                  # Shared across all editions
│   └── Manual.pdf
├── Extra/                                   # Shared bonus materials
│   └── Soundtrack.zip
├── Far Cry (2004) [Digital DRM-Free]/       # Edition 1
│   ├── setup_far_cry_1.40_(29940).exe
│   └── setup_far_cry_1.40_(29940)-1.bin
└── Far Cry (2004) [Retail 2CD]/             # Edition 2
    ├── Disc 1.iso
    ├── Disc 2.iso
    ├── Patch/
    │   └── far_cry_v1.4_cumulative.exe
    ├── NoCD/
    │   └── FarCry_NoCD_v1.4.zip
    ├── Serial/
    │   └── keys.txt
    └── checksum/
        ├── Disc 1.iso.sha256
        └── Disc 2.iso.sha256
```

---

## 3. Container Mandate & File Formats

### 3.1 Single Container Rule

To prevent filesystem fragmentation, slow indexing, inode exhaustion, and antivirus scanning overhead, Orbit **strictly forbids uncompressed loose files** in game root directories.

Examples of unmanaged structures that must be containerized:
- Extracted PC game directories containing thousands of loose `.dll`, `.pak`, `.exe`, and `.wav` files.
- Unencrypted disc dumps containing raw scattered folders (e.g. `PS3_GAME/` directory trees).

Any uncompressed game installation must be encapsulated into a `.zip` archive (using fast/store compression) before final ingestion.

### 3.2 Supported Formats & Golden Preservation Standards

For each platform, Orbit defines a curated "Golden Preservation Standard". These standards are registered in code within `PlatformRegistry` (`platforms.ts`) and detailed in the respective platform specifications under `docs/platforms/<platform>.md`.

| Category | Formats | Platform Context |
| :--- | :--- | :--- |
| **Disc Images** | `.iso`, `.cue/.bin`, `.chd`, `.pbp`, `.mdf/.mds` | PC, PlayStation, Saturn, Dreamcast. (CHD is preferred for retro discs). |
| **Installers** | `.exe`, `.bin` | PC (Digital standalone or multi-part installer binaries). |
| **Archives** | `.zip`, `.7z`, `.rar` | PC dumps and containerized game directories. |
| **ROMs** | `.gba`, `.nes`, `.sfc`, `.md`, `.gb`, `.z64` | Cartridge-based console dumps. |

### 3.3 Multi-Part Archives (PC Exclusive)

Multi-volume archives (e.g. `game.part1.rar` ... `game.part5.rar` or `game.7z.001` ... `game.7z.004`) are recognized as a single logical archive set.

> [!IMPORTANT]
> Multi-part archives are **strictly exclusive to PC games**. No multi-part archive exceptions exist for console ROMs or disc systems.

---

## 4. Standardized Special Subfolders

Orbit reserves a set of standardized subfolders (written in **PascalCase**, resolved **case-insensitively**):

| Subfolder / File | Purpose & Contents |
| :--- | :--- |
| **`Manual/`** | Official user manuals, strategy guides, reference cards, and map images (`.pdf`, `.txt`, `.rtf`, `.jpg`, `.png`). |
| **`Patch/`** | Official game patches, updates, cumulative hotfixes, and service packs. |
| **`Fix/`** | Community patches, widescreen fixes, graphical wrappers (`dgVoodoo2`), frame rate uncappers, and controller injectors (`GInput`). |
| **`Translation/`** | Fan translations, language conversion packages, audio/text localizations, and patchers. |
| **`NoCD/`** | Preservation executables, No-CD patches, and compatibility bypasses required to run vintage titles on modern operating systems. |
| **`DLC/`** | Official expansions, episodic add-on packs, and downloadable bonus content. |
| **`Extra/`** | Digital bonus content: wallpapers, avatars, digital artbooks, and official soundtracks. |
| **`Serial/`** | Dedicated folder containing activation keys, CD-Keys, and serial codes (`keys.txt` or `serials.txt`). |
| **`_installed_game_folder/`** | *Temporary intake directory:* Drop raw, uncompressed game folders here during scaffolding; Orbit automatically packages them into a fast `.zip` archive during commit. |
| **`checksum/`** | Checksum sidecar files (`.sha256`, `.sha1`, `.md5`, `.crc32`) for non-archive binary containers. |

> [!NOTE]
> Any file placed directly in the root of the game folder (outside special subfolders) is preserved as part of the core game container payload.

---

## 5. Checksums & Archive Passwords

### 5.1 Checksum Sidecars (`checksum/`)
- For binary containers (`.iso`, `.exe`, `.bin`), Orbit calculates cryptographic checksums stored in `checksum/<filename>.<algo>` (SHA256 for PC, SHA1 for retro discs). See the [Hashing Standard](../standards/Hashing.md).
- `.zip` archives contain internal CRC32 verification tables within their central directory; therefore, Orbit does not generate redundant external checksum files for `.zip` containers.

### 5.2 Archive Password Sidecars (`.password`)
For password-protected archives, Orbit supports sidecar password files:
- **Naming:** `<archivename>.<ext>.password` (e.g. `patch_archive.zip.password`)
- **Content:** The raw password in plaintext, enabling Orbit to verify and inspect the archive without failure.

---

## 6. Naming Conventions

Game directory naming follows a clean, human-readable token pattern:

```text
Game Name (Year) [[Edition/Tag]]
```

### Examples:
- **Standard:** `Far Cry (2004)`
- **Unknown Year Mask:** `Vintage Game (199X)`
- **With Edition Tag:** `Far Cry (2004) [Digital DRM-Free]`
- **Multi-Disc Tag:** `Grand Theft Auto Vice City (2002) [2CD]`
- **Console with Serial:** `Metal Gear Solid (1998) [SLUS-00594]`

> [!IMPORTANT]
> Orbit uses clean, descriptive preservation tags (e.g. `[Retail]`, `[Digital]`, `[GOG]`, `[2CD]`, `[Special Edition]`, `[Director's Cut]`).

---

## 7. Relationship with Metadata

- **Canonical Central Record:** There is always exactly **one** canonical metadata folder per game: [`Metadata/<platform>/<Game Name (Year)>/metadata.toml`](./Metadata.md).
- **Tag Isolation:** Edition tags in `Games/` (e.g. `[Digital DRM-Free]`) do not duplicate or alter the canonical path in [`Metadata/`](./Metadata.md).
- **Edition-Specific Data:** Data strictly tied to a specific edition (e.g. specific installer version notes or CD-keys) remains stored locally in `Games/`.
