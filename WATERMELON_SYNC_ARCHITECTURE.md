# WatermelonDB Sync System - Frontend Implementation

## Architecture Overview

This document describes the **client-side WatermelonDB sync implementation** in `musora-content-services`. The system provides an offline-first, bi-directional sync layer that works seamlessly with the Laravel backend sync API. Built on WatermelonDB, it enables React Native mobile apps and web browsers to maintain local databases that automatically sync with the server.

---

## 1. Core Architecture Components

### Directory Structure: `src/services/sync/`

```
sync/
├── manager.ts                 # Orchestrates entire sync system
├── store/                     # Per-model sync stores
│   ├── index.ts              # Store implementation (pull/push logic)
│   └── push-coalescer.ts     # Batches concurrent push operations
├── models/                    # WatermelonDB model definitions
│   ├── Base.ts               # Base model with timestamps
│   ├── ContentProgress.ts    # Progress tracking model
│   └── ContentLike.ts        # Content likes model
├── repositories/              # High-level data access layer
│   ├── base.ts               # Base repository with read/write patterns
│   ├── content-progress.ts   # Progress-specific queries
│   └── content-likes.ts      # Likes-specific queries
├── strategies/                # Sync trigger strategies
│   ├── initial.ts            # Triggers sync on initialization
│   └── polling.ts            # Periodic background sync
├── context/                   # Runtime context providers
│   └── providers/            # Connectivity, visibility, session, etc.
├── fetch.ts                   # HTTP pull/push handlers
├── resolver.ts                # Conflict resolution logic
├── retry.ts                   # Exponential backoff retry system
├── concurrency-safety.ts      # Multi-tab coordination
├── schema/                    # WatermelonDB schema definitions
└── telemetry/                 # Performance monitoring
```

---

## 2. Key Components

### SyncManager - Central Orchestrator

**File:** `src/services/sync/manager.ts`

The singleton manager that initializes and coordinates all sync operations:

```typescript
class SyncManager {
  private database: Database              // WatermelonDB instance
  private context: SyncContext            // Runtime context (connectivity, etc.)
  private storesRegistry: SyncStore[]     // Per-model sync stores
  private strategyMap: Strategy[]         // Sync trigger strategies
  private retry: SyncRetry                // Retry mechanism
  private telemetry: SyncTelemetry        // Performance tracking
}
```

**Responsibilities:**
- Initializes WatermelonDB database
- Registers sync stores for each model
- Manages sync strategies (initial, polling)
- Coordinates context providers
- Provides singleton access via `getInstance()`

**Usage:**
```typescript
const teardown = SyncManager.assignAndSetupInstance(
  new SyncManager(context, initDatabase)
)

// Later, to access:
const manager = SyncManager.getInstance()
const store = manager.getStore(ContentProgress)
```

---

### SyncStore - Per-Model Sync Logic

**File:** `src/services/sync/store/index.ts`

Each model (ContentProgress, ContentLike) has a dedicated store handling all sync operations:

```typescript
class SyncStore<TModel> {
  readonly model: ModelClass<TModel>
  readonly collection: Collection<TModel>

  readonly puller: SyncPull     // Fetches from server
  readonly pusher: SyncPush     // Sends to server

  private lastFetchTokenKey: string  // Stores last sync timestamp
  private pullThrottleState: ThrottleState
  private pushThrottleState: ThrottleState
  private pushCoalescer: PushCoalescer
}
```

**Key Methods:**
- `requestSync(reason)` - Triggers pull + push cycle
- `pullRecords()` - Downloads changes from server
- `pushRecordIdsImpatiently(ids)` - Immediately syncs specific records
- `upsertOne/upsertSome()` - Local writes with automatic sync queueing
- `deleteOne()` - Soft deletes with sync
- `readOne/queryAll()` - Local reads with auto-pull if needed

**Throttling:**
- Pull: 2 second throttle (prevents excessive server calls)
- Push: 1 second throttle (batches rapid writes)

**Push Coalescing:** Multiple rapid writes to the same record are merged into a single network request.

---

### Models - Data Definitions

**File:** `src/services/sync/models/`

#### Base Model
```typescript
class BaseModel extends Model {
  get created_at(): EpochSeconds
  get updated_at(): EpochSeconds

  // Auto-updates timestamps on create/update
  prepareUpdate(builder)
  prepareMarkAsDeleted()  // Soft delete
}
```

#### ContentProgress Model
```typescript
class ContentProgress extends BaseModel {
  content_id: number
  collection_type: COLLECTION_TYPE | null   // 'learning-path'
  collection_id: number | null
  state: STATE                              // 'started' | 'completed'
  progress_percent: number                  // 0-100
  resume_time_seconds: number
}
```

**Context-Aware Progress:** The `client_record_id` format allows tracking the same content's progress in different contexts:
- Standalone: `"12345"`
- In learning path: `"12345:learning-path:67890"`

#### ContentLike Model
```typescript
class ContentLike extends BaseModel {
  content_id: number
}
```

---

### Repositories - Data Access Layer

**File:** `src/services/sync/repositories/`

Repositories provide high-level APIs wrapping store operations with smart caching:

```typescript
class SyncRepository<TModel> {
  protected readOne(id)          // Read with auto-pull on first access
  protected queryAll(...clauses) // Query with WatermelonDB Q clauses
  protected upsertOne(id, builder)          // Write + auto-push
  protected upsertOneRemote(id, builder)    // Write + immediate push
  protected deleteOne(id)                   // Delete + sync
}
```

**Response Pattern:**
```typescript
type SyncReadDTO<T> = {
  data: T
  status: 'fresh' | 'stale'       // Was data just pulled?
  pullStatus: 'success' | 'failure' | null
  lastFetchToken: SyncToken | null
}

type SyncWriteDTO<T> = {
  data: T
  status: 'synced' | 'unsynced'   // Did push succeed?
  pushStatus: 'success' | 'pending' | 'failure'
}
```

#### ContentProgressRepository

**File:** `src/services/sync/repositories/content-progress.ts`

```typescript
class ProgressRepository extends SyncRepository<ContentProgress> {
  // Queries
  startedIds(limit?)
  completedIds(limit?)
  startedOrCompleted({ brand?, updatedAfter?, limit? })
  getOneProgressByContentId(contentId, { collection? })
  getSomeProgressByContentIds(contentIds, { collection? })

  // Mutations
  recordProgressRemotely(contentId, progressPct, resumeTime?)
  recordProgressesTentative(Map<contentId, progressPct>)
  eraseProgress(contentId)

  // ID Generation
  static generateId(contentId, collection)
    // => "123" or "123:learning-path:456"
}
```

---

### Sync Strategies - Trigger Mechanisms

**File:** `src/services/sync/strategies/`

Strategies determine **when** to trigger sync operations:

#### InitialStrategy
```typescript
class InitialStrategy extends BaseStrategy {
  start() {
    // Triggers sync immediately on app startup
    this.registry.forEach(({ callback }) => callback('initial'))
  }
}
```

#### PollingStrategy
```typescript
class PollingStrategy extends BaseStrategy {
  constructor(context: SyncContext, intervalMs: number)

  start() {
    // Polls server every intervalMs (only when tab visible)
    // Auto-resets timer after successful pull
    this.startTimer(store, callback)
  }
}
```

**Usage Example:**
```typescript
syncManager.syncStoresWithStrategies(
  [progressStore, likesStore],
  [
    new InitialStrategy(context),
    new PollingStrategy(context, 60_000)  // Poll every 60s
  ]
)
```

---

### SyncContext - Runtime Providers

**File:** `src/services/sync/context/`

Context provides runtime information that affects sync behavior:

```typescript
class SyncContext {
  session: BaseSessionProvider       // User auth + client IDs
  connectivity: BaseConnectivityProvider  // Online/offline
  visibility: BaseVisibilityProvider      // Tab visible/hidden
  tabs: BaseTabsProvider             // Multi-tab coordination
  durability: BaseDurabilityProvider // Persistence guarantees
}
```

**Provider Examples:**

**SessionProvider:** Supplies auth tokens and client identifiers
```typescript
interface BaseSessionProvider {
  getAuthToken(): string
  getClientId(): string           // Semi-permanent device ID
  getSessionId(): string | null   // Ephemeral tab/session ID
}
```

**ConnectivityProvider:** Tracks network status
```typescript
interface BaseConnectivityProvider {
  getValue(): boolean           // Current online status
  subscribe(callback): void     // Listen to changes
}
```

**VisibilityProvider:** Tracks if browser tab is visible
```typescript
interface BaseVisibilityProvider {
  getValue(): boolean
  subscribe(callback): void
}
```

**DurabilityProvider:** Controls sync timing behavior
```typescript
interface BaseDurabilityProvider {
  getValue(): boolean
  // false = sync immediately (optimistic)
  // true = sync later (batch operations)
}
```

---

### SyncRetry - Exponential Backoff

**File:** `src/services/sync/retry.ts`

Automatic retry system with exponential backoff:

```typescript
class SyncRetry {
  private readonly BASE_BACKOFF = 1_000      // 1 second
  private readonly MAX_BACKOFF = 8_000       // 8 seconds
  private readonly MAX_ATTEMPTS = 4

  async request<T>(spanOpts, syncFn) {
    // Retries with: 1s, 2s, 4s, 8s delays (with jitter)
    // Pauses retries when offline
    // Resets backoff on success
  }
}
```

**Behavior:**
- Attempt 1: Immediate
- Attempt 2: Wait 1s (± 25% jitter)
- Attempt 3: Wait 2s (± 25% jitter)
- Attempt 4: Wait 4s (± 25% jitter)
- Failure: Wait 8s, then listen for connectivity change

---

### Conflict Resolver

**File:** `src/services/sync/resolver.ts`

Resolves conflicts when local and server states diverge:

```typescript
type SyncResolverComparator = (
  serverEntry: SyncEntry,
  localModel: Model
) => 'SERVER' | 'LOCAL'

class SyncResolver {
  againstNone(server)       // Server has record, local doesn't
  againstSynced(local, server)   // Local in sync, server changed
  againstCreated(local, server)  // Local created, server has version
  againstUpdated(local, server)  // Local updated, server has version
  againstDeleted(local, server)  // Local deleted, server has version

  get result(): SyncResolution {
    entriesForCreate: SyncEntry[]
    tuplesForUpdate: [Model, SyncEntry][]
    tuplesForRestore: [Model, SyncEntry][]  // Undelete from server
    idsForDestroy: RecordId[]
  }
}
```

**Default Comparator (updatedAtComparator):**
```typescript
// Server wins if timestamps equal or newer
server.updated_at >= local.updated_at ? 'SERVER' : 'LOCAL'
```

**Custom Comparator (ContentProgress):**
```typescript
// Prefers higher progress percentage unless one is 0
if (server.progress_percent === 0 || local.progress_percent === 0) {
  return server.updated_at >= local.updated_at ? 'SERVER' : 'LOCAL'
} else {
  return server.progress_percent >= local.progress_percent ? 'SERVER' : 'LOCAL'
}
```

**Conflict Resolution Rules:**

| Local State | Server State | Resolution |
|------------|--------------|------------|
| None | Exists | Create locally |
| Synced | Updated | Update to server (if newer) |
| Synced | Deleted | Delete locally |
| Created | Updated | Update to server (if newer) |
| Created | Deleted | Delete locally (server wins) |
| Updated | Updated | Compare via comparator |
| Updated | Deleted | Delete locally (server wins) |
| Deleted | Exists | Restore from server (if server newer) |
| Deleted | Deleted | Permanently destroy |

---

## 3. Sync Protocol & Flow

### Pull Flow (Server → Client)

```
1. Client: GET /content/user/progress?since=1234567890
   Headers:
     Authorization: Bearer <token>
     X-Sync-Client-Id: <device-uuid>
     X-Sync-Client-Session-Id: <tab-uuid>

2. Server responds with entries + max_updated_at

3. Client processes entries:
   - Query local DB for existing records
   - Run conflict resolver for each entry
   - Execute batch operations:
     a. Destroy permanently deleted records
     b. Create new records (status='synced')
     c. Update existing records (status='synced')
     d. Restore soft-deleted records

4. Client stores max_updated_at as lastFetchToken
   (used as 'since' parameter in next pull)

5. Emit 'pullCompleted' event
```

**Pull Response Format:**
```json
{
  "meta": {
    "since": 1234567890,
    "max_updated_at": 1234567891,
    "timestamp": 1234567892
  },
  "entries": [
    {
      "record": {
        "content_id": 123,
        "collection_type": "learning-path",
        "collection_id": 456,
        "progress_percent": 75,
        "resume_time_seconds": 120,
        "state": "started"
      },
      "meta": {
        "ids": { "client_record_id": "123:learning-path:456" },
        "lifecycle": {
          "created_at": 1234567890,
          "updated_at": 1234567891,
          "deleted_at": null
        }
      }
    }
  ]
}
```

---

### Push Flow (Client → Server)

```
1. Client detects unsaved changes (_status != 'synced')

2. Throttle + coalesce:
   - Wait 1 second for more changes
   - Merge multiple writes to same record

3. Generate push payload:
   - Serialize local records
   - Convert 'id' → 'client_record_id'
   - Mark deleted records with record=null

4. POST /content/user/progress
   Headers:
     X-Sync-Client-Id: <device-uuid>
     X-Sync-Client-Session-Id: <tab-uuid>
   Body: { entries: [...] }

5. Server responds with success/failure per entry

6. Client processes response:
   - For successes: Update local with server state
   - For failures: Keep local changes, log error

7. Mark successfully synced records as status='synced'

8. Emit 'pushCompleted' event
```

**Push Request Format:**
```json
{
  "entries": [
    {
      "record": {
        "client_record_id": "123:learning-path:456",
        "content_id": 123,
        "collection_type": "learning-path",
        "collection_id": 456,
        "progress_percent": 80,
        "resume_time_seconds": 150,
        "state": "started"
      },
      "meta": {
        "ids": { "client_record_id": "123:learning-path:456" },
        "deleted": false
      }
    },
    {
      "record": null,
      "meta": {
        "ids": { "client_record_id": "789" },
        "deleted": true
      }
    }
  ]
}
```

**Push Response Format:**
```json
{
  "results": [
    {
      "type": "success",
      "entry": {
        "record": { /* updated server state */ },
        "meta": { /* server lifecycle timestamps */ }
      }
    },
    {
      "type": "failure",
      "failureType": "validation",
      "ids": { "client_record_id": "456" },
      "errors": {
        "progress_percent": ["Must be between 0 and 100"]
      }
    }
  ]
}
```

---

### ID Transformation (Client ↔ Server)

The sync system uses different ID field names on client vs. server:

**Client (Local DB):**
```typescript
{ id: "123:learning-path:456", content_id: 123, ... }
```

**Server (API):**
```json
{ "client_record_id": "123:learning-path:456", "content_id": 123, ... }
```

**Transformation Functions:** (`fetch.ts`)
```typescript
function serializeIds(ids: { id: RecordId }): { client_record_id: RecordId }
function deserializeIds(ids: { client_record_id: RecordId }): { id: RecordId }

function serializeRecord(record): ServerRecord
  // { id, ...rest } → { client_record_id: id, ...rest }

function deserializeRecord(record): ClientRecord
  // { client_record_id, ...rest } → { id: client_record_id, ...rest }
```

---

## 4. Database Schema

**File:** `src/services/sync/schema/index.ts`

WatermelonDB schema definition:

```typescript
const contentProgressTable = tableSchema({
  name: 'progress',
  columns: [
    { name: 'content_id', type: 'number', isIndexed: true },
    { name: 'content_brand', type: 'string', isIndexed: true },
    { name: 'collection_type', type: 'string', isOptional: true, isIndexed: true },
    { name: 'collection_id', type: 'number', isOptional: true, isIndexed: true },
    { name: 'state', type: 'string', isIndexed: true },
    { name: 'progress_percent', type: 'number' },
    { name: 'resume_time_seconds', type: 'number' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number', isIndexed: true }
  ]
})
```

**Indexes:** Optimized for common queries
- `content_id` - Lookup by content
- `content_brand` - Filter by brand
- `collection_type` + `collection_id` - Context-specific queries
- `state` - Filter by started/completed
- `updated_at` - Sort by recency

---

## 5. Storage Adapters

WatermelonDB supports multiple storage backends:

### LokiJS Adapter (Web/Browser)
- **Storage:** IndexedDB
- **Performance:** Fast in-memory operations
- **Persistence:** Lazy writes to IndexedDB
- **Issue:** Risk of data loss on tab close before flush
- **Solution:** `ensurePersistence()` forces immediate save

### SQLite Adapter (React Native)
- **Storage:** Native SQLite database
- **Performance:** Direct disk writes
- **Persistence:** Guaranteed on write
- **Platform:** iOS + Android

**Configuration:**
```typescript
import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

const adapter = Platform.OS === 'web'
  ? new LokiJSAdapter({ schema, useWebWorker: false })
  : new SQLiteAdapter({ schema, dbName: 'musora.db' })

const database = new Database({ adapter, modelClasses: [ContentProgress, ContentLike] })
```

---

## 6. Repository Proxy Pattern

**File:** `src/services/sync/repository-proxy.ts`

Lazy-loading singleton access to repositories:

```typescript
import db from './repository-proxy'

// Lazy initialization on first access
const progress = await db.contentProgress.getOneProgressByContentId(123)
const likes = await db.likes.readAll()
```

**Implementation:**
```typescript
const repositories = new Proxy({}, {
  get(target, prop) {
    if (!target[prop]) {
      const manager = SyncManager.getInstance()
      switch (prop) {
        case 'likes':
          target[prop] = new ContentLikesRepository(manager.getStore(ContentLike))
          break
        case 'contentProgress':
          target[prop] = new ContentProgressRepository(manager.getStore(ContentProgress))
          break
      }
    }
    return target[prop]
  }
})
```

---

## 7. Configuration & Initialization

**File:** `src/services/sync/store-configs.ts`

Store configurations define endpoints and conflict resolvers:

```typescript
const stores = [
  {
    model: ContentLike,
    pull: handlePull(makeFetchRequest('/api/content/v1/user/likes')),
    push: handlePush(makeFetchRequest('/api/content/v1/user/likes', { method: 'POST' }))
  },

  {
    model: ContentProgress,
    comparator: (server, local) => {
      // Custom: Prefer higher progress unless one is 0
      if (server.record.progress_percent === 0 || local.progress_percent === 0) {
        return server.updated_at >= local.updated_at ? 'SERVER' : 'LOCAL'
      } else {
        return server.record.progress_percent >= local.progress_percent ? 'SERVER' : 'LOCAL'
      }
    },
    pull: handlePull(makeFetchRequest('/content/user/progress')),
    push: handlePush(makeFetchRequest('/content/user/progress', { method: 'POST' }))
  }
]
```

**Initialization Example:**
```typescript
// 1. Create context providers
const context = new SyncContext({
  session: new SessionProvider(authToken, clientId, sessionId),
  connectivity: new ConnectivityProvider(navigator.onLine),
  visibility: new VisibilityProvider(document.visibilityState),
  tabs: new TabsProvider(),
  durability: new DurabilityProvider(false)  // Optimistic sync
})

// 2. Initialize database
const database = new Database({
  adapter: new LokiJSAdapter({ schema }),
  modelClasses: [ContentProgress, ContentLike]
})

// 3. Create and setup manager
const manager = new SyncManager(context, () => database)
const teardown = SyncManager.assignAndSetupInstance(manager)

// 4. Configure strategies
manager.syncStoresWithStrategies(
  manager.storesForModels([ContentProgress, ContentLike]),
  [
    manager.createStrategy(InitialStrategy),
    manager.createStrategy(PollingStrategy, 60_000)
  ]
)

// 5. Setup concurrency safety (if needed)
// manager.protectStores(stores, [multiTabCoordination])

// Cleanup on unmount
onUnmount(() => teardown())
```

---

## 8. Telemetry & Debugging

**File:** `src/services/sync/telemetry/`

Built-in performance tracking and debugging:

```typescript
class SyncTelemetry {
  trace<T>(options: StartSpanOptions, fn: (span: Span) => T): T
  debug(message: string, context?: any)
  error(message: string, context?: any)
}
```

**Span Operations:**
- `sync` - Full sync cycle
- `pull` - Pull from server
- `pull:run` - Executing pull request
- `pull:run:fetch` - Network request
- `push` - Push to server
- `push:run:fetch` - Network request
- `write` - Database write
- `write:generate` - Preparing batch operations

**Sampling:** Configurable sampling rate to reduce overhead in production.

---

## 9. Advanced Features

### Push Coalescing

**File:** `src/services/sync/store/push-coalescer.ts`

Merges multiple rapid writes to the same record:

```typescript
// User changes progress 3 times in quick succession
await store.upsertOne("123", r => r.progress_percent = 25)
await store.upsertOne("123", r => r.progress_percent = 50)
await store.upsertOne("123", r => r.progress_percent = 75)

// Result: Only ONE network request with progress_percent=75
```

**Implementation:**
- Maintains a queue of pending records
- Deduplicates by record ID
- Waits for throttle window
- Sends only latest version

### Throttling

**Pull Throttle (Drop):**
- Multiple pull requests within 2s → Only first executes
- Subsequent calls return cached result
- Prevents server overload from rapid UI interactions

**Push Throttle (Queue):**
- Batches writes within 1s window
- Ensures all changes eventually sync
- Optimizes network usage

### Multi-Tab Coordination

**Challenge:** Multiple browser tabs can create conflicting local changes.

**Solution:** BroadcastChannel communication
- Tabs notify each other of writes
- Receiving tabs trigger pull to get updates
- Prevents stale reads across tabs

---

## 10. Error Handling

### Network Errors

**Retryable (5xx, 429, 408):**
- Automatically retried with exponential backoff
- Up to 4 attempts
- Waits for connectivity restoration

**Non-Retryable (4xx):**
- Returned immediately as failure
- Logged for debugging
- Validation errors surfaced to UI

### Offline Handling

1. **Write operations:** Always succeed locally, queued for sync
2. **Read operations:**
   - First read: Attempts pull, throws if offline
   - Subsequent reads: Returns cached data
3. **Connectivity restoration:** Automatically triggers sync

### Conflict Resolution

**Server wins by default**, but customizable per model:
- ContentProgress: Higher progress wins
- ContentLike: Latest timestamp wins
- Deleted records: Always propagate deletion

---

## 11. Usage Examples

### Recording Progress

```typescript
import db from './sync/repository-proxy'

// Immediate sync (waits for server response)
const result = await db.contentProgress.recordProgressRemotely(
  contentId: 12345,
  progressPct: 75,
  resumeTime: 120
)

if (result.pushStatus === 'success') {
  console.log('Progress synced:', result.data)
} else {
  console.log('Progress queued for sync:', result.data)
}
```

### Querying Progress

```typescript
// Get progress for specific content in learning path
const progress = await db.contentProgress.getOneProgressByContentId(
  12345,
  { collection: { type: 'learning-path', id: 67890 } }
)

if (progress.status === 'fresh') {
  console.log('Just pulled from server:', progress.data)
} else {
  console.log('Using cached data:', progress.data)
}

// Get all started content
const started = await db.contentProgress.startedIds(limit: 50)
console.log('Started content IDs:', started.data)

// Get recently updated progress
const recent = await db.contentProgress.startedOrCompleted({
  brand: 'drumeo',
  updatedAfter: Date.now() / 1000 - 86400,  // Last 24 hours
  limit: 100
})
```

### Batching Updates

```typescript
// Tentative writes (mark as synced, skip immediate push)
await db.contentProgress.recordProgressesTentative(
  new Map([
    [123, 50],
    [456, 75],
    [789, 100]
  ])
)

// Background sync will eventually push these changes
```

### Manually Triggering Sync

```typescript
const manager = SyncManager.getInstance()
const store = manager.getStore(ContentProgress)

// Trigger full sync cycle
await store.requestSync('manual-trigger')

// Sync specific records immediately
await store.pushRecordIdsImpatiently(['123', '456'])
```

---

## 12. Performance Optimizations

### Lazy Persistence (LokiJS Only)

**Problem:** IndexedDB writes are async, risk data loss on tab close.

**Solution:** Force immediate save after critical writes
```typescript
await this.db.adapter.underlyingAdapter._driver.loki.saveDatabase()
```

### Query Optimization

**Indexes:** Strategic indexes on frequently queried fields
- `content_id` - Most common lookup
- `updated_at` - Sorting by recency
- `state` - Filtering by started/completed

**Batch Operations:** Use WatermelonDB's batch API for multiple writes
```typescript
await db.write(async () => {
  await db.batch(...operations)
})
```

### Throttling & Coalescing

- **Pull throttle:** Prevents redundant server requests
- **Push throttle:** Batches rapid writes
- **Coalescing:** Merges duplicate record updates

---

## 13. Testing Strategy

### Unit Tests

Test individual components in isolation:
- Resolver conflict resolution logic
- Serialization/deserialization
- ID generation

### Integration Tests

Test sync flows with mock server:
- Pull with various server responses
- Push with validation errors
- Conflict resolution scenarios

### E2E Tests

Test full sync cycle:
- Offline → write → online → sync
- Multi-device sync
- Tab coordination

---

## 14. Comparison with Backend

| Aspect | Backend (Laravel) | Frontend (WatermelonDB) |
|--------|-------------------|-------------------------|
| **Language** | PHP | TypeScript |
| **Storage** | MySQL | SQLite / IndexedDB |
| **Primary Key** | `client_record_id` (DB column) | `id` (local, mapped to `client_record_id` on server) |
| **Soft Deletes** | `deleted_at` timestamp | `_status = 'deleted'` |
| **Hierarchy** | Bubbling/trickling logic | Client responsibility |
| **Caching** | Redis pull cache | LocalStorage for `lastFetchToken` |
| **Conflict Resolution** | Server always wins | Configurable comparator |
| **Client Tracking** | `last_client_id`, `last_client_session_id` | Sent in headers |

---

## 15. Future Enhancements

### Potential Improvements

1. **Delta Sync:** Send only changed fields, not full records
2. **Batch Conflict Resolution:** Resolve conflicts in bulk on server
3. **Partial Pull:** Fetch only specific content IDs instead of full dataset
4. **Schema Migrations:** Automated WatermelonDB schema versioning
5. **Offline Queue UI:** Show pending sync operations to user
6. **Sync Metrics Dashboard:** Real-time sync health monitoring

---

## 16. File Location Reference

| Component | Path |
|-----------|------|
| **Manager** | `src/services/sync/manager.ts` |
| **Store** | `src/services/sync/store/index.ts` |
| **Models** | `src/services/sync/models/` |
| **Repositories** | `src/services/sync/repositories/` |
| **Repository Proxy** | `src/services/sync/repository-proxy.ts` |
| **Strategies** | `src/services/sync/strategies/` |
| **Context** | `src/services/sync/context/` |
| **Providers** | `src/services/sync/context/providers/` |
| **Fetch Handlers** | `src/services/sync/fetch.ts` |
| **Resolver** | `src/services/sync/resolver.ts` |
| **Retry** | `src/services/sync/retry.ts` |
| **Schema** | `src/services/sync/schema/index.ts` |
| **Config** | `src/services/sync/store-configs.ts` |
| **Telemetry** | `src/services/sync/telemetry/` |
| **Concurrency** | `src/services/sync/concurrency-safety.ts` |

---

## 17. Summary

This is a **production-grade offline-first sync system** that:

✅ Implements WatermelonDB patterns with custom conflict resolution
✅ Provides seamless offline → online transitions
✅ Handles multi-tab coordination
✅ Implements exponential backoff retry logic
✅ Supports context-aware progress tracking (same content, different contexts)
✅ Optimizes network usage with throttling and coalescing
✅ Provides comprehensive telemetry for debugging
✅ Maintains compatibility with Laravel backend sync protocol

The **context-aware progress** (`collection_type`/`collection_id`) mirrors the backend innovation, allowing users to have different progress for the same lesson when accessed standalone vs. within a learning path or playlist.

The system is designed for **React Native mobile applications** but also supports **web browsers**, making it a versatile solution for the entire Musora ecosystem (Drumeo, Pianote, Guitareo, Singeo).
