# Library Structure

- [Library Structure](#library-structure)
  - [orbit.library.toml](#orbitlibrarytoml)
  - [Metadata](#metadata)
  - [Games](#games)
  - [UserData](#userdata)


**General structure or root folder:**

- **_Staging**
  - A folder containing content parsed (or to be parsed) by Orbit before atomic commit into the main library.
  - Prefixed with `_` to appear first alphabetically.
  - Follows the identical directory hierarchy as the library root (e.g. `_Staging/Games/<platform>/<game>/`, `_Staging/UserData/Screenshots/...`).
  - Cannot contain another nested `_Staging` folder.
- **Metadata**
  - The central database of the library. Contains all game-related information and media.
  - See the dedicated [Metadata Documentation](./orbit-library/Metadata.md).
- **Games**
  - Main game binaries and accompanying assets divided by platform.
  - Platforms match entries in the [Supported Platform List](./Supported%20Platform%20List.md).
  - See the dedicated [Games Documentation](./orbit-library/Games.md).
- **Bios**
  - System BIOS and firmware files organized by platform.
  - See the dedicated [Bios Documentation](./orbit-library/Bios.md) and [Bios Command Documentation](./cli/Bios%20command.md).
- **UserData**
  - User-specific profile data (`Screenshots/`, `Clips/`, `Savedata/`).
  - See the dedicated [UserData Documentation](./orbit-library/UserData.md).
- **Exports**
  - Contains exported structures and symlinks for external frontends (EmulationStation, RomM, RetroArch).

---

## orbit.library.toml

A marker file that identifies the directory as an Orbit library root.

Contains library-wide information and global settings.

Example:

```toml
# Orbit Library Marker
# This file identifies this folder as an Orbit library.
created_at = 2026-04-23T19:32:42.188Z
```

---

## Metadata

This folder is the "Brain" of the library. It stores all persistent information about games that is shared across all users (`metadata.toml` and optional raw `sources/` cache).

For full details on the TOML schema, `[general]`, `[ids]`, `[relations]`, `[[sources]]`, and raw payload caching, see the dedicated [Metadata Documentation](./orbit-library/Metadata.md).

---

## Games

Contains the actual game binaries, images, installers, and accompanying assets organized by platform.

- **Single Container Rule:** Pure files on disk without uncompressed loose files (ISOs, `.zip`/`.7z`/`.rar` archives, or installer binaries).
- **Special Subfolders:** Standardized PascalCase folders for `Manual/`, `Patch/`, `Fix/`, `Translation/`, `NoCD/`, `DLC/`, `Extra/`, `checksum/`, and `keys.txt`.
- **Sub-Editions:** Multi-release titles are organized cleanly via sub-edition folders (`[GOG]`, `[Retail]`).

For full specifications on container rules, special folders, sub-editions, and naming standards, see the dedicated [Games Documentation](./orbit-library/Games.md).

---

## UserData

Contains user-specific profile data (`Screenshots/`, `Clips/`, `Savedata/`).

For full specifications on profile folders, screenshot naming conventions, tag stacking, and savegames, see the dedicated [UserData Documentation](./orbit-library/UserData.md).


