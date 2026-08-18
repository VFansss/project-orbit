# Game command

The `game` command provides tooling to work with game media assets.

When invoked without sub-commands or flags, it displays an interactive prompt allowing the user to select from available sub-commands.

## import

The `import` sub-command serves, similarly to screenshots and clips, to import games into the local Orbit library.

### Workflow & Parameters

1. **Platform Selection:**
   - First, the target `platform` is required. It can be passed via the `--platform <name>` flag.
   - If the parameter is omitted, an interactive selector displays the supported platforms (queried directly from `@orbit/core`).
   - The selector includes an option: *"None of these / Unsupported platform"*. If selected, Orbit displays an informative message: *"You do not need the import command to organize your library: simply create a folder with your preferred name inside `Game/` and manage your files as you like."*

2. **Source Directory & Recursion:**
   - Next, prompt for the source file or directory path containing the games to import.
   - Ask whether to scan recursively through subfolders.

3. **Platform File Format Rules:**
   - Once the platform is known, Orbit retrieves its supported file extensions and ingestion rules from the configuration and platform definition.
   - Platform definitions include a flag indicating whether to strictly enforce format filtering (e.g., `.gba` for Game Boy Advance, `.nes` for NES):
     - **Strict Platforms (Consoles/Handhelds):** Only files matching curated platform extensions are processed and imported.
     - **Elastic Platforms (PC):** Set to `false` for PC games, where directories contain `.exe` / installers alongside dependencies, data files, and repack assets. For any parent folder containing a compatible executable format, all accompanying unrecognized files within that directory are cataloged, listed, and imported together.

### Summary of Context
At this stage, Orbit has:
- Target Platform
- Source Directory Path
- Platform Definition & Format Rules

### Staging Architecture
Remember that Orbit leverages the `_staging` folder pattern: files are safely copied or moved from `source -> _staging`, and only after processing/conversion are they committed into the main library structure, consistent with the workflow used for screenshots and gameplay clips.
