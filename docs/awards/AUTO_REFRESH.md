# Award Definitions Auto-Refresh

## Overview

The award definitions service automatically manages fetching and caching award data from Sanity CMS with a 24-hour cache duration.

## Features

- **Automatic Initial Load**: Fetches award definitions on first app boot if not already loaded
- **24-Hour Cache**: Refreshes data every 24 hours automatically
- **Persistent Timestamps**: Stores last fetch timestamp in localStorage to persist across app restarts
- **Smart Refresh Logic**: Only fetches when needed (no data or cache expired)
- **Concurrent Fetch Protection**: Prevents duplicate fetches if multiple calls happen simultaneously

## Setup

### Automatic Initialization

Award definitions are **automatically initialized** when you call `initializeService()`. No additional setup required!

```javascript
import { initializeService } from 'musora-content-services'

async function initializeApp() {
  // Award definitions are automatically initialized here
  await initializeService({
    sanityConfig: {
      token: 'your-sanity-api-token',
      projectId: 'your-sanity-project-id',
      dataset: 'production',
      version: '2021-06-07'
    },
    railcontentConfig: {
      token: 'your-api-token',
      userId: 'user-id',
      baseUrl: 'https://api.musora.com',
      authToken: 'your-auth-token'
    },
    localStorage: localStorage, // Required for auto-refresh to work
    isMA: false
  })
}

// Call this when your app boots
initializeApp()
```

### React Native Example

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { initializeService } from 'musora-content-services'

async function initializeApp() {
  // Award definitions auto-initialize with 24-hour cache
  await initializeService({
    sanityConfig: { /* ... */ },
    railcontentConfig: { /* ... */ },
    localStorage: AsyncStorage, // Required for persistence
    isMA: true
  })
}

// In your App.tsx or root component
useEffect(() => {
  initializeApp()
}, [])
```

**Important**: Make sure to provide `localStorage` (web) or `AsyncStorage` (React Native) in your config for the 24-hour cache to persist across app restarts.

## How It Works

### First App Boot
1. `initializeService()` is called with localStorage configured
2. Award definitions automatically initialize
3. Checks localStorage for `musora_award_definitions_last_fetch` timestamp
4. If no timestamp exists or cache is expired (>24 hours), fetches fresh data from Sanity
5. Stores the new fetch timestamp in localStorage
6. Award definitions are now available for use

### Subsequent App Boots
1. `initializeService()` is called with localStorage configured
2. Award definitions automatically initialize
3. Loads timestamp from localStorage
4. If less than 24 hours have passed, uses cached data (no fetch)
5. If more than 24 hours have passed, fetches fresh data from Sanity
6. Updates timestamp in localStorage

### During App Usage
- All award query methods (`getById`, `getByContentId`, `getAll`, etc.) automatically check cache freshness
- If cache expires during app usage, the next query will trigger a refresh
- No manual refresh calls needed

## Cache Management

### Check Cache Status

```javascript
import { awardDefinitions } from 'musora-content-services'

const stats = awardDefinitions.getCacheStats()
console.log(stats)
// {
//   totalDefinitions: 42,
//   totalContentMappings: 38,
//   lastFetch: "2025-11-18T10:30:00.000Z",
//   cacheAge: 3600000, // milliseconds since last fetch
//   isFetching: false,
//   initialized: true,
//   cacheDuration: 86400000 // 24 hours in ms
// }
```

### Force Refresh

To manually force a refresh (bypassing the 24-hour cache):

```javascript
import { awardDefinitions } from 'musora-content-services'

// Force immediate refresh
await awardDefinitions.refresh()

// Or use forceRefresh flag on getAll
const awards = await awardDefinitions.getAll(true)
```

### Clear Cache

To completely clear the cache (useful for testing or logout):

```javascript
import { awardDefinitions } from 'musora-content-services'

awardDefinitions.clear()
```

## Configuration

The cache duration is set to 24 hours by default. This is configured in the `AwardDefinitionsService` class:

```javascript
this.cacheDuration = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
```

## Storage

The service stores the last fetch timestamp in localStorage/AsyncStorage using the key:

```
musora_award_definitions_last_fetch
```

This allows the cache to persist across app restarts.

## Best Practices

1. **Call Once on Boot**: Only call `initializeService()` once when your app starts (this automatically initializes award definitions)
2. **Don't Block UI**: The function is async - consider showing a loading state or calling it before rendering main UI
3. **Provide localStorage**: Always provide localStorage/AsyncStorage for cache persistence to work
4. **Handle Errors**: The service logs errors but doesn't throw - check cache stats if debugging
5. **Test Mode**: Use `clear()` to reset cache during development/testing

## Example Implementation

```javascript
// app.js or App.tsx
import { initializeService } from 'musora-content-services'

class App extends Component {
  state = { isReady: false }

  async componentDidMount() {
    try {
      // Initialize services (award definitions auto-initialize)
      await initializeService({
        sanityConfig: this.props.sanityConfig,
        railcontentConfig: this.props.railcontentConfig,
        localStorage: localStorage,
        isMA: false
      })

      this.setState({ isReady: true })
    } catch (error) {
      console.error('Failed to initialize app:', error)
      // Handle error appropriately
    }
  }

  render() {
    if (!this.state.isReady) {
      return <LoadingScreen />
    }

    return <MainApp />
  }
}
```

## Troubleshooting

### Awards Not Loading
- Ensure `initializeService()` is called with `localStorage` configured
- Verify `localStorage` is properly available (not null/undefined)
- Check Sanity credentials are correct
- Check console for error messages from the award initialization

### Cache Not Persisting
- Verify localStorage/AsyncStorage is available and working
- Check browser/app storage permissions
- Ensure the storage key isn't being cleared by other code

### Always Fetching on Boot
- Check if localStorage is being cleared on app close
- Verify timestamp is being saved correctly (check storage inspector)
- Ensure system time is accurate (affects timestamp comparison)
