---
name: coding
description: |
  Implement and test core logic-heavy codebase modifications, calculations, data serialization, API processing, and unit tests.
  
  Trigger on mentions of: 'data parsing', 'calculation logic', 'unit testing', 'api integration', 'local storage state', 'typescript types'.
---

# Code & Logic (coding)

Write clean, robust business logic separate from UI render concerns.

## Rules
* **Separation of Concerns:** Keep calculations and parsers in pure utility functions. Do not mix with UI imports.
* **Typing:** Use strict TypeScript. Define descriptive interfaces and share them in a central types file.
* **Storage Safety:** Wrap browser storage calls (`localStorage`/`sessionStorage`) in try-catch blocks to prevent crashes in private modes.
* **Null Check:** Represent missing API data as `null` or placeholder symbols (`—`) rather than defaulting to zero.
* **Testing:** Write unit tests for all business utilities. Run the test suite before submitting modifications.
