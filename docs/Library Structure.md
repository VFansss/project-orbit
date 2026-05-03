# Library Structure

**General structure or root folder:**

- **_Staging**
  - A folder that will contain contant parsed (or to be parsed) by Orbit. After the processing it could be merged with the main library
  - Is prefixed by "_" to always be first in alphabetic folder ordering
  - Inside it, you will have the SAME structur you could have inside the root folder itself
    - e.g. "_Staging\Games\<platform folder>\<game folder>\<content>"
    - e.g. "_Staging\UserData\screenshots\<platform folder>\<game folder>\<content>"
    - It can't contain another "_Staging" folder
- **Metadata**
  - The central database of the library.
  - Contains all game-related information and media.
  - **Platform Folders**
    - **Game Folders**
      - `metadata.toml`: The main information file for the game.
      - `media/`: Subfolder for covers, artworks, icons, etc.
- **Games**
    - Each subfolder will be named as one of [supported platform list](./Supported Platform List.md) entry
  - Main content: games divided by platform.
  - **Platform Folders**
    - **Game Folders**
      - Contains only the game binaries/files.
- **UserData** - more details [here](#userdata)
- **Exports**
  - Will contain inner folders usable by external tools like EmulationStation or Romm

inside this folder, there MUST be these files:

## orbit.library.toml

A marker file that will declare that the directory is a Orbit library.

Will contain also library-wide information and settings.

Example:

```toml
# Orbit Library Marker
# This file identifies this folder as an Orbit library.
created_at = 2026-04-23T19:32:42.188Z
```

## Metadata

This folder is the "Brain" of the library. It stores all persistent information about games that is shared across all users.

### Game Folders - metadata

Each game folder in `Metadata/<platform>/<game>/` contains:

#### metadata.toml

The only file that should be manually edited by the user. It contains general information, IDs, and source links.

Example:

```toml
[general]
# The display name of the game
name = "Grand Theft Auto V"
# Alternative names for the game used during search and resolving
aliases = ["GTA V", "GTA 5"]
# A brief description of the game
summary = "When a young street hustler, a retired bank robber and a terrifying psychopath..."
# The release year of the game (stored as string for consistency)
release_year = "2013"
# List of genres
genres = ["Action", "Adventure"]
# Companies involved in the development
developers = ["Rockstar North"]
# Companies involved in the publishing
publishers = ["Rockstar Games"]

[ids]
# External unique identifiers
igdb = "1020"
steam = "271590"
# Platform-specific serial (e.g. SLUS-01234)
serial = "BLUS-31156"

# Information about where the metadata came from (can have multiple [[sources]])
[[sources]]
name = "IGDB"
url = "https://www.igdb.com/games/grand-theft-auto-v"

[[sources]]
name = "Steam"
url = "https://store.steampowered.com/app/271590"
```

#### media

Contains visual assets for the game. These are usually managed by Orbit and should be treated as read-only.

## Games

### Platform Folders

#### Game Folders

Generally speaking, every file here is intended as "part" of the game (binaries, data files, etc.).
No metadata or orbit-specific configuration files should be stored here.

**Content:**

Each gamefolder COULD have one of these subfolders

- `checksum`
  - Will contain files used to calculate EVERY files inside the main game folder, with certain exceptions
  - More details [here](#game-folders---checksum)
- `"game edition"`
  - Each subfolder with a name not present above will be treated as a "sub-edition" of the game
  - These kind of subfolders are, in fact, game folders
  - This is not recursive: if a "game edition" folder have inner subfolders with a name not present above, they will be ignored/treated accordingly

##### checksum

This folder will contain checksum of files related to the game itself

3 algorithm are officially supported:

- CRC32
- MD5
- SHA1

Each file that contains checksum made with a certain algorithm will have the relative extension e.g. checksum.**md5**, checksum.**sha1**

- the checksum of the content of the whole game folder files is called "set.checksum.**algorithm**"
- the checksum of a single certain file is simply called "filename.**algorithm**"

If the content of the game folder has been converted from another format e.g. rom or iso conversion, a copy of the checksum of the file BEFORE conversion will be retained in the following format:

- "filename.original.**algorithm**"

".original." will be the "marker" of a checksum of "filename" in the related "algorithm" BEFORE conversion

## UserData

Each folder here will contain data related to an user.

### Profile folders

Each user can be a local user, without a domain e.g. "alex" or contain a domain e.g. "alex@gmail.com" or "alex@mydomain.com"

**Content:**

Each gamefolder COULD have one of these subfolders

- `Screenshots`
  - will contain screenshots made by the user
  - Each subfolder will be named as one of [supported platform list](./Supported Platform List.md) entry
    - e.g. ps1, pc, xbox
    - within, each subfolder will be a [game folder](#game-folder)
- `Savedata`
  - Will contain savegames made by the user
  - Each subfolder will be named as one of [supported platform list](./Supported Platform List.md) entry
    - e.g. ps1, pc, xbox
    - within, each subfolder will be a [game folder](#game-folder)

#### Screenshots

##### Platform Folders

###### Game Folders

Note: this kind of folder can be in multiple locations. To check what has in common for every instance, check more details [here](#game-folders---general-details)

Will contain screenshots made by an user regarding a certain game.

Files follow a sortable, human-readable and extensible format:
`YYYY-MM-DD HH-mm-ss[_OPTIONAL_INDEX] [- DESCRIPTION] [(TAG 1)] [(TAG 2)] ... [(ORIGINAL_NAME)].extension`

- **Timestamp** (YYYY-MM-DD HH-mm-ss): The exact date and time when the screenshot was taken. Mandatory.
- **Index** ([_OPTIONAL_INDEX]): An optional 1-based numeric suffix (e.g., _1) added only to prevent collisions if multiple screenshots are taken within the same second.
- **Description** ([- DESCRIPTION]): An optional descriptive tag (e.g., Boss-Fight). If present, it must be preceded by a dash with spaces ` - `.
- **Tags/Attributes** ([(TAG)]): Any extra information (e.g., Hud Removed, 4K) is wrapped in parentheses. Multiple tags are supported and stacked.
- **Original Name** ([(ORIGINAL_NAME)]): If the original filename is preserved, it MUST be the **last** set of parentheses before the extension.
  - The extension is removed from the original name if it's the same as the final file.

**Content:**

- `media files`: The processed or main screenshots.
- `Original/`: An optional subfolder containing the untouched source files if any retouching or processing (e.g., HUD removal) was performed.

Examples:

- **Base Minimum:** `2026-04-24 19-30-15.png`
- **Collision Handling:** `2026-04-24 19-30-15_1.png`
- **With Description:** `2026-04-24 19-30-15 - Final Boss.png`
- **With Description & Tags:** `2026-04-24 19-30-15 - Final Boss (Hud Removed).png`
- **With Original Name (No Description):** `2026-04-24 19-30-15 (Alpha Protocol 11_02_2024 13_34_23).png`
- **Complete Stack (Desc + Tag + Original):** `2026-04-24 19-30-15 - Final Boss (Hud Removed) (Alpha Protocol 11_02_2024 13_34_23).png`

No separate metadata files are planned for screenshots; the filename is the database.
#### Savedata

TODO:

## Folders Example

### Game Folders - general details

#### Naming convention

DECISION: what to do with MAME and more "files heavy directories" e.g. GBA?

A folder is named using these tokens:

- "Game Name" (Year)
- Attributes - separated with `()`
- Unique Id, if present - separated with `[]`
  - The unique id can be present ONLY if a true unique id is available for that platform.

### Platform Folders

TODO:

