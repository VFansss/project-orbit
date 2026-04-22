# Library Structure

- Games
  - Will contain games and related metadata
  - Each subfolder will be named as one of [supported platform list](./Supported Platform List.md) entry
    - e.g. ps1, pc, xbox
    - within, each subfolder will be a [game folder](#game-folder)
  - The name convention is expressed in the [game folder](#game-folder) paragraph
- UserData
  - Will contain a folder that will identify the user allowed to import its own data into the system
  - More details into [user data](#user-data)
- Exports
  - Will contain inner folders usable by external tools like EmulationStation or Romm

inside this folder, there MUST be these files:

- .library.orbit

## Game folder

### Naming convention

A folder is named using these tokens:

- "Game Name" (Year)
- Attributes - separated with `()`
- Unique Id, if present - separated with `[]`

### Subfolders

Each gamefolder COULD have one of these subfolders

- `.metadata`
  - Will contain subfolders of various metadata files (e.g. cover, artwork, icons, descriptions)
  - Will contain a file called `metadata.toml` with informations about the game
. `.checksum`
  - Will contain files used to calculate EVERY files inside the main game folder
  - Each file that contains checksum made with a certain algorithm will have the relative extension
    - e.g. checksum.md5, checksum.sha1
    - the checksum of the whole game folder files is called "set.checksum.*algorithm*"
    - the checksum of a single certain file is simply called "filename.*algorithm*"
- "game edition"
  - Each subfolder with a name not present above will be treated as a "sub-edition" of the game

### Files

Generally speaking, every file here is intended as "part" of the game overall.

## UserData

Each folder here will contain data related to an user.

Each user can be a local user, without a domain e.g. "alex" or contain a domain e.g. "alex@gmail.com" or "alex@mydomain.com"

### Subfolders

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
