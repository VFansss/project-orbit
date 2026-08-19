# Game command

The `game` command manages, imports, promotes, and verifies game binaries and accompanying assets for the various platforms supported by Orbit.

All files are stored inside the `Games/` folder of the active library, following the "Just-in-Time" (JIT) folder creation convention (directories are only created when needed).

When invoked without positional arguments or flags, it displays an interactive prompt allowing the user to select between available actions (`import`, `promote`, or `verify`).

```bash
# Interactive mode
bun orbit game

# Direct sub-commands
bun orbit game import [path] [--platform <slug>] [--mode <auto|scaffold>]
bun orbit game promote [name] [--from <set-slug>] [--scaffold]
bun orbit game verify [platform]
```

---

## 1. Platform Ingestion Policy (`scaffold_mode`)

Platforms define how game content is ingested via the `scaffold_mode` property:

- **`forced` (e.g. `pc`):** The Assisted Intake (Scaffold) workflow is mandatory. PC games consist of complex, heterogeneous files (ISOs, multi-part installers, manuals, patches, fixes) that require structured folder assembly.
- **`choose` (e.g. `gba`, `nes`, `ps1`):** Defaults to automated batch ROM scanning, but allows the user to opt into the Scaffold wizard (via interactive prompt or `--mode scaffold`) to assemble rich retro game bundles with manuals, fan translations, and community patches.
- **`disabled`:** Pure direct autoscan for platforms where only raw ROM dumps are accepted.

---

## 2. Pre-flight Staging & Hashing Hygiene

1. **Silent Staging Purge:** Before initiating any import session, Orbit **automatically and silently purges** any residual files from `_Staging/Games/<platform>/` to ensure a 100% clean workspace.
2. **Pre-Commit Checksum Validation:** Before moving or modifying any files in `Games/`, Orbit **computes and validates all candidate checksums in staging**. If any file is locked, unreadable, or corrupted, Orbit **aborts the entire batch immediately**, leaving the library completely untouched.

---

## 3. `import`

The `import` sub-command imports games into the local Orbit library using either the **Assisted Intake (Scaffold)** engine or the **Automated Batch Ingestion** engine.

### 3.1 Assisted Intake (Scaffold) Workflow

Used for PC games and rich retro packages.

#### Phase 1: One-by-One Intake Loop
For each game the user wishes to ingest:

1. **Identification & Search:**  
   The user inputs a game title. Orbit queries `@orbit/core` service-level search (`LibraryService.resolve` combining IGDB and local library cache) and displays interactive matching candidates. Selecting a candidate automatically locks in the canonical `Name (Year)` and metadata IDs. (A manual entry option is always available).
2. **Staging Preparation:**  
   Orbit prepares a clean staging workspace in `_Staging/Games/<platform>/<Game Name (Year)>/` populated with standard special subfolders:
   ```text
   _Staging/Games/<platform>/<Game Name (Year)>/
   ├── Manual/                  # User manuals, guides, maps (PDF, TXT, JPG)
   ├── Patch/                   # Official updates and patches
   ├── Fix/                     # Community fixes, widescreen mods, wrappers (dgVoodoo)
   ├── Translation/             # Language translations and conversion tools
   ├── NoCD/                    # No-CD executables & preservation bypasses
   ├── DLC/                     # Expansions, add-on packs, extra content
   ├── Extra/                   # Wallpapers, soundtracks, artworks, avatars
   ├── Serial/                  # Activation keys / CD-Keys
   │   └── _insert_game_keys_here.txt
   └── _installed_game_folder/  # Drop loose/unpacked directories here for auto-zipping
   ```
3. **Explorer Launch & User Placement:**  
   Orbit launches the system file explorer (`SystemUtils.openInExplorer`) at the prepared staging directory and prompts:  
   *"Paste your files for `<Game Name (Year)>`. Press [Enter] when done."*
4. **Next Game Prompt:**  
   Orbit asks: *"Do you want to import another game? [y/N]"*.  
   - If **Yes**, repeats steps 1–3 for the next title.
   - If **No**, completes the intake phase and proceeds to batch processing.

#### Phase 2: Batch Processing, Edition Resolution & Commit
Orbit processes all prepared games in staging:

1. **Auto-Zipping Unpacked Directories:**  
   If `_installed_game_folder/` contains files, Orbit prompts for an optional edition name and compresses it into a fast `.zip` archive, deleting the temporary unpacked folder.
2. **CD-Key Handling:**  
   Orbit inspects `Serial/_insert_game_keys_here.txt`. If populated with actual keys, it saves it cleanly as `Serial/keys.txt`. If left untouched, the template (and empty `Serial/` folder) is deleted.
3. **Empty Folder Sanitization:**  
   Deletes all unused special subfolders, ignoring OS metadata (`desktop.ini`, `Thumbs.db`, `.DS_Store`).
4. **Pre-Flight Hashing:**  
   Computes SHA256 (for PC binaries/ISOs) or SHA1 (for retro disc media) into `checksum/<filename>.<algo>`.
5. **Existing Game & Edition Collision Handling:**  
   If `Games/<platform>/<Game Name (Year)>/` already exists:
   - **Duplicate Check (Retro Consoles):** If the platform is not `hashUnfriendly`, Orbit checks if the incoming hash matches an existing edition. If identical, it skips import to prevent duplicate copies.
   - **New Edition Creation:** If it is a new/different release, Orbit prompts the user to assign edition tags (e.g. `[Retail]` for existing, `[Digital]` for incoming) and moves files into distinct sub-edition directories without data loss.
6. **Atomic Commit & Metadata Generation:**  
   Moves the clean game folder into `Games/<platform>/<Game Name (Year)>/` and writes the canonical metadata file in [`Metadata/<platform>/<Game Name (Year)>/metadata.toml`](../orbit-library/Metadata.md).

---

### 3.2 Automated Batch Ingestion Workflow

Used for rapid multi-ROM scanning (GBA, NES, SNES, PS1 ISOs/CHDs).

1. Prompts for source path and optional recursion flag (`-r, --recursive`).
2. Scans files matching curated platform extensions.
3. Computes checksums and stages candidate files in `_Staging/Games/<platform>/<Game Name>/`.
4. Atomically commits files to `Games/<platform>/<Game Name>/<filename>`.

---

### 3.3 Parameters & Flags

| Flag | Type | Description |
| :--- | :--- | :--- |
| `[path]` | `string` | Source file or directory path (prompted interactively if omitted). |
| `--platform <slug>` | `string` | Target platform slug (e.g. `pc`, `gba`, `ps1`, `nes`). |
| `--mode <auto\|scaffold>` | `string` | Ingestion mode (`auto` for batch scanning, `scaffold` for guided intake). |
| `-r, --recursive` | `boolean` | Recursively scan subfolders during automated batch import (default: `false`). |
| `--copy` | `boolean` | Copy files into library (default: `true`). |
| `--move` | `boolean` | Move files into library instead of copying. |
| `--dry-run` | `boolean` | Preview planned operations without making filesystem modifications. |

---

## 4. `promote`

The `promote` sub-command copies a game from an indexed Set (`Games/<platform> [SET-<Tag>]/`) into the primary Curated Library (`Games/<platform>/`).

```bash
bun orbit game promote "Castlevania" --from "gba [SET-Archive]"
```

- **Deterministic Metadata Scrape:** Reads `ids.igdb` from the set's local `rom.info.toml` and fetches complete metadata by ID without ambiguous search prompts.
- **Optional Scaffold (`--scaffold`):** Opens the staging workspace to allow adding manual PDFs, fan translations, or custom fixes.
- **Safe Copy:** The source ROM in the Set is preserved 100% intact.

---

## 5. `verify`

The `verify` sub-command checks the integrity and checksums of installed games in the `Games/` directory.

- Recomputes hashes and verifies that binary containers match their corresponding hashes stored in `checksum/`.
- Accepts an optional platform argument to restrict verification (e.g. `orbit game verify pc`).
- Reports valid and corrupted/mismatched files.
