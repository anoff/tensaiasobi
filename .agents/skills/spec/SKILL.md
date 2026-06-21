---
name: spec
description: |
  Draft a feature specification or issue description using the Socratic method and workspace technical boundaries.
  
  Trigger on mentions of: 'specification', 'draft issue', 'feature requirements', 'project scope', 'design doc', 'Socratic question'.
---

# Specification (spec)

Draft clear issue specifications by asking 2-3 Socratic questions first.

## Socratic Questions
* **State / Nav:** Does it change routing/tabs? Identify state switcher location.
* **Data / Proxy:** Will it fetch APIs? Ask if requests need CORS proxies or backend support.
* **Format:** Does it require new database or API types?

## Spec Format
Write the final issue using:
1. **Goal:** Core benefit and purpose.
2. **Proposed Changes:** Identify folders/files to modify.
3. **UI/UX Details:** Component changes, responsiveness, and themes.
4. **Verification Plan:** Manual and automated tests to run.
