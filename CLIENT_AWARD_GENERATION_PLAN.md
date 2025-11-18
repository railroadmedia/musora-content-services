# Client-Side Award Message & Certificate Generation - Implementation Plan

**Date:** 2025-01-17
**Status:** Ready for Implementation
**Prerequisites:** Backend changes complete, WatermelonDB sync system operational

---

## Overview

Move all award certificate and completion message generation to the client-side, using:
- Sanity award definitions (cached locally)
- WatermelonDB user progress data
- Client-side message templates

**Benefits:**
- Reduces backend API payload from ~500KB to ~200 bytes
- Enables offline certificate viewing
- Faster award popup display
- Consistent messaging across platforms

---

## Prerequisites Check

### Required WatermelonDB Models

Verify these models exist and have required fields:

- ✅ `UserAwardProgress` - From AWARDS_SYNC_PLAN.md
- ✅ `ContentProgress` - Existing
- ⚠️ `ContentPractice` - **VERIFY** has `duration_seconds` field

### Backend Endpoints Required

- ✅ `/gamification/v1/users/certificate/{id}` - Returns minimal user/award reference
- ✅ `/api/content/v1/user/awards` - Award sync endpoints (from AWARDS_SYNC_PLAN.md)
- ⚠️ Content practices sync endpoint - **VERIFY** includes `duration_seconds`

---

## Phase 1: Foundation - Constants & Types

### Task 1.1: Create Award Assets Constants

**File:** `src/constants/award-assets.ts`

```typescript
/**
 * Static award certificate assets
 * Migrated from BaseAward::getImageValues()
 */
export const AWARD_ASSETS = {
  ribbon: "https://d3fzm1tzeyr5n3.cloudfront.net/challenges/gold_ribbon.png",
  musoraLogo: "https://d3fzm1tzeyr5n3.cloudfront.net/challenges/on_musora.png",
  musoraBgLogo: "https://d3fzm1tzeyr5n3.cloudfront.net/challenges/certificate_logo.png",

  brandLogos: {
    drumeo: "https://dpwjbsxqtam5n.cloudfront.net/logos/logo-blue.png",
    singeo: "https://d21xeg6s76swyd.cloudfront.net/sales/2021/singeo-logo.png",
    guitareo: "https://d122ay5chh2hr5.cloudfront.net/sales/guitareo-logo-green.png",
    pianote: "https://d21q7xesnoiieh.cloudfront.net/fit-in/marketing/pianote/membership/homepage/2023/pianote-logo-red.png",
    musora: "https://d3fzm1tzeyr5n3.cloudfront.net/challenges/on_musora.png"
  } as const
} as const

export type Brand = keyof typeof AWARD_ASSETS.brandLogos
```

**Time:** 15 minutes

---

### Task 1.2: Update CompletionData Type

**File:** `src/services/sync/models/UserAwardProgress.ts`

Update the existing `CompletionData` interface:

```typescript
export interface CompletionData {
  content_title: string          // "Blues Foundations Course"
  completed_at: string            // ISO timestamp
  days_user_practiced: number     // Days from first lesson to completion
  practice_minutes: number        // Total practice time in minutes
}
```

**Time:** 10 minutes

---

### Task 1.3: Update Award Event Payload

**File:** `src/services/awards/award-events.ts`

Add `popupMessage` to event payload:

```typescript
export interface AwardGrantedPayload {
  awardId: string
  definition: AwardDefinition
  completionData: CompletionData
  popupMessage: string           // ⬅️ ADD THIS
  timestamp: number
}
```

**Time:** 10 minutes

---

## Phase 2: Content Practice Model & Repository

### Task 2.1: Check ContentPractice Model Exists

**Action:** Verify if `src/services/sync/models/ContentPractice.ts` exists

**If it doesn't exist, create it:**

```typescript
import { Model } from '@nozbe/watermelondb'
import { field, readonly, date } from '@nozbe/watermelondb/decorators'

export default class ContentPractice extends Model {
  static table = 'content_practices'

  @field('content_id') content_id!: number
  @field('duration_seconds') duration_seconds!: number
  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date

  /**
   * Helper to get duration in minutes
   */
  get durationMinutes(): number {
    return Math.round(this.duration_seconds / 60)
  }
}
```

**If it exists, verify:**
- Has `duration_seconds` field
- Has `content_id` field

**Time:** 30 minutes (if creating new) or 10 minutes (if verifying)

---

### Task 2.2: Check ContentPractice Schema

**File:** `src/services/sync/schema/index.ts`

Verify table schema includes `duration_seconds`:

```typescript
const contentPracticesTable = tableSchema({
  name: 'content_practices',
  columns: [
    { name: 'content_id', type: 'number', isIndexed: true },
    { name: 'duration_seconds', type: 'number' },    // ⬅️ VERIFY THIS EXISTS
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number', isIndexed: true }
  ]
})
```

**If missing:** Add column and create migration:

```typescript
// In migrations
{
  toVersion: X,
  steps: [
    {
      type: 'add_column',
      table: 'content_practices',
      column: { name: 'duration_seconds', type: 'number' }
    }
  ]
}
```

**Time:** 20 minutes

---

### Task 2.3: Create ContentPracticeRepository

**File:** `src/services/sync/repositories/content-practice.ts`

```typescript
import { Q } from '@nozbe/watermelondb'
import ContentPractice from '../models/ContentPractice'
import SyncRepository from './base'

export default class ContentPracticeRepository extends SyncRepository<ContentPractice> {

  /**
   * Get total practice minutes for given content IDs
   * Used for award completion data calculation
   */
  async sumPracticeMinutesForContent(contentIds: number[]): Promise<number> {
    if (contentIds.length === 0) return 0

    const practices = await this.queryAll(
      Q.where('content_id', Q.oneOf(contentIds))
    )

    const totalSeconds = practices.data.reduce(
      (sum, practice) => sum + practice.duration_seconds,
      0
    )

    return Math.round(totalSeconds / 60)
  }

  /**
   * Get practice sessions for specific content
   */
  async getForContent(contentId: number): Promise<ContentPractice[]> {
    const result = await this.queryAll(
      Q.where('content_id', contentId),
      Q.sortBy('created_at', Q.desc)
    )

    return result.data
  }

  /**
   * Get total practice time across all content
   */
  async getTotalPracticeMinutes(): Promise<number> {
    const practices = await this.queryAll()

    const totalSeconds = practices.data.reduce(
      (sum, practice) => sum + practice.duration_seconds,
      0
    )

    return Math.round(totalSeconds / 60)
  }
}
```

**Time:** 45 minutes

---

### Task 2.4: Register ContentPractice in Repository Proxy

**File:** `src/services/sync/repository-proxy.ts`

Add to proxy:

```typescript
import ContentPracticeRepository from './repositories/content-practice'
import ContentPractice from './models/ContentPractice'

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
        case 'userAwardProgress':
          target[prop] = new UserAwardProgressRepository(manager.getStore(UserAwardProgress))
          break
        case 'contentPractices':  // ⬅️ ADD THIS
          target[prop] = new ContentPracticeRepository(manager.getStore(ContentPractice))
          break
      }
    }
    return target[prop]
  }
})
```

**Time:** 15 minutes

---

### Task 2.5: Verify ContentPractice Sync Configuration

**File:** `src/services/sync/store-configs.ts`

Verify ContentPractice is in sync configs (if not, add it):

```typescript
export const storeConfigs = [
  // ... existing configs
  {
    model: ContentPractice,
    pull: handlePull(makeFetchRequest('/api/content/v1/user/practices')),
    push: handlePush(makeFetchRequest('/api/content/v1/user/practices', {
      method: 'POST'
    })),
    comparator: updatedAtComparator
  }
]
```

**Time:** 20 minutes

---

## Phase 3: Message Generation Logic

### Task 3.1: Create Message Generator Service

**File:** `src/services/awards/message-generator.ts`

```typescript
import type { CompletionData } from '../sync/models/UserAwardProgress'

/**
 * Client-side message generation for award popups and certificates
 * Migrated from backend GuidedCourseAward and LearningPathAward classes
 */
export class AwardMessageGenerator {

  /**
   * Generate popup message shown when award is granted
   *
   * Migrated from:
   * - GuidedCourseAward::getCompletionMessage()
   * - LearningPathAward::getCompletionMessage()
   */
  static generatePopupMessage(
    awardType: 'guided-course' | 'learning-path',
    completionData: CompletionData
  ): string {
    const { days_user_practiced, practice_minutes } = completionData

    if (awardType === 'guided-course') {
      const typeName = 'guided course'
      return `Great job on finishing this ${typeName}! You've worked hard. In the last ${days_user_practiced} days, you've put in ${practice_minutes} minutes of practice. Nice!`
    }

    // Learning path
    return `Congratulations on completing this learning path! You've worked hard. Over the last ${days_user_practiced} days, you've put in ${practice_minutes} minutes of practice. Amazing work!`
  }

  /**
   * Generate certificate message shown on certificate
   *
   * Migrated from:
   * - GuidedCourseAward::getCertificateMessage()
   * - LearningPathAward::getCertificateMessage()
   */
  static generateCertificateMessage(
    completionData: CompletionData,
    awardCustomText?: string
  ): string {
    const { content_title, practice_minutes } = completionData
    const customText = awardCustomText ? ` ${awardCustomText}` : ''

    return `You practiced for a total of ${practice_minutes} minutes during ${content_title}, earning your official certificate of completion.${customText} Well Done!`
  }
}
```

**Time:** 30 minutes

---

## Phase 4: Certificate Data Builder

### Task 4.1: Create Certificate Data Types

**File:** `src/services/awards/types.ts` (add to existing file)

```typescript
/**
 * Complete certificate data for display
 */
export interface CertificateData {
  // User data
  userId: number
  userName: string
  completedAt: string

  // Award data
  awardId: string
  awardType: string
  awardTitle: string

  // Messages (client-generated)
  popupMessage: string
  certificateMessage: string

  // Images
  ribbonImage: string
  awardImage: string          // Full certificate image
  badgeImage: string          // Badge/medallion image
  brandLogo: string           // Brand-specific logo
  musoraLogo: string          // Musora logo
  musoraBgLogo: string        // Background watermark
  instructorSignature?: string
  instructorName?: string
}
```

**Time:** 15 minutes

---

### Task 4.2: Create Certificate Builder Service

**File:** `src/services/awards/certificate-builder.ts`

```typescript
import { awardDefinitions } from './award-definitions'
import type { AwardDefinition } from './types'
import { AWARD_ASSETS, type Brand } from '../../constants/award-assets'
import { AwardMessageGenerator } from './message-generator'
import type { CompletionData } from '../sync/models/UserAwardProgress'
import db from '../sync/repository-proxy'
import type { CertificateData } from './types'

/**
 * Build complete certificate data from backend + Sanity + WatermelonDB
 */
export async function buildCertificateData(
  userAwardProgressId: number
): Promise<CertificateData> {
  // 1. Fetch minimal user/award reference from backend
  const response = await fetch(
    `/gamification/v1/users/certificate/${userAwardProgressId}`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch certificate data: ${response.status}`)
  }

  const userData = await response.json()
  // Expected shape: { id, user_id, user_name, award_id, completed_at }

  // 2. Get award definition from Sanity cache
  const awardDef = await awardDefinitions.getById(userData.award_id)

  if (!awardDef) {
    throw new Error(`Award definition not found: ${userData.award_id}`)
  }

  // 3. Get completion data from WatermelonDB
  const userProgress = await db.userAwardProgress.getByAwardId(userData.award_id)

  if (!userProgress.data || !userProgress.data.completion_data) {
    throw new Error('Completion data not found in local database')
  }

  const completionData: CompletionData = userProgress.data.completion_data

  // 4. Determine award type
  const awardType = determineAwardType(awardDef)

  // 5. Generate messages client-side
  const popupMessage = AwardMessageGenerator.generatePopupMessage(
    awardType,
    completionData
  )

  const certificateMessage = AwardMessageGenerator.generateCertificateMessage(
    completionData,
    awardDef.award_custom_text
  )

  // 6. Assemble complete certificate data
  return {
    // User data (from backend)
    userId: userData.user_id,
    userName: userData.user_name,
    completedAt: userData.completed_at,

    // Award data (from Sanity)
    awardId: awardDef._id,
    awardType: awardDef.type || 'content-award',
    awardTitle: awardDef.name,

    // Messages (client-generated)
    popupMessage,
    certificateMessage,

    // Images (Sanity + constants)
    ribbonImage: AWARD_ASSETS.ribbon,
    awardImage: awardDef.award,
    badgeImage: awardDef.badge,
    brandLogo: getBrandLogo(awardDef.brand),
    musoraLogo: AWARD_ASSETS.musoraLogo,
    musoraBgLogo: AWARD_ASSETS.musoraBgLogo,
    instructorSignature: awardDef.instructor_signature,
    instructorName: awardDef.instructor_name
  }
}

/**
 * Get brand logo from constants
 */
function getBrandLogo(brand: string): string {
  const normalizedBrand = brand.toLowerCase() as Brand

  return AWARD_ASSETS.brandLogos[normalizedBrand] || AWARD_ASSETS.musoraLogo
}

/**
 * Determine award type from definition
 *
 * Options:
 * 1. Read from Sanity field (if you add award_type to schema)
 * 2. Infer from content type
 * 3. Default based on name patterns
 */
function determineAwardType(
  awardDef: AwardDefinition
): 'guided-course' | 'learning-path' {
  // Option 1: If Sanity has award_type field
  // if (awardDef.award_type) {
  //   return awardDef.award_type as 'guided-course' | 'learning-path'
  // }

  // Option 2: Infer from name
  if (awardDef.name.toLowerCase().includes('learning path')) {
    return 'learning-path'
  }

  // Option 3: Default to guided-course (safest)
  return 'guided-course'
}
```

**Time:** 1 hour

---

## Phase 5: Completion Data Generation

### Task 5.1: Create Completion Data Generator

**File:** `src/services/awards/completion-data-generator.ts`

```typescript
import { awardDefinitions } from './award-definitions'
import { getChildIds } from '../content'
import db from '../sync/repository-proxy'
import type { CompletionData } from '../sync/models/UserAwardProgress'
import { Q } from '@nozbe/watermelondb'

/**
 * Generate completion data when user earns an award
 * Calculates practice days and minutes from local WatermelonDB data
 */
export async function generateCompletionData(
  awardId: string,
  courseContentId: number
): Promise<CompletionData> {
  // 1. Get award definition
  const awardDef = await awardDefinitions.getById(awardId)

  if (!awardDef) {
    throw new Error(`Award definition not found: ${awardId}`)
  }

  // 2. Get all child content IDs for this course
  let childIds = await getChildIds(courseContentId)

  // Exclude kickoff lesson if specified
  if (awardDef.has_kickoff && childIds.length > 0) {
    childIds = childIds.slice(1)
  }

  // 3. Calculate days user practiced (from earliest start to now)
  const daysUserPracticed = await calculateDaysUserPracticed(childIds)

  // 4. Calculate total practice minutes
  const practiceMinutes = await calculatePracticeMinutes(childIds)

  // 5. Generate content title
  const contentTitle = generateContentTitle(awardDef.name)

  return {
    content_title: contentTitle,
    completed_at: new Date().toISOString(),
    days_user_practiced: daysUserPracticed,
    practice_minutes: practiceMinutes
  }
}

/**
 * Calculate days between first lesson start and now
 */
async function calculateDaysUserPracticed(contentIds: number[]): Promise<number> {
  if (contentIds.length === 0) return 0

  // Get all progress records for these lessons
  const progressRecords = await db.contentProgress.queryAll(
    Q.where('content_id', Q.oneOf(contentIds)),
    Q.sortBy('started_on', Q.asc)
  )

  if (progressRecords.data.length === 0) return 0

  // Get earliest start date
  const earliestRecord = progressRecords.data[0]
  const earliestStartDate = earliestRecord.started_on

  // Calculate days from then to now
  const now = Date.now()
  const daysDiff = Math.floor((now - earliestStartDate) / (1000 * 60 * 60 * 24))

  // Return at least 1 day
  return Math.max(daysDiff, 1)
}

/**
 * Calculate total practice minutes from WatermelonDB practice sessions
 */
async function calculatePracticeMinutes(contentIds: number[]): Promise<number> {
  if (contentIds.length === 0) return 0

  // Use repository method to sum practice minutes
  const totalMinutes = await db.contentPractices.sumPracticeMinutesForContent(contentIds)

  return totalMinutes
}

/**
 * Generate display title from award name
 * "Complete Blues Foundations Course" → "Blues Foundations"
 */
function generateContentTitle(awardName: string): string {
  return awardName
    .replace(/^Complete\s+/i, '')
    .replace(/\s+(Course|Learning Path)$/i, '')
    .trim()
}
```

**Time:** 1 hour

---

## Phase 6: Integration with Award Manager

### Task 6.1: Update Award Manager's grantAward Method

**File:** `src/services/awards/award-manager.ts`

Update the `grantAward` method to use client-side generation:

```typescript
import { generateCompletionData } from './completion-data-generator'
import { AwardMessageGenerator } from './message-generator'

export class AwardManager {

  /**
   * Grant award to user (UPDATED for client-side generation)
   */
  private async grantAward(awardId: string, courseContentId: number): Promise<void> {
    // Get award definition
    const definition = await awardDefinitions.getById(awardId)

    if (!definition) {
      console.error(`Award definition not found: ${awardId}`)
      return
    }

    // ⬇️ NEW: Generate completion data client-side
    const completionData = await generateCompletionData(
      awardId,
      courseContentId
    )

    // ⬇️ NEW: Determine award type
    const awardType = determineAwardType(definition)

    // ⬇️ NEW: Generate popup message client-side
    const popupMessage = AwardMessageGenerator.generatePopupMessage(
      awardType,
      completionData
    )

    // Save to local DB (instant) and sync to server (background)
    await db.userAwardProgress.completeAward(awardId, completionData)

    // ⬇️ UPDATED: Emit event with generated popup message
    awardEvents.emitAwardGranted({
      awardId,
      definition,
      completionData,
      popupMessage,      // ⬅️ Client-generated message
      timestamp: Date.now()
    })
  }

  // Add helper method
  private determineAwardType(
    definition: AwardDefinition
  ): 'guided-course' | 'learning-path' {
    if (definition.name.toLowerCase().includes('learning path')) {
      return 'learning-path'
    }
    return 'guided-course'
  }
}
```

**Time:** 30 minutes

---

## Phase 7: Export New Functions

### Task 7.1: Update award-query.ts Exports

**File:** `src/services/awards/award-query.ts`

Add to bottom of file:

```typescript
/**
 * Build certificate data for display
 * Combines backend user data + Sanity definitions + local completion data
 */
export { buildCertificateData } from './certificate-builder'
export type { CertificateData } from './types'
```

**Time:** 10 minutes

---

### Task 7.2: Verify Index Generation

Run:
```bash
npm run build-index
```

Verify new functions are exported in `src/index.js` and `src/index.d.ts`

**Time:** 10 minutes

---

## Phase 8: Sanity Schema Updates (Optional)

### Task 8.1: Add Optional Fields to Sanity Award Schema

**File:** In Sanity Studio project (not this repo)

Add these optional fields for future enhancements:

```javascript
{
  name: 'award',
  type: 'document',
  fields: [
    // ... existing fields
    {
      name: 'award_custom_text',
      title: 'Custom Certificate Text',
      type: 'string',
      description: 'Optional custom text appended to certificate message'
    },
    {
      name: 'content_title',
      title: 'Content Display Title',
      type: 'string',
      description: 'Override for content title (if different from award name)'
    },
    {
      name: 'award_type',
      title: 'Award Type',
      type: 'string',
      options: {
        list: [
          { title: 'Guided Course', value: 'guided-course' },
          { title: 'Learning Path', value: 'learning-path' }
        ]
      }
    }
  ]
}
```

**Note:** Coordinate with Sanity/CMS team

**Time:** 30 minutes (coordination) + deployment time

---

## Phase 9: Testing

### Task 9.1: Unit Tests - Message Generator

**File:** `src/services/awards/message-generator.test.ts`

```typescript
import { AwardMessageGenerator } from './message-generator'
import type { CompletionData } from '../sync/models/UserAwardProgress'

describe('AwardMessageGenerator', () => {
  const mockCompletionData: CompletionData = {
    content_title: 'Blues Foundations',
    completed_at: '2023-09-17T14:19:21.000Z',
    days_user_practiced: 14,
    practice_minutes: 180
  }

  describe('generatePopupMessage', () => {
    it('generates correct message for guided course', () => {
      const message = AwardMessageGenerator.generatePopupMessage(
        'guided-course',
        mockCompletionData
      )

      expect(message).toContain('guided course')
      expect(message).toContain('14 days')
      expect(message).toContain('180 minutes')
    })

    it('generates correct message for learning path', () => {
      const message = AwardMessageGenerator.generatePopupMessage(
        'learning-path',
        mockCompletionData
      )

      expect(message).toContain('learning path')
      expect(message).toContain('14 days')
      expect(message).toContain('180 minutes')
    })
  })

  describe('generateCertificateMessage', () => {
    it('generates certificate message without custom text', () => {
      const message = AwardMessageGenerator.generateCertificateMessage(
        mockCompletionData
      )

      expect(message).toContain('180 minutes')
      expect(message).toContain('Blues Foundations')
      expect(message).toContain('Well Done!')
    })

    it('includes custom text when provided', () => {
      const message = AwardMessageGenerator.generateCertificateMessage(
        mockCompletionData,
        'This is a bonus message.'
      )

      expect(message).toContain('This is a bonus message.')
    })
  })
})
```

**Time:** 45 minutes

---

### Task 9.2: Unit Tests - Completion Data Generator

**File:** `src/services/awards/completion-data-generator.test.ts`

```typescript
import { generateCompletionData } from './completion-data-generator'
import { awardDefinitions } from './award-definitions'
import { getChildIds } from '../content'
import db from '../sync/repository-proxy'

jest.mock('./award-definitions')
jest.mock('../content')
jest.mock('../sync/repository-proxy')

describe('generateCompletionData', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('generates completion data with correct calculations', async () => {
    // Mock award definition
    jest.spyOn(awardDefinitions, 'getById').mockResolvedValue({
      _id: 'award-123',
      name: 'Complete Blues Foundations Course',
      has_kickoff: false,
      // ... other fields
    })

    // Mock child IDs
    jest.spyOn(getChildIds, 'getChildIds').mockResolvedValue([1, 2, 3])

    // Mock progress records
    const mockProgressRecords = {
      data: [
        { content_id: 1, started_on: Date.now() - (14 * 24 * 60 * 60 * 1000) },
        { content_id: 2, started_on: Date.now() - (10 * 24 * 60 * 60 * 1000) },
        { content_id: 3, started_on: Date.now() - (5 * 24 * 60 * 60 * 1000) }
      ]
    }

    jest.spyOn(db.contentProgress, 'queryAll').mockResolvedValue(mockProgressRecords)

    // Mock practice minutes
    jest.spyOn(db.contentPractices, 'sumPracticeMinutesForContent')
      .mockResolvedValue(180)

    // Generate data
    const result = await generateCompletionData('award-123', 12345)

    // Assertions
    expect(result.content_title).toBe('Blues Foundations')
    expect(result.days_user_practiced).toBeGreaterThanOrEqual(14)
    expect(result.practice_minutes).toBe(180)
    expect(result.completed_at).toBeTruthy()
  })

  it('excludes kickoff lesson when has_kickoff is true', async () => {
    jest.spyOn(awardDefinitions, 'getById').mockResolvedValue({
      _id: 'award-123',
      name: 'Complete Test Course',
      has_kickoff: true,
      // ... other fields
    })

    jest.spyOn(getChildIds, 'getChildIds').mockResolvedValue([1, 2, 3, 4])

    // Mock other dependencies...

    await generateCompletionData('award-123', 12345)

    // Verify practice calculation used only [2, 3, 4] (excluded first)
    expect(db.contentPractices.sumPracticeMinutesForContent)
      .toHaveBeenCalledWith([2, 3, 4])
  })
})
```

**Time:** 1 hour

---

### Task 9.3: Integration Test - Certificate Builder

**File:** `src/services/awards/certificate-builder.test.ts`

```typescript
import { buildCertificateData } from './certificate-builder'
import { awardDefinitions } from './award-definitions'
import db from '../sync/repository-proxy'

// Mock fetch
global.fetch = jest.fn()

describe('buildCertificateData', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('builds complete certificate data', async () => {
    // Mock backend response
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 402199,
        user_id: 6647968,
        user_name: 'Roberto Manieri',
        award_id: 'award-123',
        completed_at: '2023-09-17 14:19:21'
      })
    })

    // Mock Sanity definition
    jest.spyOn(awardDefinitions, 'getById').mockResolvedValue({
      _id: 'award-123',
      name: 'Complete Blues Foundations Course',
      badge: 'https://example.com/badge.png',
      award: 'https://example.com/certificate.png',
      brand: 'drumeo',
      // ... other fields
    })

    // Mock WatermelonDB data
    jest.spyOn(db.userAwardProgress, 'getByAwardId').mockResolvedValue({
      data: {
        award_id: 'award-123',
        progress_percentage: 100,
        completed_at: 1694965161,
        completion_data: {
          content_title: 'Blues Foundations',
          completed_at: '2023-09-17T14:19:21.000Z',
          days_user_practiced: 14,
          practice_minutes: 180
        },
        // ... other fields
      }
    })

    // Build certificate
    const result = await buildCertificateData(402199)

    // Assertions
    expect(result.userName).toBe('Roberto Manieri')
    expect(result.awardTitle).toBe('Complete Blues Foundations Course')
    expect(result.popupMessage).toContain('14 days')
    expect(result.certificateMessage).toContain('180 minutes')
    expect(result.badgeImage).toBe('https://example.com/badge.png')
    expect(result.brandLogo).toContain('drumeo')
  })

  it('throws error if award definition not found', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        award_id: 'nonexistent',
        // ... other fields
      })
    })

    jest.spyOn(awardDefinitions, 'getById').mockResolvedValue(null)

    await expect(buildCertificateData(123))
      .rejects.toThrow('Award definition not found')
  })
})
```

**Time:** 1 hour

---

### Task 9.4: Manual Testing Checklist

Create manual test scenarios:

**Test Case 1: Complete a Guided Course**
- [ ] Complete all lessons in a guided course
- [ ] Verify award popup shows with correct message
- [ ] Verify days_user_practiced is calculated correctly
- [ ] Verify practice_minutes matches expected value
- [ ] Check certificate displays all images correctly

**Test Case 2: Complete a Learning Path**
- [ ] Complete all content in a learning path
- [ ] Verify popup message mentions "learning path"
- [ ] Verify certificate message is correct

**Test Case 3: Offline Certificate Viewing**
- [ ] Earn an award while online
- [ ] Go offline
- [ ] Navigate to certificate page
- [ ] Verify certificate loads from local data

**Test Case 4: Practice Minutes Calculation**
- [ ] Start fresh course
- [ ] Practice lesson 1 for 10 minutes
- [ ] Practice lesson 2 for 15 minutes
- [ ] Complete course
- [ ] Verify award shows 25 minutes (or close)

**Test Case 5: Kickoff Lesson Exclusion**
- [ ] Find course with `has_kickoff: true`
- [ ] Complete all lessons including kickoff
- [ ] Verify kickoff is NOT counted in practice minutes

**Time:** 2 hours

---

## Phase 10: Documentation

### Task 10.1: Update Award Query Usage Examples

**File:** `src/services/awards/USAGE_EXAMPLES.md`

Add new example:

```markdown
## Example 7: Display Award Certificate

Use the certificate builder to show award certificates:

```typescript
import { buildCertificateData } from 'musora-content-services'

export function CertificatePage({ awardProgressId }) {
  const [certificate, setCertificate] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCertificate() {
      try {
        const data = await buildCertificateData(awardProgressId)
        setCertificate(data)
      } catch (error) {
        console.error('Failed to load certificate:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCertificate()
  }, [awardProgressId])

  if (loading) return <div>Loading certificate...</div>

  return (
    <div className="certificate">
      <img src={certificate.ribbonImage} alt="Ribbon" />
      <h1>{certificate.userName}</h1>
      <p>{certificate.certificateMessage}</p>
      <img src={certificate.awardImage} alt="Certificate" />
      <img src={certificate.badgeImage} alt="Badge" />
      {certificate.instructorSignature && (
        <img src={certificate.instructorSignature} alt="Signature" />
      )}
      {certificate.instructorName && (
        <p>Instructor: {certificate.instructorName}</p>
      )}
    </div>
  )
}
```
```

**Time:** 30 minutes

---

### Task 10.2: Update AWARDS_SYNC_PLAN.md

Add reference to client-side generation:

```markdown
## Client-Side Message Generation

Award completion messages and certificate data are generated client-side:
- See `CLIENT_AWARD_GENERATION_PLAN.md` for full details
- Messages use templates from `AwardMessageGenerator`
- Practice minutes calculated from local WatermelonDB data
- Backend only stores minimal user/award reference
```

**Time:** 15 minutes

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `src/constants/award-assets.ts`
- [ ] Update `CompletionData` type in `UserAwardProgress.ts`
- [ ] Update `AwardGrantedPayload` in `award-events.ts`

### Phase 2: Content Practice
- [ ] Verify/create `ContentPractice` model
- [ ] Verify/update `content_practices` schema
- [ ] Create `ContentPracticeRepository`
- [ ] Register in repository proxy
- [ ] Verify sync configuration

### Phase 3: Message Generation
- [ ] Create `message-generator.ts`

### Phase 4: Certificate Builder
- [ ] Update `types.ts` with `CertificateData`
- [ ] Create `certificate-builder.ts`

### Phase 5: Completion Data
- [ ] Create `completion-data-generator.ts`

### Phase 6: Integration
- [ ] Update `award-manager.ts` `grantAward` method

### Phase 7: Exports
- [ ] Update `award-query.ts` exports
- [ ] Run `npm run build-index`

### Phase 8: Sanity (Optional)
- [ ] Add optional fields to Sanity award schema
- [ ] Deploy Sanity changes

### Phase 9: Testing
- [ ] Write unit tests for message generator
- [ ] Write unit tests for completion data generator
- [ ] Write integration tests for certificate builder
- [ ] Complete manual testing checklist

### Phase 10: Documentation
- [ ] Update `USAGE_EXAMPLES.md`
- [ ] Update `AWARDS_SYNC_PLAN.md`

---

## Timeline Estimate

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Foundation | 35 minutes |
| Phase 2: Content Practice | 2 hours |
| Phase 3: Message Generation | 30 minutes |
| Phase 4: Certificate Builder | 1.25 hours |
| Phase 5: Completion Data | 1 hour |
| Phase 6: Integration | 30 minutes |
| Phase 7: Exports | 20 minutes |
| Phase 8: Sanity (Optional) | 30 minutes + deployment |
| Phase 9: Testing | 4.75 hours |
| Phase 10: Documentation | 45 minutes |
| **Total** | **~12 hours** (without Sanity deployment) |

---

## Risk Assessment

### High Risk
- **ContentPractice sync not including `duration_seconds`**
  - Mitigation: Verify backend endpoint before starting
  - Fallback: Use estimated practice time from video durations

### Medium Risk
- **Practice minutes calculation differs from backend**
  - Mitigation: Write comparison tests with known data
  - Document any differences

### Low Risk
- **Award type detection inaccurate**
  - Mitigation: Can be fixed with Sanity field addition
  - Workaround: Manual mapping table

---

## Success Criteria

✅ Award popup displays with client-generated message
✅ Certificate shows all required images
✅ Practice minutes match backend calculations
✅ Days practiced calculated correctly
✅ Works offline (except initial certificate fetch)
✅ Backend API payload reduced to <500 bytes
✅ All tests passing
✅ Documentation complete

---

## Next Steps

1. **Verify Prerequisites**
   - Check ContentPractice model exists
   - Verify sync includes duration_seconds
   - Confirm backend certificate endpoint is deployed

2. **Start Implementation**
   - Begin with Phase 1 (Foundation)
   - Work through phases sequentially
   - Test each phase before moving to next

3. **Coordinate with Backend Team**
   - Confirm backend changes are deployed
   - Verify API response formats match expectations

4. **Test Thoroughly**
   - Run unit tests continuously
   - Perform manual testing after integration
   - Compare results with backend calculations

---

**End of Plan**
