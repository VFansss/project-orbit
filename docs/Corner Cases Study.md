# Corner Cases Study - A complex library

## Visual Representation

```text
MyOrbitLibrary/
├── orbit.library.toml           # Marker della libreria
├── Games/                       # Binari e file di gioco
│   ├── gba/                     # Caso: File singolo
│   │   └── Advance Wars (2001)/
│   │       └── game.gba
│   ├── ps1/                     # Caso: Multi-disco con Serial
│   │   └── Metal Gear Solid (1998) [SLUS-00594]/
│   │       ├── Disc 1.chd
│   │       ├── Disc 2.chd
│   │       └── checksum/
│   │           └── Disc 1.chd.sha1
│   ├── mame/                    # Caso: Arcade (Non-merged set)
│   │   └── puckman/
│   │       ├── puckman.zip      # Parent
│   │       └── pacman.zip       # Clone (dipendente da puckman.zip)
│   └── pc/                      # Caso: Directory pesanti (Folder-based)
│       └── Cyberpunk 2077 (2020)/
│           ├── bin/
│           ├── r6/
│           ├── engine/
│           └── checksum/
│               └── set.checksum.md5
└── UserData/
    └── alex/
        ├── Screenshots/
        │   └── ps1/
        │       └── Metal Gear Solid (1998) [SLUS-00594]/
        │           └── 2026-05-31 15-00-00 - Boss Fight.png
        └── Savedata/            # Salvataggi sincronizzati
            └── gba/
                └── Advance Wars (2001)/
                    └── save.sav
```

### Glyphs Reference (for Tree Diagrams)

```text
`│  ` : Linea verticale (per cartelle allo stesso livello ancora aperte)
`├──` : Connettore a T (per file o cartelle che hanno altro sotto di loro)
`└──` : Connettore a L (per l'ultimo elemento di una lista in una cartella)
```

## Problems dictionary - things I need to solve

Each `####` will be a problem. Use 🔴,🟡,🟢 to visually distinguish each issue based on how "solved" it is

Template:

Context:

"what's the deal here"

Ideas:

"how to solve the issue"

Could also contain the solutions: Use 🟢 to prefix them

Could also contain problems and blocker. Use 🔴 to prefix them

Solutions:

"Implementation of an 'idea' to solve the issue'

Blockers:

"could be general blockers about the topic"

### Open

#### 🔴 What to do with MAME and more "files heavy directories" e.g. GBA, MAME?

Context:

The games in "Games\{platform folder}", until now, have their own folder as explained in [the related section](Library%20Structure.md#game-folders---naming-convention). However, certain libraries could be too big to reliably move each game into its own subfolder, as an example complete GBA romset or MAME (merged/unmerged sets could become a nightmare to manage this way).

Idea:

1. Allow all files inside a single folder somehow, like a "unmanaged set" of games
   - I need to find a naming convention that's scalable

2. For games that often comes into a well explicited "romset", find a "managet set" folder structure convention that allows me to easily check OK/KO games by hash
   - e.g. mame 0.78b
  
Solutions:

1. The `[SET]` postfix

   In "Games\{platform folder}" use `[SET]` at the end of the platform folder name itself. This will identify a **Set folder**, that will be handled slightly different than the usual "each folder inside is a game".

   - Blockers
     - 🔴 How to save metadata/savegames/assets?
       - If a game is not identified anymore by the folder name, there's need to find some other convention to quickly link other data to that game itself
         - Ideas
           - Use the "file name" itself?
     - 🟡 What do to for platform that have more files inside the .zip? e.g. Amiga
       - I should use the `[SET]` but at the same time retain the ability to have more games inside a single file.

Blockers:

- 🔴 MAME "Samples" should be inside tightly related to the original file, to make the game works correctly
  - How to handle them?

#### 🔴 PS3 Game folder

Context: I'm not sure about the "best way" to store PS3 Games. It could be encrypted ISO, unencrypted ISO, of game folder with files inside. The newest RPCS3 can load encrypted iso, provided that you have the encryption file key somewhere

Blockers:

- I'm not sure how to safely store "patch", "DLCs" and extra things inside the game folder
- I'm not sure how to store the "encryption key" somewhere

#### 🔴 Store bios files

Context:

I need a way to store the bios files

Blockers:

- I'm not sure I want to create "Bios" folder in the library root folder

Ideas:

- Create a "Bios" folder in the library root folder, then use "Platform name" as a subfolder, and bios can be contained within
- use "_bios" inside "Game\\{Platform folder}" as an alternative?
- Support both solutions above at the same time?
  - What should be the "official" way to do this, and what use as a fallback?

### Closed
