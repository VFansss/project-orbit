# Bios command

The `bios` command manages, imports, and verifies system BIOS and firmware binary files for the various emulation platforms supported by Orbit.

All files are stored inside the `Bios/` folder of the active library, following the "Just-in-Time" (JIT) folder creation convention (directories are only created when needed).

When invoked without positional arguments or flags, it displays an interactive prompt allowing the user to select between available sub-commands (`import` or `verify`).

---

## Resource Preflight (System.dat)

Before executing any import or verification action, Orbit ensures that the official system BIOS database index (`libretro-system-bios`, i.e., `System.dat`) is cached locally in AppData.

- If the resource is already downloaded and verified on disk, Orbit proceeds silently.
- If the resource is missing or was deleted, Orbit displays a clear notice in the terminal and downloads it via the Data Gateway before prompting for paths or initiating a scan.
- If the download fails (e.g. network issue or HTTP 429), execution halts immediately to prevent invalid scans.

---

## import

The `import` sub-command scans a source file or directory, identifies valid BIOS files using cryptographic checksums (SHA1, MD5, CRC32) matched against the Libretro DAT database, and organizes them into the `Bios/` hierarchy.

### Parameters & Flags

- `[path]`: Path to the source file or directory to scan (prompted interactively if omitted).
- `-r, --recursive`: Scans the source directory recursively (traverses subdirectories).
- `-v, --verbose`: Displays a detailed, line-by-line list of all ignored/unmatched files.
- `--scan-zip`: Enables deep in-memory inspection of `.zip` archives. Disabled by default to ensure maximum scanning speed on folders with unrelated archives.
- `--get-unknown`: Imports recognized BIOS files belonging to uncurated/unsupported platforms into `Bios/unknown/`.
- `--copy`: Copies files into the library while preserving source files (default behavior).
- `--move`: Moves files into the library (deletes original files from source).
- `--force`: Overwrites existing BIOS files in the library even if hashes match.
- `--platform <platform>`: Specifies or falls back to a specific platform name.

### Scanning Rules & Performance (KISS Architecture)

1. **Extension Whitelist:** Only candidate files matching known firmware extensions (`.bin`, `.rom`, `.pce`, `.dat`, `.bios`, `.img`, `.sfc`, `.pbp`, `.cue`, `.iso`) are evaluated. Obvious media and document files are ignored at zero cost (0 ms).
2. **Size Limit Fast-Path:** Files larger than 64 MB are immediately skipped without disk hashing (firmware binaries never exceed this threshold).
3. **Error Resilience:** Corrupted archives, locked files, or permission errors on individual files will not crash the batch process; unreadable files are marked as ignored and scanning continues smoothly.
4. **Preserve Original Filename:** Imported files retain their exact original source filename (`origName`), without forced renaming by the database.

### Disk Structure & Checksum Sidecars

For each imported BIOS file, Orbit generates:
- The binary payload in `Bios/<platform>/<filename>` (or `Bios/unknown/<filename>` when `--get-unknown` is used).
- A dedicated `checksum/` subfolder (`Bios/<platform>/checksum/`) containing `.sha1`, `.md5`, `.crc32`, and `.sha256` sidecars for instant integrity auditing.

---

## verify

The `verify` sub-command checks the integrity and validity of all installed BIOS files in the `Bios/` library directory.

- Recomputes the SHA1 hash of each installed BIOS file on disk and compares it against its corresponding sidecar file in `checksum/` or against the Libretro database.
- If the checksum matches, it reports `[OK]`.
- If the checksum differs, it marks the file as `[CORRUPTED/MISMATCH]`, displaying expected and actual hashes.
- Accepts an optional platform argument to restrict verification to a single system (e.g. `orbit bios verify ps1`).
