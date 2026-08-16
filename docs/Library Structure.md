# Library Structure

- [Library Structure](#library-structure)
  - [orbit.library.toml](#orbitlibrarytoml)
  - [Metadata](#metadata)
  - [Games](#games)
    - [Platform Folders - in Games](#platform-folders---in-games)
      - [Game Folders - in Games](#game-folders---in-games)
  - [UserData](#userdata)
  - [Example and details](#example-and-details)
    - [Game Folders - naming convention](#game-folders---naming-convention)


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
- **UserData** - more details [in the separate section](#userdata)
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

This folder is the "Brain" of the library. It stores all persistent information about games that is shared across all users (`metadata.toml` and optional raw `sources/` cache).

For full details on the TOML schema, `[general]`, `[ids]`, `[relations]`, `[[sources]]`, and raw payload caching, see the dedicated [Metadata Documentation](./orbit-library/Metadata.md).


## Games

### Platform Folders - in Games

#### Game Folders - in Games

**Naming:**

More details [in the separate section](#game-folders---naming-convention)

**Content:**

Generally speaking, every file here is intended as "part" of the game (binaries, data files, etc.).
No metadata or orbit-specific configuration files should be stored here.

Each gamefolder COULD have one of these subfolders

- `checksum`
  - Will contain files used to calculate EVERY files inside the main game folder, with certain exceptions
  - For full specifications on supported algorithms, naming conventions (`filename.<algorithm>`, `content.checksum.<algorithm>`, `.original.`), location rules, and caching, see the dedicated [Hashing Standard](./standards/Hashing.md).
- `"game edition"`
  - Each subfolder with a name not present above will be treated as a "sub-edition" of the game.


## UserData

Contains user-specific profile data (`Screenshots/`, `Clips/`, `Savedata/`).

For full specifications on profile folders, screenshot naming conventions, tag stacking, and savegames, see the dedicated [UserData Documentation](./orbit-library/UserData.md).



## Example and details

### Game Folders - naming convention

A folder is named using these tokens:

- "Game Name"
  - Mandatory for obvious reasons
- "({Year})"
  - It's not mandatory, but it's 100% adviced for long term storage. A folder without a years it's...ok-is
- Unique Id, if present - separated with `[]`
  - The unique id can be present ONLY if a true unique id is available for that platform
  
**Examples:**

- **Bare Minimum:** `My Game`
- **Well formed (Best):** `My Game (2012)`
- **Well formed, with Serial (Better):** `My Game (2012) [CODE-XXX]`
