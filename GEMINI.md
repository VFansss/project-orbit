# Project Orbit - Gemini Development Mandates

## Core Philosophy & Collaboration
- **Extreme Minimalism:** Write the absolute minimum code necessary. Every line must be justified, needed, and "well thought out".
- **No AI Slop:** Avoid generic boilerplate, lazy solutions, or bloated code. Code must be high-quality, idiomatic (Bun/TypeScript), and precise.
- **Iterative Development:** Proceed in small steps with frequent feedback. Many short iterations are preferred over large code blocks.
- **Inquiry over Action:** If a task is ambiguous or could lead to superfluous code, ask for clarification before acting.
- **Manual Documentation:** The `docs/` folder is the user's exclusive territory. Gemini must never modify or write files in `docs/` unless explicitly requested for a single file.

## Technical Standards
- **File-System First:** The File System is the source of truth (Primary Database).
- **Tech Stack:** Bun (Runtime), Hono (Backend/API), SQLite + Drizzle (Cache/Support), Svelte + Vite (Frontend), `cac` (CLI).
- **Cross-platform:** Ensure native compatibility for Windows and Linux.
