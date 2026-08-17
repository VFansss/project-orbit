# BIOS Specification

- [BIOS Specification](#bios-specification)
  - [1. Core Philosophy](#1-core-philosophy)
  - [2. File System Storage Standards](#2-file-system-storage-standards)
  - [3. Checksum & Identification](#3-checksum--identification)
  - [4. Verification & CLI Integration](#4-verification--cli-integration)

---

## 1. Core Philosophy

BIOS and system firmware files are required by many emulation cores (e.g., PS1, PS2, Sega CD, Saturn, NeoGeo, Switch) to boot games.

- **Platform-Scoped Storage:** BIOS files are stored directly inside the corresponding platform folder to keep platform dependencies self-contained.
- **Strict Hash Verification:** Every BIOS file is verified by exact binary checksum against known DAT databases (No-Intro, TOSEC, RetroArch) to ensure emulator compatibility.
- **Just-In-Time (JIT) Creation:** BIOS directories are created only when a BIOS file is imported or verified for that platform.

---

BIOS files are stored in a dedicated top-level `Bios/<platform>/` master folder in the library root:

```text
Bios/<platform>/
├── scph1001.bin           # BIOS binary file
└── checksum/              # Checksum folder following standard Hashing rules
    ├── scph1001.bin.md5
    └── scph1001.bin.sha1
```

- **Folder Path:** `Bios/<platform>/`
- **Naming:** Filenames match standard emulator requirements (e.g., `scph1001.bin`, `neogeo.zip`).
- **Checksums:** Follow the global [Hashing Standard](../standards/Hashing.md) inside `checksum/`.


---

## 3. Checksum & Identification

1. **Exact Binary Matching:** BIOS identification relies on exact `MD5`, `SHA1`, or `CRC32` checksums matching DAT indexes.
2. **Persistence:** Orbit generates checksum files (`scph1001.bin.sha1`, `scph1001.bin.md5`) inside `checksum/` upon import.

---

## 4. Verification & CLI Integration

The `orbit bios` command suite provides the single point of entry for managing system firmware:

- **`orbit bios import <file_or_folder>`**: Calculates binary hashes, identifies the BIOS, moves it to `Games/<platform>/_bios/`, and writes checksum files.
- **`orbit bios verify [platform]`**: Scans existing BIOS files against known DAT hash records and reports missing or corrupted firmware.
