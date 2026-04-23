# Library Structure

- **Games**
  - Main content: games divided by platform
  - **Platform Folders** - more details [here](#platform-folders)
    - Each subfolder will be named as one of [supported platform list](./Supported Platform List.md) entry
    - **Game Folders** - more details [here](#game-folders)
- **UserData** - more details [here](#userdata)
- **Exports**
  - Will contain inner folders usable by external tools like EmulationStation or Romm

inside this folder, there MUST be these files:

- [orbit.library.toml](#orbitlibrarytoml)

## Files Example

### orbit.library.toml

A marker file that will declare that the directory is a Orbit library.

Will contain also library-wide information and settings.

Example:

```toml
# Orbit Library Marker
# This file identifies this folder as an Orbit library.
created_at = 2026-04-23T19:32:42.188Z
```

### orbit.metadata.toml

Will contain data regarding the game/folder itself

Example:

```toml
[general]
aliases = ["Grand Theft Auto V","GTA V","GTA 5"]

[source]
source = ["GOG","DVD Rip","https://devwebsite.com"] 
```

## Folders Example

### Game Folders

#### Naming convention

DECISION: what to do with MAME and more "files heavy directories" e.g. GBA?

A folder is named using these tokens:

- "Game Name" (Year)
- Attributes - separated with `()`
- Unique Id, if present - separated with `[]`
  - The unique id can be present ONLY if a true unique id is available for that platform.

#### Content

Generally speaking, every file here is intended as "part" of the game.

There's a single exception: a file called `orbit.metadata.toml` can be inside the Game Folder. This is exactly the same file we could expect in `metadata\metadata.toml`, it's just an alternative location. The rationale is to avoid the metadata folder creation if there's avoidable.

However, if the `metadata` folder is created, the file will be automatically moved into the relative folder, and will be renamed accordingly.

#### Subfolders

Each gamefolder COULD have one of these subfolders

- `metadata`
  - Will contain subfolders of various metadata files (e.g. cover, artwork, icons, descriptions)
  - Will contain a file called `metadata.toml` with informations about the game
  - Will contain other kind of metadata, if retrieved from other sources
  - More detail [here]()
- `checksum`
  - Will contain files used to calculate EVERY files inside the main game folder
  - Each file that contains checksum made with a certain algorithm will have the relative extension
    - e.g. checksum.md5, checksum.sha1
    - the checksum of the whole game folder files is called "set.checksum.*algorithm*"
    - the checksum of a single certain file is simply called "filename.*algorithm*"
- `"game edition"`
  - Each subfolder with a name not present above will be treated as a "sub-edition" of the game
  - These kind of subfolders are, in fact, game folders
  - This is not recursive: if a "game edition" folder have inner subfolders with a name not present above, they will be ignored/treated accordingly

### Game Folders - Metadata folder

Metadata folder will contain metadata about the game itself.

Only the file called `metadata.toml` should be edited by the user

If other files are present, they should be treated as a "read only" content, and should be not manually edited by the user 

#### Content

### Platform Folders

### UserData

Each folder here will contain data related to an user.

Each user can be a local user, without a domain e.g. "alex" or contain a domain e.g. "alex@gmail.com" or "alex@mydomain.com"

#### Content

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