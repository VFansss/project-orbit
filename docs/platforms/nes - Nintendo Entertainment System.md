# nes - Nintendo Entertainment System

## Serial

Official Nintendo Entertainment System (NES) and Family Computer (Famicom) cartridges feature standardized product codes printed on cartridge labels and packaging.

### Serial Format

- **NES (North America / Europe):** `NES-{GAME_CODE}-{REGION}` (e.g., `NES-SM-USA` for *Super Mario Bros.*, `NES-CT-USA` for *Castlevania*, `NES-ZL-EEC` for *The Legend of Zelda*).
- **Famicom (Japan):** `HVC-{GAME_CODE}` (e.g., `HVC-SM` for *Super Mario Bros.*).

---

## ROM Formats & Header Handling

Unlike GBA, original NES ROM chips do not have a fixed internal metadata header on the silicon. Instead, ROM dumps in circulation use emulator container headers:

### 1. iNES Format (16-Byte Header)

The standard format for NES emulation. Starts with the magic bytes `NES\x1a` (`0x4E 0x45 0x53 0x1A`):

- Bytes 4–5: PRG-ROM and CHR-ROM size multipliers.
- Bytes 6–7: Memory Mapper ID and mirroring flags.

### 2. NES 2.0 Format

An backward-compatible extension to iNES that supports advanced sub-mappers, PRG-RAM sizes, and PAL/NTSC timings.

### Orbit Hashing & Identification Policy

- **Database Matching (No-Intro):** No-Intro and Hasheous index NES ROMs by hashing the **clean, unheadered payload** (skipping the first 16 bytes of the iNES header).
- **On-Disk Integrity:** Orbit computes sidecars on the actual file on disk.
- **Master Indexing Hash:** `CRC32` (8 hex characters).

---

## Data sources

### NesCartDB (BootGod Database)

- The definitive hardware-level catalog of NES PCB layouts, chip markings, and official cartridge serial numbers.

### The Legend of NES

- [The Legend of NES](https://www.thelegendofnes.com)
- Comprehensive database of releases, game IDs, regional variations, and cover scans.

### No-Intro DAT-O-MATIC

- Canonical index of clean NES ROM dumps keyed by unheadered CRC32, MD5, and SHA1.
