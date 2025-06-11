# Sanity Infrastructure

This module provides a TypeScript-based infrastructure for interacting with Sanity CMS, following the same architectural patterns as the HTTP client.

## Architecture

The Sanity infrastructure follows a modular design with clear separation of concerns:

- **SanityClient**: Base client class that provides low-level methods for executing raw GROQ queries
- **ContentClient**: Specialized client that extends SanityClient with content-specific methods like `fetchById`
- **Interfaces**: Define contracts for configuration, queries, responses, and errors
- **Providers**: Handle configuration management
- **Executors**: Handle the actual execution of queries against the Sanity API

## Usage

### Basic Usage

```typescript
import { SanityClient, ContentClient } from './infrastructure/sanity'

// Create client instances (use global configuration automatically)
const sanityClient = new SanityClient()      // For raw GROQ queries
const contentClient = new ContentClient()    // For content-specific operations

// Fetch a single document by type and ID (recommended approach)
const song = await contentClient.fetchById({
  type: 'song',
  id: 123
})

// Fetch with custom fields
const songWithCustomFields = await contentClient.fetchById({
  type: 'song',
  id: 123,
  fields: [
    "'id': railcontent_id",
    'title',
    "'artist': artist->name",
    'album',
    'difficulty_string'
  ]
})

// Fetch with children (for courses, packs, etc.)
const courseWithLessons = await contentClient.fetchById({
  type: 'course',
  id: 456,
  includeChildren: true
})

// Fetch multiple content items by IDs
const multipleSongs = await contentClient.fetchByIds([123, 456, 789], 'song', 'drumeo')

// Fetch content by brand and type
const drumeoSongs = await contentClient.fetchByBrandAndType('drumeo', 'song', {
  limit: 20,
  sortBy: 'published_on desc'
})

// Use base SanityClient for raw GROQ queries (for complex queries)
const songs = await sanityClient.fetchList(`
  *[_type == "song" && brand == "drumeo"] | order(published_on desc)[0...10]{
    "id": railcontent_id,
    title,
    "artist": artist->name
  }
`)

// Execute complex queries with base client
const result = await sanityClient.executeQuery(`
  {
    "songs": *[_type == "song"][0...5],
    "total": count(*[_type == "song"])
  }
`)
```

### Custom Configuration

```typescript
import { SanityClient, ContentClient, ConfigProvider, SanityConfig } from './infrastructure/sanity'

// Use custom configuration provider
class CustomConfigProvider implements ConfigProvider {
  getConfig(): SanityConfig {
    return {
      projectId: 'custom-project',
      dataset: 'production',
      version: '2021-06-07',
      token: 'custom-token',
      perspective: 'published',
      useCachedAPI: true,
      debug: false
    }
  }
}

const customConfigProvider = new CustomConfigProvider()
const sanityClient = new SanityClient(customConfigProvider)
const contentClient = new ContentClient(customConfigProvider)
```

### Error Handling

```typescript
try {
  const result = await sanityClient.fetchSingle('*[_type == "song"][0]')
} catch (error) {
  if (error.query) {
    console.error('Query failed:', error.query)
    console.error('Error:', error.message)
  }
}
```

## Configuration

The SanityClient uses the global configuration from the config service by default. Ensure your application is initialized with proper Sanity configuration:

```javascript
import { initializeService } from './services/config'

initializeService({
  sanityConfig: {
    token: 'your-sanity-api-token',
    projectId: 'your-sanity-project-id',
    dataset: 'your-dataset-name',
    version: '2021-06-07',
    perspective: 'published',
    useCachedAPI: false,
    debug: false
  },
  // ... other config
})
```

## API Reference

### SanityClient (Base Client)

#### Methods

- `fetchSingle<T>(query: string, params?: Record<string, any>): Promise<T | null>`
  - Executes a query and returns the first result
  
- `fetchList<T>(query: string, params?: Record<string, any>): Promise<T[]>`
  - Executes a query and returns all results as an array
  
- `executeQuery<T>(query: string, params?: Record<string, any>): Promise<T | null>`
  - Executes a raw query and returns the full response
  
- `refreshConfig(): void`
  - Refreshes the configuration (useful if global config changes)

### ContentClient (Specialized Client)

#### Methods

- `fetchById<T>(options: FetchByIdOptions): Promise<T | null>`
  - Fetches a single document by type and ID (recommended for simple lookups)
  - Options: `{ type: string, id: number | string, fields?: string[], includeChildren?: boolean }`

- `fetchByIds<T>(ids: (number | string)[], type?: string, brand?: string, fields?: string[]): Promise<T[]>`
  - Fetches multiple content items by their IDs
  - Results are sorted to match the order of input IDs

- `fetchByBrandAndType<T>(brand: string, type: string, options?: {...}): Promise<T[]>`
  - Fetches content by brand and type with basic filtering
  - Options: `{ limit?: number, offset?: number, sortBy?: string, fields?: string[] }`

- All methods from SanityClient (inherited)

### Interfaces

- `SanityConfig`: Configuration structure for Sanity connection
- `SanityQuery`: Structure for GROQ queries
- `SanityResponse<T>`: Structure for Sanity API responses
- `SanityError`: Structure for Sanity-specific errors
- `QueryExecutor`: Interface for query execution implementations
- `ConfigProvider`: Interface for configuration providers

## Examples

See the `examples/usage.ts` file for comprehensive usage examples.

## Migration from Legacy Code

To migrate from the existing `fetchByRailContentId` function:

```typescript
// Old way
import { fetchByRailContentId } from './services/sanity'
const result = await fetchByRailContentId(123, 'song')

// New way (recommended)
import { ContentClient } from './infrastructure/sanity'
const contentClient = new ContentClient()
const result = await contentClient.fetchById({ type: 'song', id: 123 })
```

To migrate from the existing `fetchByRailContentIds` function:

```typescript
// Old way
import { fetchByRailContentIds } from './services/sanity'
const results = await fetchByRailContentIds([123, 456, 789], 'song', 'drumeo')

// New way
import { ContentClient } from './infrastructure/sanity'
const contentClient = new ContentClient()
const results = await contentClient.fetchByIds([123, 456, 789], 'song', 'drumeo')
```

To migrate from the existing `fetchSanity` function:

```typescript
// Old way
import { fetchSanity } from './services/sanity'
const result = await fetchSanity(query, isList)

// New way
import { SanityClient } from './infrastructure/sanity'
const sanityClient = new SanityClient()
const result = isList 
  ? await sanityClient.fetchList(query)
  : await sanityClient.fetchSingle(query)
```

The new architecture provides better type safety, error handling, separation of concerns, and follows modern architectural patterns. 