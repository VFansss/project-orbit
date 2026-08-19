# PS1 - Sony PlayStation

## Serial

Every PlayStation 1 disc image contains an official Sony Product Code (Serial) stored inside the `SYSTEM.CNF` configuration file in the disc root directory.

Orbit reads this file directly from uncompressed ISO/BIN images or CHD archives in milliseconds.

### Sony Serial Structure (4-Letter Prefix + 5-Digit Number)

```text
{PUBLISHER}{REGION}{TYPE}-{NUMBER}
```

*Example:* **`SLUS-00594`** (*Metal Gear Solid* Disc 1)

#### Prefix Breakdown

1. **Publisher Category:**
   - `SC` ➡️ **Sony 1st-Party** (Sony Computer Entertainment published)
   - `SL` ➡️ **3rd-Party Licensed** (Licensed by Sony to third-party publishers like Konami, Capcom, Squaresoft)
2. **Territory / Region:**
   - `U` ➡️ **North America / USA** (`SCUS`, `SLUS`)
   - `E` ➡️ **Europe / PAL** (`SCES`, `SLES`)
   - `P` ➡️ **Japan** (`SCPS`, `SLPS`)
   - `K` ➡️ **South Korea** (`SCKA`, `SLKA`)
   - `A` ➡️ **Asia** (`SCAJ`, `SLAJ`)
3. **Media Type:**
   - `S` ➡️ **Standard Retail Game**
   - `D` ➡️ **Demo / Promo Disc** (`SCED`, `SLED`)
   - `H` ➡️ **Hardware Utility / Accessory Disc**
   - `X` / `M` ➡️ **Special Edition / Bundle**

---

### How Orbit Extracts the Serial (ISO 9660 & CHD)

1. **Standard ISO (2048 bytes/sector):**  
   Reads Sector 16 at offset `0x8000` (ISO 9660 Primary Volume Descriptor), traverses the root directory records to locate `SYSTEM.CNF`, and parses the boot line:

   ```ini
   BOOT = cdrom:\SLUS_005.94;1
   VER = 1.00
   VMODE = NTSC
   ```

   ➡️ Converts `SLUS_005.94` into canonical **`SLUS-00594`**.
2. **Raw BIN (2352 bytes/sector):**  
   Locates Sector 16 at offset `0x9318` (accounting for 24-byte Mode 2 / Form 1 sync headers) and parses `SYSTEM.CNF`.
3. **MAME CHD (v5):**  
   - Header contains **`rawsha1`** (SHA1 of the uncompressed disc image) and the entire CUE sheet in plaintext metadata.
   - Hunk 0 (compressed with zlib) is decompressed in memory to read `SYSTEM.CNF`.

### Multi-Disc Titles

In multi-disc games (e.g. *Final Fantasy VII*, *Metal Gear Solid*), each disc has its own unique serial:

- *Metal Gear Solid (Disc 1):* `SLUS-00594`
- *Metal Gear Solid (Disc 2):* `SLUS-00776`

**Master Indexing Hash:** `SHA1` (Redump.org standard).

---

## Golden preservation standards

Orbit's Golden Preservation Standard for PlayStation 1 is: **`.chd` (MAME Compressed Hunks of Data - CD V5)**.

### Rationale:
- **Unified Single-File Container:** Eliminates fragmented multi-file dumps (replacing complex CUE sheets and 10+ audio `.bin` tracks with one neat container).
- **Substantial Storage Savings (40%–60%):** Leverages lossless FLAC audio compression for CD-DA audio tracks and LZMA/zlib for data sectors.
- **Universal Modern Emulator Support:** Supported natively by all leading PS1 emulators (DuckStation, Beetle PSX, PCSX-ReARMed, SwanStation) without background extraction.
- **Raw SHA1 Preservation:** The CHD v5 header embeds the exact `rawsha1` checksum of the uncompressed source disc for instant Redump auditing.
- **100% Lossless & Reversible:** Can be converted back to the original byte-identical `.cue` + multi-`.bin` dump using `chdman extractcd`.

---

## Data sources

### Redump.org

- [Redump PlayStation Disc Index](http://redump.org/discs/system/psx/)
- The authoritative global index for PS1 disc preservation. Contains track-by-track SHA1, MD5, CRC32, serials, and matrix codes.

### Hasheous & Libretro

- Maps PS1 SHA1 / MD5 hashes to IGDB IDs, RetroAchievements IDs, and metadata.

### PSXDatacenter

- [PSXDatacenter](https://psxdatacenter.com/)
- Comprehensive catalog of PlayStation disc serials, cover scans, and release codes.
