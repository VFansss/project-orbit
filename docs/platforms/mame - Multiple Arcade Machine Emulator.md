# mame - Multiple Arcade Machine Emulator

> [!NOTE]
> **MVP Scope:** In the MVP release, Orbit strictly supports **MAME 0.78 (MAME 2003)**. MAME operates exclusively in Monolithic Flatset mode (`flatsetPolicy: 'forced'`). Full set rebuilding and modern MAME versions (>0.200) are reserved for future milestones.

MAME is a multi-hardware emulation framework designed to preserve historical arcade games, vintage microcomputers, and arcade motherboards (CPS-1/2/3, Neo Geo, Sega System 16/32, Midway, Irem, Namco).

---

## Romset Flavors: Split vs Non-Merged vs Merged

Unlike console ROMs, arcade games consist of multiple raw EPROM/PROM silicon chip dumps packaged together. MAME organizes these chip archives into three distinct flavors:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MAME ROMSET FLAVORS                                │
├──────────────────┬───────────────────────────────┬──────────────────────────────┤
│ Flavor           │ How it works                  │ Best Used For                │
├──────────────────┼───────────────────────────────┼──────────────────────────────┤
│ 1. Split         │ • Parent has common chips     │ • Standard library storage   │
│    (Recommended) │ • Clone has ONLY delta chips  │ • Saves disk space           │
│                  │ • BIOS is a separate ZIP      │ • 100% clean & organized     │
├──────────────────┼───────────────────────────────┼──────────────────────────────┤
│ 2. Non-Merged    │ • Every ZIP is 100% standalone│ • Exporting single games     │
│                  │ • Clones contain Parent chips │ • Moving 1 game to a device  │
│                  │ • Duplicate BIOS chips inside │ • Wastes disk space          │
├──────────────────┼───────────────────────────────┼──────────────────────────────┤
│ 3. Merged        │ • Parent + All Clones in ONE  │ • Minimal file count         │
│                  │   single master ZIP           │ • Harder to browse files     │
│                  │ • No separate clone ZIP files │                              │
└──────────────────┴───────────────────────────────┴──────────────────────────────┘
```

### Detailed Breakdown:

1. **Split Set (`[FLATSET-0.78-split]`):**
   - **`puckman.zip` (Parent):** Contains the core CPU code, sound ROMs, and graphics tiles.
   - **`pacman.zip` (Clone - USA):** Contains *only* the modified title screen and USA gameplay tweak chips.
   - **Requirement:** To run `pacman.zip`, the emulator must find `puckman.zip` in the same directory.
   - **BIOS:** Dedicated separate archives (e.g. `neogeo.zip`).

2. **Non-Merged Set (`[FLATSET-0.78-nonmerged]`):**
   - Every single `.zip` file contains **all chips** required to boot that specific game.
   - `pacman.zip` includes both the USA chips and all duplicated parent chips from `puckman.zip`.
   - **Pros:** Any `.zip` can be copied individually to another folder or handheld and it boots standalone.
   - **Cons:** High disk redundancy (lots of duplicated chip data).

3. **Merged Set (`[FLATSET-0.78-merged]`):**
   - Parent and all of its clones are bundled together into a single `.zip` archive (e.g., `puckman.zip` holds Puckman, Pac-Man USA, Pac-Man Midway, and Pac-Man Speedup).
   - There is no separate `pacman.zip` on disk; the emulator queries `puckman.zip` and presents the user with the list of clones to launch.

---

## Serial & Machine Identification

Arcade boards do not have consumer packaging barcodes or console product serial numbers. Orbit identifies MAME titles through:

1. **Driver Shortname (8-character identifier):**
   - Canonical MAME driver name (e.g., `puckman`, `pacman`, `mslug`, `kinst`, `sf2`).
2. **Silicon Chip Hashes (Internal CRC32 & SHA1):**
   - Each chip file inside the `.zip` matches exact cryptographic hashes specified in the official MAME 0.78 XML database / DAT file.
3. **External Identifiers:**
   - Linked to IGDB, ScreenScraper, and Arcade-History IDs via Hasheous / Libretro DAT mapping.

---

## Golden preservation standards

Orbit's Golden Preservation Standard for MAME 0.78 is: **Clean ZIP archives (`.zip`) stored in a Monolithic Flatset with companion `samples/` audio folders and CHD disk images alongside a pinned `_info.toml` manifest**.

### Flatset Directory Structure

```text
Games/mame [FLATSET-0.78-split]/
├── _info.toml                       # Manifest pinned to the top (with leading underscore)
├── puckman.zip                      # Parent boot ROM
├── pacman.zip                       # Clone ROM
├── kinst.zip                        # Boot ROM for Killer Instinct
├── kinst/                           # Driver folder: CHDs are ALWAYS merged/shared by driver
│   └── kinst.chd                    # 1.5 GB disc image (never duplicated across clones)
└── samples/                         # Analog audio samples
    └── dkong.zip
```

### Rationale

- **Universal Compatibility:** Supported out-of-the-box by RetroArch (`mame2003-plus` / `mame2003`), standalone MAME, and all retro handheld OS (Batocera, GarlicOS, OnionOS).
- **Exact Version Lock-In:** Preserves the exact silicon chip dumps validated for the 0.78 engine without missing ROM crashes.
- **Shared CHD Rule:** CHDs are strictly shared/merged under canonical driver directories (e.g. `kinst/kinst.chd`), eliminating massive multi-gigabyte duplicates.
- **Pinned Manifest (`_info.toml`):** The leading underscore ensures the manifest file is always pinned to the top of large directories in file explorers and CLI tools.
- **Accompanying Assets:** Preserves analog audio `.wav` recordings in `samples/`.
- **100% Lossless:** ZIP archives retain raw uncompressed chip dumps with bit-for-bit integrity.


---

## Data sources

### MAMEdev & MAME 2003 Reference

- [MAME 2003 Reference](https://github.com/libretro/mame2003-libretro)
- Reference DAT and driver definitions for the 0.78 arcade codebase.
