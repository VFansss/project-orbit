# CLI Core Concepts

## Just-in-Time Structure
To keep the library clean and minimal, Orbit follows the "Just-in-Time" (JIT) folder creation paradigm.

- The `library` command is only responsible for ensuring the presence of the `.library.orbit` marker file.
- It **must not** pre-create the entire folder structure (Games, UserData, etc.).
- Every specific command is responsible for checking and creating the required sub-directories it needs to operate.
- This ensures that a library only contains the folders that are actually being used.
