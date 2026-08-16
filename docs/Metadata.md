# Metadata Specification

- [Metadata Specification](#metadata-specification)
  - [1. Core Philosophy](#1-core-philosophy)
  - [2. File System Structure](#2-file-system-structure)
  - [3. TOML Schema (`metadata.toml`)](#3-toml-schema-metadatatoml)
    - [3.1 Section: `[general]`](#31-section-general)
    - [3.2 Section: `[ids]`](#32-section-ids)
    - [3.3 Section: `[relations]`](#33-section-relations)
    - [3.4 Section: `[[sources]]`](#34-section-sources)
    - [3.5 Complete `metadata.toml` Example](#35-complete-metadatatoml-example)
  - [4. Scraper Raw Payload Cache (`_sources/`)](#4-scraper-raw-payload-cache-_sources)
    - [4.1 Purpose & Offline-First Strategy](#41-purpose--offline-first-strategy)
    - [4.2 Configuration Toggle (`keep_raw_sources`)](#42-configuration-toggle-keep_raw_sources)

---

## 1. Core Philosophy

Metadata serves as the central brain of Project Orbit. It stores persistent, game-related information shared across all profiles and users.

- **File-System First:** All metadata is stored human-readably on disk in TOML format (`metadata.toml`).
- **Offline-First:** Scraped responses can be stored raw locally to allow 100% offline metadata re-parsing without external API calls.
- **Cross-Platform Relations:** Games can be grouped by franchise or linked across platforms via explicit relation keys.

---

## 2. File System Structure

Each game entry under `Metadata/<platform>/<game>/` contains the following layout:

```text
Metadata/<platform>/<game>/
├── metadata.toml      # Main information file (manually editable & machine generated)
└── sources/           # Raw API responses from scrapers (optional / cache)
    ├── igdb.2026-08-16T11-17-39Z.json
    └── steam.2026-08-16T11-17-39Z.json

```

---

## 3. TOML Schema (`metadata.toml`)

### 3.1 Section: `[general]`

Contains core game identity and descriptive attributes:

- **`name`** *(string, mandatory)*: Display name of the game.
- **`aliases`** *(array of strings, optional)*: Alternative names used during search & resolving.
- **`summary`** *(string, optional)*: Brief synopsis or plot description.
- **`release_year`** *(string, optional)*: Initial release year (stored as string for consistency).
- **`genres`** *(array of strings, optional)*: Genres associated with the game.
- **`developers`** *(array of strings, optional)*: Development companies/studios.
- **`publishers`** *(array of strings, optional)*: Publishing companies.
- **`franchise`** *(string, optional)*: Top-level franchise (e.g., `"Metal Gear"`).
- **`series`** *(string, optional)*: Specific game series or collection (e.g., `"Metal Gear Solid Series"`).

### 3.2 Section: `[ids]`

External unique identifiers connecting the game to external databases:

- **`igdb`** *(string, optional)*: IGDB Game ID.
- **`steam`** *(string, optional)*: Steam AppID.
- **`serial`** *(string, optional)*: Disc/Cartridge serial code (e.g., `"BLUS-31156"`).
- **`hash`** *(string, optional)*: Primary checksum reference.

### 3.3 Section: `[relations]`

Cross-platform and game relationship mapping using **Arrays of URNs** (Uniform Resource Names):

- **`same_game_as`** *(array of URN strings, optional)*: Identifiers or paths of identical versions across platforms.
- **`remake_of`** *(array of URN strings, optional)*: Target game entries of which this game is a remake/reboot.
- **`included_in`** *(array of URN strings, optional)*: Master collection or compilation entries containing this game.

#### Supported URN Prefixes in Relations:

- **`igdb:<id>`** (e.g., `"igdb:1020"`) - Match by IGDB ID.
- **`steam:<appid>`** (e.g., `"steam:271590"`) - Match by Steam AppID.
- **`serial:<code>`** (e.g., `"serial:BLUS-31156"`) - Match by disc/cartridge serial code.
- **`path:<rel_path>`** (e.g., `"path:ps1/Metal Gear Solid (1998)"`) - Match by relative filesystem path.
- **`sha1:<hash>`** / **`crc32:<hash>`** - Match by specific binary checksum.
- **`urn:orbit:<type>:<val>`** (e.g., `"urn:orbit:igdb:1020"`) - Full formal Orbit URN format.

### 3.4 Section: `[[sources]]`

Array of tables identifying where the metadata originated and when it was fetched:

- **`name`** *(string, mandatory)*: Provider name (e.g., `"IGDB"`, `"Steam"`).
- **`url`** *(string, optional)*: External web URL to the game's page.
- **`fetched_at`** *(string, optional)*: ISO 8601 UTC timestamp of when the data was scraped (e.g., `"2026-08-16T11:10:20Z"`).

### 3.5 Complete `metadata.toml` Example

```toml
[general]
name = "Grand Theft Auto V"
aliases = ["GTA V", "GTA 5"]
summary = "When a young street hustler, a retired bank robber and a terrifying psychopath..."
release_year = "2013"
genres = ["Action", "Adventure"]
developers = ["Rockstar North"]
publishers = ["Rockstar Games"]
franchise = "Grand Theft Auto"
series = "Grand Theft Auto Series"

[ids]
igdb = "1020"
steam = "271590"
serial = "BLUS-31156"

[relations]
same_game_as = [
  "igdb:1020",
  "steam:271590",
  "path:pc/Grand Theft Auto V (2015)"
]
remake_of = []
included_in = []

[[sources]]
name = "IGDB"
url = "https://www.igdb.com/games/grand-theft-auto-v"
fetched_at = "2026-08-16T11:10:20Z"

[[sources]]
name = "Steam"
url = "https://store.steampowered.com/app/271590"
fetched_at = "2026-08-16T11:10:20Z"
```

---

## 4. Scraper Raw Payload Cache (`sources/`)

### 4.1 Purpose & Offline-First Strategy

When Orbit fetches data from external APIs (IGDB, Steam, SteamGridDB), it saves the **100% raw, untouched JSON payload** returned by the server into `sources/<provider>.<TIMESTAMP>.json` (e.g., `sources/igdb.2026-08-16T11-17-39Z.json`).

- **Pristine Raw Payloads:** The JSON file content inside `sources/` is never modified or wrapped, preserving original server response integrity.
- **Cross-Platform Timestamp Filename:** The timestamp includes date, hours, minutes, seconds, and UTC timezone indicator (`Z`), with colons replaced by dashes (e.g., `2026-08-16T11-17-39Z`) for full Windows/Linux filesystem compatibility.

- **Offline Re-parsing:** If Orbit updates its parser to extract additional fields in the future, it re-parses local `sources/` files instantly without making network requests.
- **API Rate-Limit Protection:** Avoids duplicate HTTP requests during batch metadata updates.

### 4.2 Configuration Toggle (`keep_raw_sources`)

In `orbit.config.toml`:

```toml
# Save raw scraper API JSON responses in Metadata/<platform>/<game>/sources/
keep_raw_sources = true
```

Setting `keep_raw_sources = false` instructs Orbit to discard raw API payloads after generating `metadata.toml`, keeping the directory strictly minimal.


