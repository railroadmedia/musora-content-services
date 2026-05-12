# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**musora-content-services** is an NPM package providing utility functions for fetching and managing content from Sanity Studio, Railcontent API, and user activity data. It serves as the primary content layer for all Musora brands (Drumeo, Pianote, Guitareo, Singeo). The package supports both web and React Native mobile applications with offline-first sync capabilities.

## Testing, Automated Tests
Do not run tests or try to run tests with npm test unless explicitly asked.

## Code Style Standards

### Self-Documenting Code
- Write clear, descriptive function and variable names that eliminate the need for comments
- Never add comments explaining what code does - the code itself should be clear
- Never add comments about code history, updates, or previous states
- Only add comments when code logic is genuinely complex and cannot be simplified further
- If you need a comment, first consider refactoring to make the code clearer

### Inline Comments
- Never add comments that explain what code does - the code should be self-explanatory
- Use descriptive variable and function names instead of comments
- Only add comments for genuinely complex logic that cannot be simplified

**Bad:**
```javascript
// Check if user has completed the award
if (progress === 100 && completedAt !== null) {

// Loop through all awards and filter completed ones
const completed = awards.filter(a => a.done)

// Calculate the percentage
const pct = (count / total) * 100
```

**Good:**
```javascript
const isAwardCompleted = progress === 100 && completedAt !== null
if (isAwardCompleted) {

const completedAwards = awards.filter(award => award.isCompleted)

const progressPercentage = (completedCount / totalCount) * 100
```

### JSDoc Guidelines
- Keep JSDoc blocks minimal - only include `@param`, `@returns`, `@throws`, `@example`, and type annotations
- Never add explainer text or descriptions before the first `@` tag
- Never add empty lines like `* ` at the start of JSDoc blocks
- Let function names be self-documenting; don't repeat what the name already says

**Bad:**
```javascript
/**
 * Register a callback function to be notified when the user earns a new award.
 * The callback receives an award object with completion data, badge URLs, and practice statistics.
 * Returns a cleanup function to unregister the callback when no longer needed.
 *
 * @param {Function} callback - The callback function
 * @returns {Function} Cleanup function
 */
```

**Good:**
```javascript
/**
 * @param {Function} callback - The callback function
 * @returns {Function} Cleanup function
 */
```

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

## React Native Compatibility

This package is used by both web applications and the **MusoraApp** React Native mobile application (iOS/Android). All code changes must be reviewed for React Native compatibility.

### MusoraApp Integration

MusoraApp consumes MCS in two ways:

1. **Direct imports** from the main package for content fetching, user services, and API calls
2. **Sync system imports** from internal paths for offline-first data management

**MusoraApp Sync Setup** (`MusoraApp/src_v2/sync/SyncManager.ts`):
```typescript
import { SyncManager, SyncContext } from 'musora-content-services/src/services/sync/index'
import syncDatabaseFactory from 'musora-content-services/src/services/sync/database/factory'
import { InitialStrategy, PollingStrategy } from 'musora-content-services/src/services/sync/strategies/index'
import { ContentLike, ContentProgress, Practice, PracticeDayNote } from 'musora-content-services/src/services/sync/models/index'

// MusoraApp provides platform-specific context providers:
// - SessionProvider: react-native-device-info for unique device ID
// - ConnectivityProvider: network state monitoring
// - VisibilityProvider: app foreground/background state
// - DurabilityProvider: no-op (storage always available on mobile)
// - TabsProvider: no-op (single "tab" on mobile)

const manager = new SyncManager(userScope, context, db)
manager.registerStrategies(
  ContentLike, ContentProgress, Practice, PracticeDayNote],
  [initialStrategy, onlineStrategy, activityStrategy, hourlyPollingStrategy]
)
```

**MCS Initialization in MusoraApp**:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { initializeService } from 'musora-content-services'

initializeService({
  sanityConfig: { token, projectId, dataset, version },
  railcontentConfig: { token, userId, baseUrl, authToken },
  localStorage: AsyncStorage,  // React Native async storage
  isMA: true                   // Enables async localStorage handling
})
```

### Compatibility Checklist

When writing or modifying code, verify compatibility with these rules:

**✅ Safe to Use:**
- `fetch` API (polyfilled in RN)
- `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`
- `Promise`, `async/await`
- `Map`, `Set`, `WeakMap`, `WeakSet`
- `JSON.parse`, `JSON.stringify`
- `Date`, `Math`, `Array`, `Object` methods
- `console.log`, `console.error`, `console.warn`
- `@nozbe/watermelondb` queries and models
- Event emitter patterns (custom pub/sub)

**⚠️ Requires Conditional Handling:**
- **localStorage**: Use `globalConfig.isMA` to detect React Native and handle async:
  ```javascript
  const value = globalConfig.isMA
    ? await globalConfig.localStorage.getItem(key)  // AsyncStorage (async)
    : globalConfig.localStorage.getItem(key)        // Web localStorage (sync)
  ```

**❌ Browser-Only APIs (avoid or provide alternatives):**
- `window`, `document`, `navigator` (except `navigator.onLine`)
- `FileReader`, `Blob.prototype.text()` for base64 conversion
- `localStorage` directly (use `globalConfig.localStorage`)
- `sessionStorage`
- `IndexedDB` directly (use WatermelonDB)
- `URL.createObjectURL`, `URL.revokeObjectURL`
- `canvas`, `Image` constructors
- `WebSocket` (use libraries like `react-native-websocket` instead)
- DOM manipulation APIs

**❌ Node.js APIs (not available in RN):**
- `fs`, `path`, `os`, `crypto` (Node modules)
- `Buffer` (use polyfill or `base-64` library)
- `process.env` (use react-native-config or similar)

### Adding New Sync Models

When adding new WatermelonDB models for sync:

1. Create model in `src/services/sync/models/`
2. Create repository in `src/services/sync/repositories/`
3. Add table schema to `src/services/sync/schema/index.ts`
4. Register in `src/services/sync/store-configs.ts`
5. Export from `src/services/sync/models/index.ts`
6. **Notify mobile team** to add the model to MusoraApp's `SyncManager.ts`

## Important Notes

- **Sync directory**: `src/services/sync/` has a `.indexignore` file to prevent sync functions from being auto-exported to the main package index (sync is used internally by mobile apps)
- **Content types**: When adding new content types, update `contentTypeConfig.js` with appropriate field mappings
- **Sanity queries**: Use GROQ syntax; complex queries should use `FilterBuilder` class
- **Multi-brand**: All functions should handle brand filtering (`drumeo`, `pianote`, `guitareo`, `singeo`)
- **Environment**: Always develop within railenvironment Docker container - paths and database connections assume this environment
- **React Native**: Always verify changes are compatible with React Native (see "React Native Compatibility" section above)
