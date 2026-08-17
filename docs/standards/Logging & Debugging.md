# Logging & Debugging Standard

- [Logging \& Debugging Standard](#logging--debugging-standard)
  - [1. Core Philosophy](#1-core-philosophy)
  - [2. Log Levels](#2-log-levels)
  - [3. How to Enable Debug & Verbose Output](#3-how-to-enable-debug--verbose-output)
    - [Option A: `orbit.config.toml` (Persistent Configuration)](#option-a-orbitconfigtoml-persistent-configuration)
    - [Option B: CLI Flags (Temporary Per-Command)](#option-b-cli-flags-temporary-per-command)
    - [Option C: Environment Variables](#option-c-environment-variables)
  - [4. Performance Breadcrumbs (`[!] PERF HINT`)](#4-performance-breadcrumbs--perf-hint)
  - [5. Developer Usage in Code](#5-developer-usage-in-code)

---

## 1. Core Philosophy

Orbit adopts a clean, non-intrusive logging architecture:

- **Quiet by Default:** In normal operations, Orbit remains minimal and outputs only relevant results or critical errors.
- **On-Demand Diagnostics:** Full technical traces, API requests, and filesystem events are exposed when `DEBUG` mode or `--verbose` flags are active.
- **Performance Breadcrumbs:** Performance bottlenecks (e.g., un-cached disc searches, slow I/O scans) are flagged in `DEBUG` mode to mark code paths that should be offloaded to SQLite cache.

---

## 2. Log Levels

Orbit defines three severity levels:

| Level | Priority | Description | Output Format |
| :--- | :--- | :--- | :--- |
| **`ERROR`** | `0` *(Default)* | Critical failures, unhandled exceptions, and operational errors. | `[ERROR] message` *(Red)* |
| **`INFO`** | `1` | Important milestones, library status changes, and saved files. | `[INFO] message` *(Blue)* |
| **`DEBUG`** | `2` | Detailed execution traces, API requests, and performance hints. | `[DEBUG] message` *(Gray/Yellow)* |

---

## 3. How to Enable Debug & Verbose Output

### Option A: `orbit.config.toml` (Persistent Configuration)

Set the global `logLevel` parameter in `orbit.config.toml` in your library root:

```toml
# orbit.config.toml
logLevel = "DEBUG"   # Values: "ERROR", "INFO", "DEBUG"
```

### Option B: CLI Flags (Temporary Per-Command)

Pass `--verbose` or `-v` to any Orbit CLI command to temporarily force `DEBUG` mode for that execution:

```bash
bun orbit search "Metal Gear" --verbose
bun orbit status -v
```

### Option C: Environment Variables

Override the log level globally via environment variables in your terminal shell:

```bash
# PowerShell (Windows)
$env:LOG_LEVEL="DEBUG"; bun orbit status

# Bash / Zsh (Linux/macOS)
LOG_LEVEL=DEBUG bun orbit status
```

---

## 4. Performance Breadcrumbs (`[!] PERF HINT`)

When developing or profiling Orbit in `DEBUG` mode, performance hints are logged in **bright red / yellow** to identify un-cached operations:

```text
[!] PERF HINT: lazy disc searching - move to cache
```

These breadcrumbs indicate that a filesystem operation (e.g. un-cached `checksum/` scan or disc search) was triggered and should be refactored to use the SQLite read index.

---

## 5. Developer Usage in Code

In `@orbit/core` and `@orbit/cli`, log messages using the `Logger` module:

```typescript
import { Logger } from '@orbit/core';

// Log an error
Logger.error('Failed to parse metadata file');

// Log informational milestone
Logger.info('Metadata saved at Metadata/ps1/Metal Gear Solid (1998)/metadata.toml');

// Log debug trace
Logger.debug('IGDB API Request: POST https://api.igdb.com/v4/games');

// Log a performance optimization breadcrumb (visible in DEBUG mode)
Logger.perf('lazy disc searching - move to cache');
```
