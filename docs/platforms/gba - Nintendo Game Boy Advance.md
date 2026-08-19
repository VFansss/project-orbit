# gba - Nintendo Game Boy Advance

## Serial

GBA commercial game cartridges contain a standardized hardware header within the first 192 bytes (`0x00` – `0xC0`) of the ROM.

Orbit extracts the game title, unique product code, licensee code, software revision, and region deterministically without external API calls.

### ROM Header Binary Layout

| Offset Range | Length | Field | Description & Example |
| :--- | :--- | :--- | :--- |
| `0xA0` – `0xAB` | 12 bytes | **Game Title** | Uppercase ASCII, null-padded (e.g., `"POKEMON EMER"`, `"CASTLEVANIA2"`) |
| `0xAC` – `0xAF` | 4 bytes | **Game Code** | 4-character ASCII code (e.g., `BPEE`, `A2CE`, `B3IJ`) |
| `0xB0` – `0xB1` | 2 bytes | **Maker Code** | 2-character ASCII licensee (e.g., `01` Nintendo, `A4` Konami, `41` Ubisoft, `EB` Epoch) |
| `0xBC` | 1 byte | **Software Version** | Binary integer (`0x00` = v1.0, `0x01` = v1.1 / Rev 1) |

### Serial Construction

The canonical Orbit serial format is:

```text
AGB-{GAME_CODE}-{REGION}
```

The 4-character **Game Code** breakdown:

1. **1st Character:** Cartridge hardware type (`A` = Standard GBA Cartridge, `B` = Standard GBA Cartridge, `F` = Solar Sensor / Boktai).
2. **2nd & 3rd Characters:** Unique game title identifier (e.g., `PE` for *Pokemon Emerald*, `2C` for *Castlevania: Aria of Sorrow*, `3I` for *Mirakuru! Panzou*).
3. **4th Character (Region Mapping):**
   - `E` ➡️ `USA` (English / North America)
   - `P` ➡️ `EUR` (PAL / European Multi-language)
   - `J` ➡️ `JPN` (Japan)
   - `I` ➡️ `ITA` (Italy)
   - `D` ➡️ `GER` (Germany)
   - `F` ➡️ `FRA` (France)
   - `S` ➡️ `SPA` (Spain)
   - `A` ➡️ `ASI` (Asia)

### Extraction Algorithm in Orbit

- For `.gba` files: Reads bytes `0x00`–`0xC0` directly via `Bun.file(path).slice(0, 192)`.
- For `.zip` files: Streams the first 192 bytes of the internal ROM directly from the ZIP stream (zero full-disk extraction overhead).
- **Master Indexing Hash:** `CRC32` (8 hex characters read in 0 ms from ZIP central directory).

---

## Data sources

### No-Intro set - DAT-O-MATIC

- [DAT-o-MATIC Download](https://datomatic.no-intro.org/index.php?page=download&s=23)
- Canonical index of all clean commercial dumps. Keyed by internal uncompressed CRC32, MD5, SHA1, and official Nintendo serial.

### Hasheous & Libretro

- Maps CRC32 / SHA1 / MD5 hashes to IGDB IDs (`144796`), RetroAchievements IDs, ScreenScraper IDs, and SteamGridDB IDs.

### GBATek

- [GBATek Technical Specification](https://problemkaputt.de/gbatek.htm)
- Authoritative reference for GBA memory mapping, cartridge registers, and header offsets.
