# UserData Specification

- [UserData Specification](#userdata-specification)
  - [1. Core Philosophy](#1-core-philosophy)
  - [2. User Profile Folders](#2-user-profile-folders)
  - [3. Screenshots](#3-screenshots)
    - [3.1 Folder Structure](#31-folder-structure)
    - [3.2 Filename Format \& Naming Specification](#32-filename-format--naming-specification)
    - [3.3 Examples](#33-examples)
  - [4. Clips](#4-clips)
  - [5. Savedata](#5-savedata)

---

## 1. Core Philosophy

The `UserData/` directory contains all data created by users (screenshots, video clips, and savegames).

- **Profile-Isolated:** Data is isolated per user profile folder.
- **Self-Documenting Filenames:** No separate metadata database files are used for screenshots and clips; the filename itself acts as the database.

---

## 2. User Profile Folders

Each folder inside `UserData/` represents a user profile:

- Local user without a domain (e.g., `alex`)
- Domain-bound user (e.g., `alex@gmail.com` or `alex@mydomain.com`)

```text
UserData/<profile>/
├── Screenshots/      # Screenshots taken by the user
├── Clips/            # Video clips recorded by the user
└── Savedata/         # Savegames created by the user
```

---

## 3. Screenshots

### 3.1 Folder Structure

Screenshots are organized by platform and game folder:

`UserData/<profile>/Screenshots/<platform>/<game>/`

Sottocartelle ed elementi:
- `media files`: The processed or main screenshots.
- `Original/`: An optional subfolder containing untouched source files if any retouching or processing (e.g., HUD removal) was performed.

### 3.2 Filename Format & Naming Specification

Screenshot files follow a sortable, human-readable, and extensible format:

`YYYY-MM-DD HH-mm-ss[_OPTIONAL_INDEX] [- DESCRIPTION] [(TAG 1)] [(TAG 2)] ... [(ORIGINAL_NAME)].extension`

- **Timestamp** (`YYYY-MM-DD HH-mm-ss`): The exact date and time when the screenshot was taken (Mandatory).
- **Index** (`[_OPTIONAL_INDEX]`): An optional 1-based numeric suffix (e.g., `_1`) added only to prevent collisions if multiple screenshots are taken within the same second.
- **Description** (`[- DESCRIPTION]`): An optional descriptive tag (e.g., ` - Boss Fight`). If present, it must be preceded by a dash with spaces ` - `.
- **Tags/Attributes** (`[(TAG)]`): Any extra information (e.g., `(Hud Removed)`, `(4K)`) wrapped in parentheses. Multiple tags can be stacked.
- **Original Name** (`[(ORIGINAL_NAME)]`): If the original filename is preserved, it MUST be the **last** set of parentheses before the file extension. The extension is removed from the original name if it is identical to the final file.

### 3.3 Examples

- **Bare Minimum:** `2026-04-24 19-30-15.png`
- **Collision Handling:** `2026-04-24 19-30-15_1.png`
- **With Description:** `2026-04-24 19-30-15 - Final Boss.png`
- **With Description & Tags:** `2026-04-24 19-30-15 - Final Boss (Hud Removed).png`
- **With Original Name (No Description):** `2026-04-24 19-30-15 (Alpha Protocol 11_02_2024 13_34_23).png`
- **Complete Stack (Desc + Tag + Original):** `2026-04-24 19-30-15 - Final Boss (Hud Removed) (Alpha Protocol 11_02_2024 13_34_23).png`

---

## 4. Clips

Video clips recorded by the user are stored in:

`UserData/<profile>/Clips/<platform>/<game>/`

*(Follows a similar sortable timestamp naming convention as Screenshots).*

---

## 5. Savedata

Savegame files created by the user are stored in:

`UserData/<profile>/Savedata/<platform>/<game>/`
