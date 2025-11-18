# Awards System - Piggyback Approach (Concise Plan)

**Date:** 2025-01-17
**Approach:** Piggyback full award data on ContentProgress push response

---

## Overview

When user completes content that triggers an award, backend includes **complete award data** in the ContentProgress push response. Frontend intercepts this and shows popup instantly.

**Flow:**
```
User marks complete → ContentProgress sync → Backend detects award →
Response includes award_granted → Frontend shows popup
```

---

## Backend Changes

### 1. Update ContentProgress Push Handler

**Location:** `app/Modules/Content/Http/V1/Controllers/ContentProgressSyncController.php`

**Changes:**
- After saving progress, check if `state === 'completed'` and content is a course
- Call `GamificationManager::contentCompleted()` to create `UserAwardProgress` record
- Query newly completed awards from database
- Add `award_granted` field to success response

**Award Detection Logic:**
- Check if content has associated awards (from Sanity cache)
- If yes, trigger `GamificationManager::contentCompleted(contentId, userId)`
- Query `UserAwardProgress` where `completed_at` is within last 5 seconds
- Return full award data including progress percentage

### 2. Add Helper Method to GamificationService

**Location:** `app/Modules/Gamification/Services/GamificationService.php`

**New Method:** `getNewlyCompletedAwards(userId, awardIds)`
- Query `UserAwardProgress` for given user and award IDs
- Filter by `completed_at >= now()->subSeconds(5)`
- Filter by `progress_percentage === 100`
- Return collection with full award definitions from Sanity

---

## Response Format

### With Award Granted

```json
{
  "results": [{
    "type": "success",
    "entry": { /* normal ContentProgress data */ },
    "award_granted": {
      "award_id": "sanity-award-id-123",
      "name": "Complete Blues Course",
      "badge": "https://cdn.musora.com/badges/blues.png",
      "award": "https://cdn.musora.com/certificates/blues.png",
      "logo": "https://cdn.musora.com/logos/drumeo.png",
      "instructor_name": "Jared Falk",
      "instructor_signature": "https://cdn.musora.com/signatures/jared.png",
      "brand": "drumeo",
      "progress_percentage": 100,
      "completed_at": 1737110400,
      "completion_data": {
        "message": "Great job on finishing this course! You've worked hard...",
        "message_certificate": "You practiced for 120 minutes over 14 days",
        "content_title": "Blues Drumming Course",
        "completed_at": "2025-01-17T10:30:00Z",
        "days_user_practiced": 14,
        "practice_minutes": 120
      },
      "progress_data": { /* any custom progress tracking */ }
    }
  }]
}
```

### Without Award (Normal Case)

```json
{
  "results": [{
    "type": "success",
    "entry": { /* normal ContentProgress data */ },
    "award_granted": null
  }]
}
```

---

## Frontend Changes

### 1. Create Award Interceptor

**New File:** `src/services/sync/award-interceptor.ts`

**Purpose:**
- Process push responses from ContentProgress sync
- Check for `award_granted` in each result
- Emit events when awards found

**TypeScript Interface:**
```typescript
interface AwardGrantedData {
  award_id: string
  name: string
  badge: string
  award: string
  logo: string
  brand: string
  instructor_name?: string
  instructor_signature?: string
  progress_percentage: number
  completed_at: number
  completion_data: {
    message: string
    message_certificate: string
    content_title: string
    completed_at: string
    days_user_practiced: number
    practice_minutes: number
  }
  progress_data?: any
}
```

**Methods:**
- `processPushResponse(response)` - Check results for awards
- `onAwardGranted(callback)` - Subscribe to awards
- `emitAward(awardData)` - Emit to listeners + DOM event

### 2. Hook Interceptor into Sync

**Location:** `src/services/sync/fetch.ts` or push handler

**Integration Point:** After push request completes, before returning response
- Call `awardInterceptor.processPushResponse(response)`
- Interceptor checks all results for `award_granted` field
- Emits events for any found

### 3. Listen for Awards in App

**Two Options:**

**Option A - React/Vue:**
- Use interceptor's `onAwardGranted(callback)` method
- Callback receives full `AwardGrantedData` object
- Update state, show popup

**Option B - Vanilla JS:**
- Listen to DOM event: `window.addEventListener('awardGranted', ...)`
- Event detail contains full award data
- Show popup

---

## Award History API (Separate)

Since awards aren't in WatermelonDB, use existing endpoint for history:

**Endpoint:** `GET /gamification/v1/users/{user}/awards?page=1&limit=50`

**New Service File:** `src/services/awards/awards-api.ts`
- `getUserAwards(userId, page, limit)` - Fetch paginated awards
- `getCompletedAwardsCount(userId)` - Get total count
- Returns transformed data matching `AwardGrantedData` interface

---

## Testing

### Backend Tests

**File:** `app/Modules/Content/tests/Feature/ContentProgressSyncTest.php`

**Test Cases:**
- Push with course completion returns award_granted
- Push without award returns null
- Award data includes all required fields
- Award only granted once (no duplicates)
- Award check doesn't break sync if it fails

### Frontend Tests

**File:** `src/services/sync/award-interceptor.test.ts`

**Test Cases:**
- Interceptor emits when award_granted present
- No emission when award_granted is null
- DOM event emitted with correct data
- Multiple listeners receive event
- Unsubscribe works correctly

---

## Implementation Checklist

### Backend (2-3 hours)
- [ ] Add award detection to ContentProgress push handler
- [ ] Add `getNewlyCompletedAwards()` helper to GamificationService
- [ ] Handle errors gracefully (don't break sync)
- [ ] Write backend tests

### Frontend (4-6 hours)
- [ ] Create `award-interceptor.ts`
- [ ] Define `AwardGrantedData` TypeScript interface
- [ ] Hook interceptor into push handler
- [ ] Create award popup listener component
- [ ] Write frontend tests

### Integration (1-2 hours)
- [ ] Test full flow end-to-end
- [ ] Verify popup shows with correct data
- [ ] Test error cases

---

## Timeline

**Total: 8-12 hours** (vs 24-35 for full WatermelonDB approach)

---

## Trade-offs

| Aspect | Piggyback Approach | Full WatermelonDB Sync |
|--------|-------------------|------------------------|
| **Implementation Time** | 8-12 hours | 24-35 hours |
| **Complexity** | Low | High |
| **Offline Award History** | ❌ No | ✅ Yes |
| **Instant Popup** | ✅ Yes | ✅ Yes |
| **Local Queries** | ❌ No | ✅ Yes |
| **Risk to Existing Code** | Low | Medium |

---

## Key Points

✅ **Full award data returned** - All fields including progress_percentage, completion_data, instructor info
✅ **Instant popup** - Shows immediately after completion sync
✅ **Simple implementation** - Minimal code changes
✅ **Non-breaking** - Uses existing ContentProgress sync
✅ **Graceful degradation** - Award check failures don't break progress sync

⚠️ **No offline history** - Must call API to fetch past awards
⚠️ **No local queries** - Can't query awards in WatermelonDB

---

## Next Steps

1. Review and approve approach
2. Backend: Add award detection to push handler
3. Frontend: Create interceptor and hook into sync
4. Test end-to-end flow
5. Deploy to staging

---

**End of Plan**
