# Reporting Service

Service for submitting user reports about content, comments, forum posts, and playlists.

## Overview

This service provides two main functions for reporting content:

1. **`report()`** - Unified method to submit reports for any type of content (content, comments, forum posts, playlists)
2. **`getReportIssueOptions()`** - Helper function to get valid issue options for each reportable type, with support for platform-specific options (web vs mobile app)

Reports are sent to the appropriate team (support or mentors) based on the content type. Both functions are designed to be used by the web platform (MPF) and mobile app (MA) to ensure consistent reporting options and behavior.

## Features

- ✅ Unified `report()` method for all reportable types
- ✅ Type-safe issue selection with TypeScript generics
- ✅ Platform-specific options (web vs mobile app)
- ✅ Helper function to get valid issue options by type
- ✅ Rate limiting (10 requests per minute per user)
- ✅ Emails sent to appropriate teams (support or mentors)
- ✅ Full TypeScript support with mapped types

## Installation

The reporting service is included in `musora-content-services`. Simply import the functions you need:

```typescript
import { report, getReportIssueOptions } from 'musora-content-services'
```

Both functions are exported from `services/reporting/reporting.ts`.

## API Reference

### `report<T>(params)`

Unified method to submit a report for any type. Uses TypeScript generics for type-safe issue selection.

**Type Parameter:**
- `T extends ReportableType` - The type of content being reported

**Parameters:**
```typescript
type ReportParams<T extends ReportableType> = {
  type: T                    // 'content' | 'comment' | 'forum_post' | 'playlist'
  id: number                 // ID of the entity being reported
  issue: IssueTypeMap[T]     // Type-safe issue (varies by type)
  details?: string           // Required when issue is 'other', not sent otherwise
  brand: string              // Required: 'drumeo', 'pianote', 'guitareo', 'singeo', 'playbass'
}
```

**Returns:** `Promise<ReportResponse>`
```typescript
interface ReportResponse {
  report_id: number         // The ID of the submitted report
  message: string          // Success message
}
```

**Example - Report Content:**
```typescript
import { report } from 'musora-content-services'

const response = await report({
  type: 'content',
  id: 12345,
  issue: 'video_issue',
  brand: 'drumeo'
})

console.log(`Report submitted with ID: ${response.report_id}`)
console.log(response.message) // "Report submitted successfully"
```

**Example - Report Comment:**
```typescript
await report({
  type: 'comment',
  id: 67890,
  issue: 'offensive_language',
  brand: 'pianote'
})
```

**Example - Report Forum Post:**
```typescript
await report({
  type: 'forum_post',
  id: 45678,
  issue: 'abusive',
  brand: 'guitareo'
})
```

**Example - Report Playlist:**
```typescript
await report({
  type: 'playlist',
  id: 99999,
  issue: 'incorrect_metadata',
  brand: 'singeo'
})
```

**Example - Report with 'other' issue (details required):**
```typescript
await report({
  type: 'content',
  id: 12345,
  issue: 'other',
  details: 'The instructor audio is out of sync with the video',
  brand: 'drumeo'
})
```

---

### `getReportIssueOptions(type, isMobileApp?)`

Helper function to get valid issue options for a specific reportable type. Returns both the value and user-friendly label for each option.

**Parameters:**
```typescript
type: ReportableType       // 'content' | 'comment' | 'forum_post' | 'playlist'
isMobileApp?: boolean     // Default: false. Set to true for mobile app options
```

**Returns:** `ReportIssueOption[]`
```typescript
interface ReportIssueOption {
  value: string    // Issue value to send to API
  label: string    // User-friendly label for display
}
```

**Example - Web Platform:**
```typescript
import { getReportIssueOptions } from 'musora-content-services'

// Get content issue options for web
const contentOptions = getReportIssueOptions('content')
// Returns:
// [
//   { value: 'incorrect_metadata', label: 'The lesson image, title or description is incorrect' },
//   { value: 'video_issue', label: 'Video issue' },
//   { value: 'assignment_issue', label: 'An issue with lesson assignment' },
//   { value: 'other', label: 'Other' }
// ]
```

**Example - Mobile App:**
```typescript
// Get content issue options for mobile app (includes download option)
const contentOptions = getReportIssueOptions('content', true)
// Returns:
// [
//   { value: 'incorrect_metadata', label: 'The lesson image, title or description is incorrect' },
//   { value: 'video_issue', label: 'Video issue' },
//   { value: 'download_unavailable', label: 'Download is not available' },
//   { value: 'assignment_issue', label: 'An issue with lesson assignment' },
//   { value: 'other', label: 'Other' }
// ]
```

**Example - Comment Issues:**
```typescript
const commentOptions = getReportIssueOptions('comment')
// Returns:
// [
//   { value: 'offensive_language', label: 'It contains offensive language or content' },
//   { value: 'abusive', label: "It's abusive or harmful" },
//   { value: 'personal_information', label: 'It contains personal information' },
//   { value: 'misleading', label: "It's misleading or a false claim" },
//   { value: 'other', label: 'Other reasons' }
// ]
```

---

## Report Issues by Type

### Content & Playlists:
- `incorrect_metadata` - The lesson image, title or description is incorrect
- `video_issue` - Video issue
- `download_unavailable` - Download is not available (mobile app only)
- `assignment_issue` - An issue with lesson assignment
- `other` - Other

### Comments & Forum Posts:
- `offensive_language` - It contains offensive language or content
- `abusive` - It's abusive or harmful
- `personal_information` - It contains personal information
- `misleading` - It's misleading or a false claim
- `other` - Other reasons

**Important:** The `details` field is **required** when `issue` is `'other'` and should **not be sent** for other issue types.

---

## Rate Limiting

API requests are rate-limited to **10 requests per minute per user**. If you exceed this limit, you'll receive a `429 Too Many Requests` error.

---

## Email Recipients

Reports are automatically routed to the appropriate team:

| Report Type | Email Recipient |
|-------------|----------------|
| Forum Posts | mentors@musora.com |
| Comments | mentors@musora.com |
| Content | support@musora.com |
| Playlists | support@musora.com |

---

## Platform-Specific Options

The `getReportIssueOptions()` function supports platform-specific options via the `isMobileApp` parameter:

**Web Platform (default):**
- Does NOT include "Download is not available" option
- Use: `getReportIssueOptions('content')`

**Mobile App:**
- INCLUDES "Download is not available" option for content and playlists
- Use: `getReportIssueOptions('content', true)`


---

## Error Handling

```typescript
import { report } from 'musora-content-services'

try {
  const response = await report({
    type: 'content',
    id: 123,
    issue: 'video_issue',
    brand: 'drumeo'
  })

  // Handle success
  showToast('Report submitted successfully')
} catch (error) {
  if (error.status === 429) {
    // Rate limit exceeded
    showToast('Too many reports. Please try again later.')
  } else if (error.status === 422) {
    // Validation error
    showToast(error.message || 'Invalid report data')
  } else if (error.status === 401) {
    // Not authenticated
    showToast('Please log in to submit a report')
  } else {
    // Other errors
    showToast('Failed to submit report')
  }
}
```

---

## Type Safety

The reporting service uses TypeScript generics to ensure type-safe issue selection:

```typescript
// ✅ Type-safe: 'video_issue' is valid for content
await report({
  type: 'content',
  id: 123,
  issue: 'video_issue',  // TypeScript knows this is valid
  brand: 'drumeo'
})

// ❌ Type error: 'offensive_language' is not valid for content
await report({
  type: 'content',
  id: 123,
  issue: 'offensive_language',  // TypeScript error!
  brand: 'drumeo'
})

// ✅ Type-safe: 'offensive_language' is valid for comments
await report({
  type: 'comment',
  id: 456,
  issue: 'offensive_language',  // TypeScript knows this is valid
  brand: 'drumeo'
})
```

The `IssueTypeMap` maps each reportable type to its valid issues:
```typescript
type IssueTypeMap = {
  forum_post: ForumIssueType
  comment: CommentIssueType
  content: ContentIssueType
  playlist: PlaylistIssueType
}
```
