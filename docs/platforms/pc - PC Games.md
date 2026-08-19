# PC - Personal Computer (Windows/Linux/DOS)

## Serial & Product Identification

Unlike home consoles, the PC gaming ecosystem is decentralized and lacks a single platform-holder serial numbering system.

PC titles span multiple historical eras (floppy disks, CD-ROMs, multi-disc DVDs, and modern digital DRM-free installers).

### How Orbit Identifies PC Titles

1. **Optical Media Metadata (CD/DVD Images):**
   - **Volume Label:** Read directly from Sector 16 of the ISO (e.g., `"CLAW"`, `"UT2003_CD1"`, `"FARCRY_DISC1"`).
   - **`AUTORUN.INF` Parsing:** Reads the primary executable path (`open=setup.exe`) and icon path.
2. **Product Activation Keys (`Serial/keys.txt`):**
   - CD-Keys, serial numbers, and installation codes are preserved in plaintext within the dedicated `Serial/keys.txt` file (or `keys.txt` in sub-editions).
3. **Cryptographic Container Fingerprint:**
   - Hashed using **SHA256** for installer binaries (`.exe`, `.bin`) and disc images (`.iso`).
4. **Universal External Identifiers:**
   - Linked in `Metadata/pc/<Name (Year)>/metadata.toml` via `ids.igdb`, `ids.steam`, and `ids.gog`.

---

## Library Standards for PC Games

- **Scaffold Mode:** `'forced'` (Assisted Intake workflow is mandatory).
- **Set Restriction:** The `pc` platform **does not support `[SET-...]` sets**. All PC titles must be ingested directly into the Curated Library.
- **Single Container Rule:** Extracted game directories with thousands of loose files are strictly forbidden; uncompressed installs must be packaged into `.zip` archives.
- **Special Subfolders:** PascalCase subfolders for `Manual/`, `Patch/`, `Fix/`, `Translation/`, `NoCD/`, `DLC/`, `Extra/`, and `Serial/`.
- **Master Indexing Hash:** `SHA256` (Intel/AMD SHA-NI hardware accelerated in Bun).
- **Hash Policy:** `hashUnfriendly: true` (skips strict ROM duplicate checks when adding new editions).

---

## Golden preservation standards

Orbit's Golden Preservation Standards for PC Games are:
1. **Optical Media:** Clean **`.iso`** disc images (preserving original volume labels and autorun descriptors).
2. **Digital Installers:** Standalone or multi-part installer binaries (**`setup.exe` + `.bin`**).
3. **Extracted / Loose Installs:** Fast, store-compressed **`.zip`** archives encapsulating the game directory.

### Rationale:
- **Zero Modification:** Preserves original publisher installers and disc sectors without tampering.
- **Filesystem Protection:** Enforces the Single Container rule, preventing thousands of extracted files from polluting the host filesystem.
- **Auditable Integrity:** Allows fast SHA256 checksum sidecars in `checksum/`.
- **100% Lossless & Reversible:** Archives can be unzipped or mounted at any time.

---

## Data sources

### PCGamingWiki (PCGW)

- The definitive encyclopedia for PC game fixes, widescreen patches, No-CD requirements, dgVoodoo wrappers, and silent patches.

### IGDB

- Primary sources for metadata, developers, release dates, and high-resolution artworks