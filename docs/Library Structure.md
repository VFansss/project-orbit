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
name = "Grand Theft Auto V"
aliases = ["GTA V","GTA 5"]
igdb = "1020"
steam = "271590"

[source]
source = ["GOG","DVD Rip"] 
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

- `screenshots`
  - will contain screenshots made by the user
  - Each subfolder will be named as one of [supported platform list](./Supported Platform List.md) entry
    - e.g. ps1, pc, xbox
    - within, each subfolder will be a [game folder](#game-folder)
- `savedata`
  - Will contain savegames made by the user
  - Each subfolder will be named as one of [supported platform list](./Supported Platform List.md) entry
    - e.g. ps1, pc, xbox
    - within, each subfolder will be a [game folder](#game-folder)

#### Screenshots

##### Platform Folders

###### Game Folders

Note: this kind of folder can be in multiple locations. To check what has in common for every instance, check more details [here](#game-folders---general-details)

Will contain screenshots made by an user regarding a certain game


Files follow a sortable and human-readable format:
YYYY-MM-DD_HH-mm-ss[_INDEX][_DESCRIPTION].**extension**

- Timestamp (YYYY-MM-DD_HH-mm-ss): The exact date and time when the screenshot was taken.
- Index ([_INDEX]): An optional numeric suffix (e.g., _1) added only to prevent collisions if multiple screenshots are taken within the same second.
- Description ([_DESCRIPTION]): An optional descriptive tag provided by the user or the system to identify the content (e.g., Boss-Fight). Can contain spaces

Examples:
  - 2026-04-24_19-30-15.png
  - 2026-04-24_19-30-15_1.png (Collision handling)
  - 2026-04-24_19-30-15_Final Boss.png (With description)
  - 2026-04-24_19-30-15_1_Final Boss.png (Collision with description)

No metadata files are planned for screenshots

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

