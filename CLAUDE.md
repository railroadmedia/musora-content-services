# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**musora-content-services** is an NPM package providing utility functions for fetching and managing content from Sanity Studio, Railcontent API, and user activity data. It serves as the primary content layer for all Musora brands (Drumeo, Pianote, Guitareo, Singeo). The package supports both web and React Native mobile applications with offline-first sync capabilities.

## Code Style Standards
Self-Documenting Code
Write clear, descriptive function and variable names that eliminate the need for comments
Never add comments explaining what code does - the code itself should be clear
Never add comments about code history, updates, or previous states
Only add comments when code logic is genuinely complex and cannot be simplified further
If you need a comment, first consider refactoring to make the code clearer

## Development Setup

This repository must be developed within the railenvironment Docker container:

```bash
# From railenvironment directory
./rrr.sh                              # Enter manager container
r setup musora-content-services       # Initial setup
npm install                           # Install dependencies
```

Create `.env` file from 1Password note "musora-content-services .env".

## Core Commands

```bash
# Testing
npm test                              # Run full test suite
npm test -- -t="testName"             # Run specific test

# Building
npm run build-index                   # Generate index.js and index.d.ts from exports

# Documentation
npm run doc                           # Generate JSDoc documentation

# Publishing
./publish.sh                          # Publish new version to NPM (auto-increments version)

# Local Development
./link_mcs.sh                         # Symlink to musora-platform-frontend for local testing
```

## Architecture Overview

### Service Organization

All services are located in `src/services/` and organized by domain:

**Content Services** (`src/services/`)
- `sanity.js` - Sanity CMS queries using GROQ (primary content source)
- `content.js` - High-level content aggregation and content rows
- `railcontent.js` - Legacy Railcontent API interactions
- `contentProgress.js` - User progress tracking (started, completed, watch sessions)
- `contentLikes.js` - Content like/unlike operations
- `userActivity.js` - Practice sessions, activity tracking, statistics

**Content Organization** (`src/services/content-org/`)
- `learning-paths.ts` - Learning path enrollment and progression
- `guided-courses.ts` - Guided course enrollment
- `playlists.js` - User playlist management

**User Services** (`src/services/user/`)
- `account.ts` - Account management, email changes, password resets
- `profile.js` - User profiles, pictures, signatures
- `permissions.js` - User permission checking
- `notifications.js` - Notification management
- `onboarding.ts` - User onboarding flows
- `memberships.ts` - Subscription and membership data

**Forums** (`src/services/forums/`)
- `threads.ts` - Forum thread operations
- `posts.ts` - Forum post CRUD
- `categories.ts` - Forum category management

**Gamification** (`src/services/gamification/`)
- `awards.ts` - Awards, badges, and certificates

**Sync System** (`src/services/sync/`) - WatermelonDB-based offline sync
- `manager.ts` - Sync orchestration
- `models/` - ContentProgress, ContentLike, ContentPractice models
- `repositories/` - Data access layer
- `strategies/` - Initial and polling sync strategies
- `context/` - Connectivity, visibility, and session providers

### Content Type Configuration

`src/contentTypeConfig.js` is the central configuration defining:
- Content type field mappings for Sanity queries
- Lesson type categorization (shows, courses, songs, etc.)
- Filter-to-GROQ conversion logic
- Content hierarchy relationships

Content types include: `course`, `song`, `play-along`, `workout`, `quick-tips`, `guided-course`, `learning-path-v2`, `pack`, `song-tutorial`, and many show-specific types.

### Index Generation System

`src/index.js` and `src/index.d.ts` are **auto-generated** files:

```bash
npm run build-index  # Regenerates these files
```

The generator (`tools/generate-index.cjs`) scans `src/services/` for:
- `export function` and `export async function` declarations
- `export const globalConfig` variables
- Functions excluded via `excludeFromGeneratedIndex` array in each file
- Directories with `.indexignore` (e.g., `sync/` - see note below)

### Key Design Patterns

**Configuration**: Global config must be initialized before use:
```javascript
import { initializeService } from 'musora-content-services'

initializeService({
  sanityConfig: { token, projectId, dataset, version },
  railcontentConfig: { token, userId, baseUrl, authToken },
  localStorage: localStorage,
  isMA: false  // Mobile app flag
})
```

**Content Fetching**: Most Sanity queries accept:
- `brand` - Filter by brand (drumeo, pianote, guitareo, singeo)
- `limit` and `start` - Pagination
- `filters` - Array of filter strings (converted to GROQ via `filtersToGroq()`)
- `fields` - Custom field selection (uses `getFieldsForContentType()`)

**Sync System**: The sync layer provides offline-first data access for mobile:
- Uses WatermelonDB for local storage
- Supports both SQLite (React Native) and LokiJS (web) adapters
- Tracks content progress, likes, and practice sessions
- Automatic retry with exponential backoff
- Context-aware syncing (connectivity, visibility, session state)

**Testing**: See "Testing Framework" section below.

## Publishing Workflow

1. Make changes and commit
2. Run `./publish.sh` which:
   - Checks for uncommitted changes
   - Runs `npm run release` (standard-version for semver and CHANGELOG)
   - Pushes to `project-v2` branch
   - Publishes to NPM

Version is auto-incremented in package.json and documented in CHANGELOG.md.

## Testing Framework

### Test Configuration
- **Framework**: Jest with ts-jest preset for TypeScript support
- **Config**: `jest.config.js` in project root
- **Coverage**: Enabled by default, outputs to `coverage/` directory
- **Environment variables**: Loaded from `.env` via `dotenv/config` in `setupFilesAfterEnv`

### Test Structure
```
test/
├── awards/                    # Award calculation tests
├── live/                      # Live API tests (ignored by default)
├── mockData/                  # Test fixtures and mock data
├── lib/                       # Test utilities
├── user/                      # User service tests
├── initializeTests.js         # Test initialization helper
├── localStorageMock.js        # LocalStorage mock implementation
└── *.test.js                  # Unit tests for services
```

### Running Tests
```bash
npm test                       # Run all tests (excludes test/live/)
npm test test/awards           # Run tests in specific directory
npm test specific.test.js      # Run specific test file
npm test -- -t="test name"     # Run tests matching name pattern
npx jest --watch               # Run in watch mode
```

### Test Patterns

**Initialization**: All tests use `initializeTestService()` from `test/initializeTests.js`:
```javascript
import { initializeTestService } from './initializeTests'

beforeEach(() => {
  initializeTestService()  // Mocked services
})

beforeEach(async () => {
  await initializeTestService(true)  // Live API calls
}, 1000000)
```

**Mocking**: Tests mock external dependencies using Jest spies:
```javascript
const railContentModule = require('../src/services/railcontent.js')
const mock = jest.spyOn(railContentModule, 'fetchUserPermissionsData')
mock.mockImplementation(() => ({ permissions: [78, 91, 92], isAdmin: false }))
```

**Unit Tests**: Pure calculation tests in `test/awards/` don't require service initialization:
```javascript
describe('ContentPractice Calculations', () => {
  test('converts seconds to minutes correctly', () => {
    const secondsToMinutes = (seconds) => Math.round(seconds / 60)
    expect(secondsToMinutes(600)).toBe(10)
  })
})
```

**Integration Tests**: Service tests in `test/*.test.js` use initialized services and mock data:
```javascript
describe('contentProgressDataContext', () => {
  beforeEach(() => {
    initializeTestService()
    const mock = jest.spyOn(dataContext, 'fetchData')
    mock.mockImplementation(() => mockProgressData)
  })

  test('getProgressPercentage', async () => {
    const result = await getProgressPercentage(234191)
    expect(result).toBe(6)
  })
})
```

**Live Tests**: Tests in `test/live/` make real API calls (excluded by `modulePathIgnorePatterns`):
- Require valid credentials in `.env`
- Use `initializeTestService(true)` to authenticate
- Longer timeouts (1000000ms) for API calls

### Test Utilities
- **LocalStorageMock** (`test/localStorageMock.js`): In-memory localStorage implementation
- **initializeTestService**: Configures `globalConfig` with test credentials, mocks permissions
- **Mock Data**: JSON fixtures in `test/mockData/` for consistent test scenarios

### TypeScript Testing
- TypeScript files (`.ts`) transformed via `ts-jest`
- JavaScript files (`.js`) transformed via `babel-jest`
- Type checking occurs during test runs for `.ts` files

## Important Notes

- **Sync directory**: `src/services/sync/` has a `.indexignore` file to prevent sync functions from being auto-exported to the main package index (sync is used internally by mobile apps)
- **Content types**: When adding new content types, update `contentTypeConfig.js` with appropriate field mappings
- **Sanity queries**: Use GROQ syntax; complex queries should use `FilterBuilder` class
- **Multi-brand**: All functions should handle brand filtering (`drumeo`, `pianote`, `guitareo`, `singeo`)
- **Environment**: Always develop within railenvironment Docker container - paths and database connections assume this environment
