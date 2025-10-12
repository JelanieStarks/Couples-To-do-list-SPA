# Changelog

All notable changes to this project will be documented in this file.

## [1.0.6-beta] - 2025-10-12

### Added / Changed

- TaskItem edit mode restyled to neon theme:
  - Title now uses `neon-input` within `neon-field` with ambient focus glow.
  - Description uses `neon-textarea` for consistent look and feel.
  - Date and Time inputs now use `neon-input` and fit within the card margins.
  - Save/Cancel buttons switched to `btn-neon` (small size), Cancel uses outline variant.
- Ensures edit fields respect global text-size scaling and remain within panel boundaries.

### Quality

- Verified entire test suite after UI changes; no behavioral regressions introduced.

## [1.0.5-beta]

- UI polish and text scaling improvements; baseline for neon edit mode changes.
