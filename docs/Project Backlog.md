# Project Backlog

## MVP

- [x] Monorepo structure (`@orbit/core`, `@orbit/cli`)
- [x] Library marker & configuration (`orbit.library.toml`, `orbit.config.toml`)
- [x] Master folder specifications (`Library Structure.md`, `Metadata.md`, `Bios.md`, `UserData.md`)
- [x] **Searching Tool**: Search game info online in connected external sources
- [x] **Screenshot & Clip Tools**: CLI tools for managing `UserData/<profile>/Screenshots/` and `Clips/`.
- [x] Hashing & checksum standard (`Hashing.md`, `checksum/`, size-based heuristics)
- [x] Online metadata scraping & raw payload caching (`IGDB`, `sources/*.json`, `fetched_at`)
- [x] **Orbit External Resources Subsystem**: Resource definitions (`libretro-system-bios`), AppData storage, tag filtering, version manifest, `orbit resource list`, `orbit resource update`.
- [ ] **`orbit bios` Command Suite**

  - [ ] `orbit bios import <path>` (calculate hashes, match DATs, store in `Games/<platform>/_bios/`)
  - [ ] `orbit bios verify [platform]` (check firmware presence and binary integrity)
- [ ] **Offline Hash Index (Hasheous / DAT Lookup)**
  - [ ] Local sqlite/json lookup for `hash -> Game Name / IDs`
- [ ] **`orbit game import` Command Suite**
  - [ ] Simple ROMs import (GBA, NES, SNES)
  - [ ] Disc media conversion & import (PS1 ISO/CUE/BIN -> `.chd` via `chdman` sidecar)
  - [ ] Folder-based games import (PC)
- [ ] **Savedata Management**
  - [ ] Basic profile savegames structure (`UserData/<profile>/Savedata/<platform>/<game>/`)

## Future

- [ ] **`@orbit/mcp` Server**: Model Context Protocol server exposing `@orbit/core` to AI agents.
- [ ] **Export Symlinks / Junctions**: Export library structure for EmulationStation, RomM, or RetroArch.
- [ ] **SteamGridDB Integration**: Automatic image scraping for grids, heroes, and logos into `Assets/`.
