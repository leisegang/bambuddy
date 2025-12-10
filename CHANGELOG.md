# Changelog

All notable changes to Bambuddy will be documented in this file.

## [Unreleased]

### Added
- Mobile PWA (Progressive Web App) support with offline capabilities
- Playwright end-to-end test suite for comprehensive application testing
- Filament spool fill levels displayed on printer cards

### Fixed
- External links now properly receive keyboard shortcut assignments after reordering
- External links open in main content area iframe instead of new browser tab
- Spoolman sync now correctly handles all AMS trays (fixed black filament color bug)

## [0.1.5b4] - 2025-12-10

### Added
- Docker support with containerized deployment
- Comprehensive mobile support with responsive navigation
  - Hamburger drawer navigation for mobile (< 768px)
  - Touch gesture context menus with long press support
  - WCAG-compliant touch targets (44px minimum)
  - Safe area insets support for notched devices
- External links can be embedded into sidebar navigation
- External links included in backup/restore module
- Filament spool fill levels on printer cards
- Issue and pull request templates

### Changed
- Improved external link module with better icon layout
- Documentation moved to separate repository

### Fixed
- Notification module now properly saves newly added notification types
- External link icons layout improvements

## [0.1.5b3] - 2025-12-09

### Added
- Comprehensive backup/restore module improvements

### Fixed
- Switched off printers no longer incorrectly show as active
- os.path issue in update module

## [0.1.5b2] - 2025-12-09

### Added
- User options to backup module

### Changed
- App renamed to "Bambuddy"

### Fixed
- HTTP 500 error in backup module

## [0.1.5b] - 2025-12-08

### Added
- Smart plug monitoring and scheduling
- Daily digest notifications
- Notification template system
- Maintenance interval type: calendar days
- Cloud Profiles template visibility and preset diff view
- AMS humidity/temperature indicators with configurable thresholds
- Printer image on printer card
- WiFi signal strength indicator on printer card
- Power switch dropdown for offline printers
- MQTT debug viewer with filter and search
- Total printer hours display on printer card
- AMS discovery module
- Dual-nozzle AMS wiring visualization

### Changed
- Redesigned AMS section with BambuStudio-style device icons
- Tabbed design and auto-save for settings page
- Replaced camera settings with WiFi signal in top bar
- Completely refactored K-profile module
- Refactored maintenance settings

### Fixed
- HMS module bug
- Camera buttons appearance in light theme

### Removed
- Control page (removed all related code)

## [0.1.4] - 2025-12-01

### Added
- Multi-language support
- Auto app update functionality
- Maintenance module with notifications
- Spoolman support for adding unknown Bambu Lab spools
- Source 3MF file upload to archive cards

### Fixed
- K profiles retrieval from printer

## [0.1.3] - 2025-11-30

### Added
- Push notification support (WhatsApp, ntfy, Pushover, Telegram, Email)
- K profile management
- Configurable logging with log levels
- Sidebar item reordering
- Default view settings
- Option to track energy per print or in total
- Timelapse viewer improvements

### Fixed
- WebSocket connection stability
- Power stage updates not reflecting in frontend

## [0.1.2-bugfix] - 2025-11-30

### Fixed
- WebSocket disconnection issues

## [0.1.2-final] - 2025-11-29

### Added
- Print scheduling and queueing system
- Power consumption cost calculation
- HMS (Health Management System) error handling on printer cards
- Camera snapshot on print completion
- Power switch and automation controls on printer card
- Timelapse video player with speed controls
- Print time accuracy calculation
- Duplicate detection and filtering

### Changed
- Unified printer card layout

### Fixed
- Auto poweroff feature improvements
- Archive file handling on print start
- Statistics display issues

## [0.1.2] - 2025-11-28

### Added
- HMS health status monitoring
- MQTT debug log window
- Tasmota smart power plug support with automation
- Project page viewer and editor
- Button to show/hide disconnected printers
- Favicons

### Fixed
- Collapsed sidebar layout

## [0.1.1] - 2025-11-28

### Added
- Initial public release
- Multi-printer support via MQTT
- Real-time printer status monitoring
- Print archives with history tracking
- Statistics and analytics dashboard
- Timelapse video support
- Light and dark theme support

---

For more information, visit the [Bambuddy GitHub repository](https://github.com/maziggy/bambuddy).
