# Library Root Structure

- Games
  - Will contain games and related metadata
  - Each subfolder will be named as one of [supported platform list](./Supported Platform List.md) entry
    - e.g. ps1, pc, xbox
    - within, each subfolder will be a [game folder](#game-folder)
  - The name convention is expressed in the [game folder](#game-folder) paragraph
- UserData
  - Will contain a folder that will identify the user allowed to import its own data into the system
- Exports
  - Will contain inner folders usable by external tools like EmulationStation or Romm

## Game folder

### Naming convention

A folder is named using these tokens:

- <Game Name> (Year)
- Attributes - separated with `()`
- Unique Id, if present - separated with `[]`

### Subfolders

Each gamefolder COULD have one of these subfolders

- `.metadata`
  - Will contain subfolders of various metadata files (e.g. cover, artwork, icons, descriptions)
  - Will contain a file called `metadata.toml` with informations about the game
- <game edition>
  - Each subfolder with a name not present above will be treated as a "sub-edition" of the game

### Files

Generally speaking, every file here is intended as "part" of the game overall.