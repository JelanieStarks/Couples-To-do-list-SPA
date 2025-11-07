# Changelog

All notable changes to this project will be documented in this file.

## [1.0.9] - 2025-11-07

### Added / Changed

- Weekly calendar columns now stack tasks vertically on mobile to avoid overlap.
- Added expandable "View full day" modal for detailed per-day planning.
- Updated Android release pipeline to ship APKs as `couples2doBETA.apk`.

### Quality

- Bumped package metadata to 1.0.9 ahead of release automation.

## [1.0.10] - 2025-11-07

### Added / Changed

- Neon UI polish across filters, navigation, and task cards for consistency.
- Task filter overlays now track placement relative to the trigger button.
- Task cards keep modal editing while reducing layout crowding in compact mode.

### Fixes

- Ensured release artifacts rebuild after UI tweaks to include latest planner changes.

## [1.0.8-beta] - 2025-10-12

### Added / Changed

- Quick Menu → Settings: "Check for Updates" button shows latest version and direct links to Windows .exe / Android .apk.

### Infra

- Release workflow publishes assets on tag push and generates release notes.

## [1.0.7-beta] - 2025-10-12

### Added / Changed

- Android packaging scaffold via Capacitor, with scripts to build debug APK.
- Icons wired for Electron (Windows/Linux) and web favicon updated to Heart icon.

### CI

- GitHub Actions workflows to build Windows .exe and Android .apk; release job attaches artifacts on tag.

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
