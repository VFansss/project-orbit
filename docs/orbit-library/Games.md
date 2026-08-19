# Games Specification

- [Games Specification](#games-specification)
  - [1. Core Philosophy](#1-core-philosophy)
  - [2. Platform Organization Models](#2-platform-organization-models)
    - [2.1 Curated Library Model (`Games/<platform>/`)](#21-curated-library-model-gamesplatform)
    - [2.2 Structured Set Model (`Games/<platform> [SET-<Tag>]/`)](#22-structured-set-model-gamesplatform-set-tag)
    - [2.3 Raw Dump Model (`Games/<platform> [RAW-DUMP]/`)](#23-raw-dump-model-gamesplatform-raw-dump)
  - [3. Curated Library Structure \& Editions](#3-curated-library-structure--editions)
    - [3.1 Single Edition Layout (Standard - 90%)](#31-single-edition-layout-standard---90)
    - [3.2 Multi-Edition Layout (Unified Rule)](#32-multi-edition-layout-unified-rule)
    - [3.3 Romhacks Classification (`[HACK]`)](#33-romhacks-classification-hack)
  - [4. Content Classification \& Non-Destructive Preservation](#4-content-classification--non-destructive-preservation)
  - [5. Container Mandate \& Golden Preservation Standards](#5-container-mandate--golden-preservation-standards)
    - [5.1 Single Container Rule](#51-single-container-rule)
    - [5.2 Platform Golden Preservation Standards](#52-platform-golden-preservation-standards)
    - [5.3 Multi-Part Archives (PC Exclusive)](#53-multi-part-archives-pc-exclusive)
  - [6. Standardized Special Subfolders](#6-standardized-special-subfolders)
  - [7. Checksums \& Archive Passwords](#7-checksums--archive-passwords)
    - [7.1 Checksum Sidecars (`checksum/`)](#71-checksum-sidecars-checksum)
    - [7.2 Archive Password Sidecars (`.password`)](#72-archive-password-sidecars-password)
  - [8. Naming \& Bracket Conventions](#8-naming--bracket-conventions)
  - [9. Relationship with Metadata](#9-relationship-with-metadata)

---

## 1. Core Philosophy

The `Games/` directory stores the actual binary payloads, installation media, disc images, and accompanying assets of games organized by platform.

- **File-System First:** Every game is self-contained, transparent, and inspectable without proprietary database locks.
- **Container Mandate for Modern \& PC Games:** Modern and PC games must be preserved as clean, single containers (ISOs, installer packages, or compressed archives). Uncompressed loose files are never left scattered in root game folders.
- **Golden Preservation Standards for Retro ROMs:** For classic consoles and handhelds, Orbit prefers the official "Golden Preservation Format" curated for each specific platform. See [Platform Documentation](../platforms/) for format rationales.
- **Separation of Concerns:** Game folders store binary data and physical extras (manuals, patches, fixes). Metadata (synopses, genres, ratings, developer info) is stored centrally in the [`Metadata/`](./Metadata.md) directory.

---

## 2. Platform Organization Models

Orbit supports three distinct directory archetypes under `Games/`:

```text
Games/
├── <platform>/                       # 1. Curated Library (1:1 with Metadata/ and UserData/)
├── <platform> [SET-<Tag>]/          # 2. Structured Romset (Deterministic offline indexing)
└── <platform> [RAW-DUMP]/            # 3. Raw / Unmanaged Dumps (Ignored by strict checks)
```

### 2.1 Curated Library Model (`Games/<platform>/`)
- Reserved for actively played, curated, and customized titles.
- Strict 1:1 parity with central [`Metadata/<platform>/<Name (Year)>/`](./Metadata.md) and user savedata in `UserData/<user>/Savedata/<platform>/<Name (Year)>/`.

### 2.2 Structured Set Model (`Games/<platform> [SET-<Tag>]/`)
- Designed for large-scale retro archives (thousands of titles).
- Games reside in deterministic subfolders: `<Game Name> [<algo>:<hash>]/` (using the platform's configured indexing algorithm, e.g. `[crc:<CRC32>]` for cartridge systems or `[sha1:<SHA1>]` for disc media).
- Stores raw offline metadata in a local `rom.info.toml` without cluttering central `Metadata/`.
- Titles can be copied and enriched on-demand into the Curated Library via the `orbit game promote` command.
- **PC Platform Restriction:** The `pc` platform **does not support or permit `[SET-...]` sets**. PC games are inherently heterogeneous and must be ingested into the Curated Library via Assisted Intake (Scaffold).

### 2.3 Raw Dump Model (`Games/<platform> [RAW-DUMP]/`)
- Transparent storage for raw unorganized dumps, unmanaged archives, or in-transit files. Orbit applies no schema or validation checks to `[RAW-DUMP]` folders.

---

## 3. Curated Library Structure & Editions

### 3.1 Single Edition Layout (Standard - 90%)

When a game has a single release, all assets and containers reside directly in the game root folder:

```text
Games/pc/Solar Adventure (2004)/
├── Solar Adventure.iso                 # Main game container (or setup.exe + .bin, or .zip)
├── Manual/                             # User manuals & guides
│   └── Manual.pdf
├── Patch/                              # Official updates & patches
├── Fix/                                # Community fixes & wrappers
├── Translation/                        # Language conversions & localized text
├── NoCD/                               # Preservation & compatibility bypasses
├── Extra/                              # Bonus soundtracks & artbooks
├── Serial/                             # Activation keys / CD-Keys
│   └── keys.txt
└── checksum/                           # Cryptographic checksum sidecars
    └── Solar Adventure.iso.sha256
```

---

### 3.2 Multi-Edition Layout (Unified Rule)

When preserving multiple distinct releases or variants of the same title (PC or Retro):
- **Shared Assets:** Root-level folders (`Manual/`, `Extra/`) are shared across all editions.
- **Edition-Specific Assets:** Each edition lives in its own dedicated sub-edition folder tagged with `[...]`.

```text
Games/pc/Solar Adventure (2004)/
├── Manual/                                       # Shared across all editions
│   └── Manual.pdf
├── Solar Adventure (2004) [Digital-DRMFree]/    # Edition 1 (Sub-edition folder)
│   ├── setup_solar_adventure.exe
│   └── setup_solar_adventure-1.bin
└── Solar Adventure (2004) [Retail-2CD]/         # Edition 2 (Sub-edition folder)
    ├── Disc 1.iso
    ├── Disc 2.iso
    ├── Serial/
    │   └── keys.txt
    └── checksum/
        ├── Disc 1.iso.sha256
        └── Disc 2.iso.sha256
```

---

### 3.3 Romhacks Classification (`[HACK]`)

- **Minor Modification / Translation / Patch:**  
  Lives as a sub-edition inside the canonical base game folder:  
  `Games/gba/Fantasy Quest (2003)/Fantasy Quest (2003) [HACK-FanTranslation]/`
- **Total Conversion / Standalone Romhack:**  
  Lives as an independent title with its own metadata:  
  `Games/gba/Fictional Custom Game (2020) [HACK]/`

---

## 4. Content Classification & Non-Destructive Preservation

When Orbit inspects a game directory, contents are classified into four categories:

| Category | Patterns & Locations | Orbit Behavior |
| :--- | :--- | :--- |
| **1. Standard Special Subfolders** | `Manual/`, `Patch/`, `Fix/`, `Translation/`, `NoCD/`, `DLC/`, `Extra/`, `Serial/`, `checksum/` | Standardized asset management. |
| **2. Explicit Sub-Editions** | Any directory name containing brackets `[...]` | Cataloged as distinct edition variants. |
| **3. Unmanaged Subfolders** | Directories without brackets (e.g. `Bonus Disc/`, `Data/`) | **Preserved:** Treated as unmanaged part of the primary release. Never deleted. |
| **4. Sidecar & Documentation Files** | `README.md`, `tree.txt`, `*.nfo`, `*.xml`, `*.torrent`, `*.jpg` | **Preserved:** Left intact as historical release metadata. Never stripped. |

---

## 5. Container Mandate & Golden Preservation Standards

### 5.1 Single Container Rule

To prevent filesystem fragmentation, slow indexing, inode exhaustion, and antivirus scanning overhead, Orbit **strictly forbids uncompressed loose files** in game root directories.

Examples of unmanaged structures that must be containerized:
- Extracted PC game directories containing thousands of loose `.dll`, `.pak`, `.exe`, and `.wav` files.
- Unencrypted disc dumps containing raw scattered folders (e.g. `PS3_GAME/` directory trees).

Any uncompressed game installation must be encapsulated into a `.zip` archive (using fast/store compression) before final ingestion.

### 5.2 Platform Golden Preservation Standards

For each platform, Orbit defines a curated "Golden Preservation Standard" (e.g., `.chd` for optical disc systems, `.zip` for cartridge ROMs).

For detailed format specifications and architectural rationales per platform, refer to the respective documentation in [`docs/platforms/<platform>.md`](../platforms/).

### 5.3 Multi-Part Archives (PC Exclusive)

Multi-volume archives (e.g. `game.part1.rar` ... `game.part5.rar` or `game.7z.001` ... `game.7z.004`) are recognized as a single logical archive set.

> [!IMPORTANT]
> Multi-part archives are **strictly exclusive to PC games**. No multi-part archive exceptions exist for console ROMs or disc systems.

---

## 6. Standardized Special Subfolders

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

---

## 7. Checksums & Archive Passwords

### 7.1 Checksum Sidecars (`checksum/`)
- For binary containers (`.iso`, `.exe`, `.bin`), Orbit calculates cryptographic checksums stored in `checksum/<filename>.<algo>` (SHA256 for PC, SHA1 for retro discs). See the [Hashing Standard](../standards/Hashing.md).
- `.zip` archives contain internal CRC32 verification tables within their central directory; therefore, Orbit does not generate redundant external checksum files for `.zip` containers.

### 7.2 Archive Password Sidecars (`.password`)
For password-protected archives, Orbit supports sidecar password files:
- **Naming:** `<archivename>.<ext>.password` (e.g. `patch_archive.zip.password`)
- **Content:** The raw password in plaintext, enabling Orbit to verify and inspect the archive without failure.

---

## 8. Naming & Bracket Conventions

Game directory naming follows a clean, human-readable token pattern:

```text
Game Name (Year) [[Tag]]
```

### Bracket Writing Standard (Strict)
- In automated writing and folder generation, key-value tags never contain spaces around delimiters:
  `[SET-RomsetName]`, `[RAW-DUMP]`, `[HACK-FanTranslation]`, `[crc:35536183]`, `[Retail-2CD]`, `[Digital]`.
- Parsers are lenient and tolerate human-created spacing (e.g. `[SET - Name]`).

### Examples:
- **Standard:** `Solar Adventure (2004)`
- **Unknown Year Mask:** `Vintage Game (199X)`
- **With Edition Tag:** `Solar Adventure (2004) [Digital-DRMFree]`
- **Multi-Disc Tag:** `Action Racer (2002) [Retail-2CD]`
- **Console with Serial:** `Stealth Operative (1998) [SLUS-00594]`

---

## 9. Relationship with Metadata

- **Canonical Central Record:** There is always exactly **one** canonical metadata folder per game: [`Metadata/<platform>/<Game Name (Year)>/metadata.toml`](./Metadata.md).
- **Tag Isolation:** Edition tags in `Games/` (e.g. `[Digital-DRMFree]`) do not duplicate or alter the canonical path in [`Metadata/`](./Metadata.md).
- **Edition-Specific Data:** Data strictly tied to a specific edition (e.g. specific installer version notes or CD-keys) remains stored locally in `Games/`.
