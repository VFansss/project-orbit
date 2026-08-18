# Project Orbit 🚀

> **A blazing-fast, file-system-first hub for managing games, savegames, BIOS/ROM, and assets. Powered by Bun & TypeScript.**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Runtime: Bun](https://img.shields.io/badge/Runtime-Bun-f472b6?logo=bun)](https://bun.sh)
[![Language: TypeScript](https://img.shields.io/badge/Language-TypeScript-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Status: Experimental MVP](https://img.shields.io/badge/Status-Experimental_MVP-orange)](#-project-status--expectations)

---

## ⚡ Core Philosophy & Key Pillars

- **File-System First:** The file system is the single source of truth. Your library remains portable, transparent, and never trapped inside a proprietary database.
- **CLI is the Primary Focus:** **The Command Line Interface is currently the absolute core of Orbit.** Every feature, indexing engine, and verification pipeline is built CLI-first for speed, scripting, and developer delight.
- **Curated Platforms & Library Hygiene:** Supported platforms follow strict, curated guidelines with dedicated tools to keep your collection spotless: cryptographic checksum sidecars (`.sha1`, `.md5`, `.crc32`, `.sha256`), compressed archival formats (CHD), and periodic integrity audits.
- **Screenshots, Clips & Visual Assets:** Comprehensive organization for user gameplay media (`Screenshots/`, `Clips/`) as well as scraped artwork, boxart, banners, and icons (`Assets/`).
- **Extreme Minimalism:** High-performance, lean TypeScript code with zero unnecessary bloatware or heavy abstractions.

---

## 🚧 Project Status & Expectations

> [!WARNING]
> **Orbit is currently in an early experimental stage (Pre-1.0 / MVP).**

- **Rapid Evolution:** Expect frequent iterations, architectural refinements, and breaking changes as we shape the foundation.
- **Default Branch:** The **`master`** branch is the primary staging ground for the MVP in this early phase.
- **No Guaranteed Pre-built Binaries:** Until the official `v1.0.0` milestone, standalone binary pre-builds are not guaranteed. Running directly from source using [Bun](https://bun.sh) is the supported way to run and test Orbit.
- **AI-Assisted with Craftsmanship:** Orbit is developed using AI-assisted pair-programming, but with strict human rationale, architectural discipline, and manual verification—no AI boilerplate or unvetted slop.

---

## 🗺️ [Roadmap & Future Horizons](./docs/Project%20Backlog.md)

*Detailed task tracking and milestones are maintained in the [Project Backlog](./docs/Project%20Backlog.md).*

- [x] **CLI Engine:** Fast interactive CLI with `@clack/prompts` and `cac`.
- [x] **BIOS Management:** Strict cryptographic identification (SHA1/MD5/CRC32) via official DAT indexes, checksum sidecars, and automated library verification.
- [x] **Media & UserData Tools:** Screenshot and gameplay video clip ingestion and staging.
- [ ] **Game & ROM Importer:** Multi-platform game ingestion, metadata scraping, and disc image conversion.
- [ ] **Sidecar / Daemon Mode:** Self-hosted background daemon for home servers, NAS, and background sync.
- [ ] **Mobile & Web Interface:** Companion client for library browsing and cloud save sync.

---

## 🛠️ Getting Started

### Prerequisites
- **Bun** (v1.1+):
  - **Linux / macOS:** `curl -fsSL https://bun.sh/install | bash`
  - **Windows (PowerShell):** `powershell -c "irm bun.sh/install.ps1 | iex"`

### Installation & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/VFansss/project-orbit.git
   cd project-orbit
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Launch Orbit CLI:
   ```bash
   bun orbit
   ```

### Example Commands

```bash
# Initialize library and user profile
bun orbit init

# Import and verify system BIOS files
bun orbit bios import ~/Downloads/bios -r --get-unknown

# Verify installed BIOS checksum integrity
bun orbit bios verify

# Search games and online databases
bun orbit search
```

---

## 💬 Community & Discussions

Feedback, architectural proposals, and discussions regarding project guidelines and platform standards are warmly welcomed! Feel free to open an **Issue** or start a **Discussion** on GitHub.

---

## 📖 Documentation

Detailed architectural notes, design decisions, and command specifications are maintained in the [`docs/`](./docs) directory:
- [Project Backlog & Roadmap](./docs/Project%20Backlog.md)
- [CLI Core Concepts](./docs/cli/Core%20Concepts.md)
- [BIOS Command Specification](./docs/cli/Bios%20command.md)
- [Game Command Concept](./docs/cli/Game%20command.md)
- [Library Structure](./docs/Library%20Structure.md)

---

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**. See the [LICENSE](./LICENSE) file for details.
