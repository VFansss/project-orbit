# Core Concepts

- The whole app/framework is cross-platform by design
  - First class citizen are Windows and Linux distro. MacOS support is not mandatory
  - Android Mobile support will be provided for "basic" functionalities
    - The feature is far in the roadmap
- File based
  - File System is the main database
    - Everything important about data and metadata should be "on disk"  
    - Other databases can be created and used just as a "cache" for reading data
- Offline-first
  - Every data retrieved from online sources is encouraged to be stored offline in a file based structure
- Opinionated design
  - I've accepted that is not possible neither truly worth designing the system (and bloating it, accordingly) trying to accomodate different ways to do the same thing about how things are organized, structured and (in general) designed
  - The only "correct" way it's the one already implemented and in use.
    - This concept is an axiom, except when something is not implemented correctly
  - For systems/software that worth supporting, "export functions" will try to fill the gap between this project and how other projects/software works 