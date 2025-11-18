# WatermelonDB Awards Sync - Implementation Plan

**Date:** 2025-01-17
**Status:** Ready for Review

---

## Executive Summary

This plan implements a bi-directional sync system for awards using WatermelonDB, allowing:
- **Instant UI updates** with background sync
- **Client-side award eligibility detection** when content is completed
- **Award definition caching** from Sanity for offline access
- **Event-driven popup system** for frontend team to display award notifications

**Related Plans:**
- `CLIENT_AWARD_GENERATION_PLAN.md` - Client-side message and certificate generation (reduces backend payload from 500KB to 200 bytes)

---

## Architecture Overview

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         SANITY CMS                              │
│                    (Award Definitions)                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Fetch & Cache
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Client)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Award Definitions Cache (Sanity data)                   │  │
│  │  - Badge images, requirements, content_id mappings       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WatermelonDB Local Database                             │  │
│  │  - UserAwardProgress (synced with backend)               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  User completes content                                         │
│       │                                                          │
│       ├─1. Check award eligibility (instant)                   │
│       ├─2. Create local UserAwardProgress record (instant)     │
│       ├─3. Emit 'awardGranted' event → FE shows popup         │
│       └─4. Background sync to server                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Bi-directional Sync
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Laravel)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  user_award_progress Table                               │  │
│  │  - id, user_id, client_record_id, award_id, etc.         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Sync Endpoints:                                                │
│  - GET  /api/content/v1/user/awards?since=<timestamp>         │
│  - POST /api/content/v1/user/awards                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Backend Changes

### 1.1 Database Schema Updates

#### Add `client_record_id` to existing table

**Migration:** `database/migrations/YYYY_MM_DD_add_client_record_id_to_user_award_progress.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('user_award_progress', function (Blueprint $table) {
            $table->string('client_record_id')->after('award_id');
            $table->index('client_record_id');
        });
    }

    public function down()
    {
        Schema::table('user_award_progress', function (Blueprint $table) {
            $table->dropColumn('client_record_id');
        });
    }
};
```

---

### 1.2 Create Sync Controller

**New File:** `app/Modules/Gamification/Http/V1/Controllers/AwardSyncController.php`

```php
<?php

namespace App\Modules\Gamification\Http\V1\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Gamification\Models\UserAwardProgress;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AwardSyncController extends Controller
{
    /**
     * Pull user awards - WatermelonDB sync protocol
     * GET /api/content/v1/user/awards?since=<timestamp>
     */
    public function pull(Request $request)
    {
        $userId = $request->user()->id;
        $since = $request->query('since', 0); // Unix timestamp

        // Get all awards updated after 'since'
        $awards = UserAwardProgress::whereUser($userId)
            ->where('updated_at', '>', Carbon::createFromTimestamp($since))
            ->orderBy('updated_at', 'asc')
            ->get();

        // Calculate max updated_at for next sync
        $maxUpdatedAt = $awards->max('updated_at')?->timestamp ?? $since;

        // Transform to WatermelonDB sync protocol
        $entries = $awards->map(function($award) {
            return [
                'record' => [
                    'client_record_id' => $award->client_record_id,
                    'award_id' => $award->award_id,
                    'progress_percentage' => $award->progress_percentage,
                    'completed_at' => $award->completed_at?->timestamp,
                    'progress_data' => $award->progress_data,
                    'completion_data' => $award->completion_data,
                ],
                'meta' => [
                    'ids' => [
                        'client_record_id' => $award->client_record_id,
                    ],
                    'lifecycle' => [
                        'created_at' => $award->created_at->timestamp,
                        'updated_at' => $award->updated_at->timestamp,
                        'deleted_at' => null, // No soft deletes
                    ]
                ]
            ];
        });

        return response()->json([
            'meta' => [
                'since' => (int)$since,
                'max_updated_at' => $maxUpdatedAt,
                'timestamp' => now()->timestamp
            ],
            'entries' => $entries
        ]);
    }

    /**
     * Push user awards - WatermelonDB sync protocol
     * POST /api/content/v1/user/awards
     *
     * Client can create award progress records when they detect eligibility
     */
    public function push(Request $request)
    {
        $userId = $request->user()->id;
        $entries = $request->input('entries', []);

        $results = collect($entries)->map(function($entry) use ($userId) {
            try {
                $clientRecordId = $entry['meta']['ids']['client_record_id'];
                $record = $entry['record'];
                $isDeleted = $entry['meta']['deleted'] ?? false;

                // Handle deletion (not supported, silently fail)
                if ($isDeleted || $record === null) {
                    return [
                        'type' => 'success',
                        'entry' => $this->makeSuccessEntry($clientRecordId, null)
                    ];
                }

                // Validate award_id
                if (empty($record['award_id'])) {
                    return [
                        'type' => 'failure',
                        'failureType' => 'validation',
                        'ids' => ['client_record_id' => $clientRecordId],
                        'errors' => ['award_id' => ['Award ID is required']]
                    ];
                }

                // Upsert or update
                $award = UserAwardProgress::updateOrCreate(
                    [
                        'user_id' => $userId,
                        'client_record_id' => $clientRecordId,
                    ],
                    [
                        'award_id' => $record['award_id'],
                        'progress_percentage' => $record['progress_percentage'] ?? 0,
                        'completed_at' => isset($record['completed_at'])
                            ? Carbon::createFromTimestamp($record['completed_at'])
                            : null,
                        'progress_data' => $record['progress_data'] ?? null,
                        'completion_data' => $record['completion_data'] ?? null,
                    ]
                );

                // Return success with updated server state
                return [
                    'type' => 'success',
                    'entry' => $this->makeSuccessEntry($clientRecordId, $award)
                ];

            } catch (\Exception $e) {
                \Log::error('Award sync push error', [
                    'entry' => $entry,
                    'error' => $e->getMessage()
                ]);

                return [
                    'type' => 'failure',
                    'failureType' => 'server_error',
                    'ids' => ['client_record_id' => $entry['meta']['ids']['client_record_id'] ?? 'unknown'],
                    'errors' => ['server' => [$e->getMessage()]]
                ];
            }
        });

        return response()->json(['results' => $results]);
    }

    /**
     * Helper to format success response
     */
    private function makeSuccessEntry(string $clientRecordId, ?UserAwardProgress $award)
    {
        if (!$award) {
            return [
                'record' => null,
                'meta' => [
                    'ids' => ['client_record_id' => $clientRecordId],
                    'lifecycle' => [
                        'created_at' => now()->timestamp,
                        'updated_at' => now()->timestamp,
                        'deleted_at' => null,
                    ]
                ]
            ];
        }

        return [
            'record' => [
                'client_record_id' => $award->client_record_id,
                'award_id' => $award->award_id,
                'progress_percentage' => $award->progress_percentage,
                'completed_at' => $award->completed_at?->timestamp,
                'progress_data' => $award->progress_data,
                'completion_data' => $award->completion_data,
            ],
            'meta' => [
                'ids' => ['client_record_id' => $award->client_record_id],
                'lifecycle' => [
                    'created_at' => $award->created_at->timestamp,
                    'updated_at' => $award->updated_at->timestamp,
                    'deleted_at' => null,
                ]
            ]
        ];
    }
}
```

---

### 1.3 Add Sync Routes

**Update:** `app/Modules/Gamification/routes/authenticated.php`

Add these routes **without affecting existing ones**:

```php
use App\Modules\Gamification\Http\V1\Controllers\AwardSyncController;

// Existing routes remain unchanged
Route::get('/gamification/v1/users/{user}/awards', [AwardController::class, 'index']);
Route::get('/gamification/v1/users/certificate/{userAwardProgress}', [AwardController::class, 'getCertificate']);
Route::get('/gamification/v1/users/guided_course_award/{guidedCourseLessonId}', [AwardController::class, 'getAwardForGuidedCourse']);

// New WatermelonDB sync routes
Route::get('/api/content/v1/user/awards', [AwardSyncController::class, 'pull']);
Route::post('/api/content/v1/user/awards', [AwardSyncController::class, 'push']);
```

---

### 1.4 Update Model

**Update:** `app/Modules/Gamification/Models/UserAwardProgress.php`

```php
class UserAwardProgress extends Model
{
    protected $table = 'user_award_progress';

    protected $fillable = [
        'user_id',
        'client_record_id', // Add this
        'award_id',
        'progress_percentage',
        'completed_at',
        'progress_data',
        'completion_data',
    ];

    protected $casts = [
        'completed_at' => 'datetime',
        'progress_data' => 'array',
        'completion_data' => 'array',
    ];

    // ... existing methods remain
}
```

---

## Phase 2: Frontend - Data Models

### 2.1 WatermelonDB Model

**New File:** `src/services/sync/models/UserAwardProgress.ts`

```typescript
import { Model } from '@nozbe/watermelondb'
import { field, readonly, date, json } from '@nozbe/watermelondb/decorators'

export default class UserAwardProgress extends Model {
  static table = 'user_award_progress'

  @field('award_id') award_id!: string              // Sanity document ID
  @field('progress_percentage') progress_percentage!: number  // 0-100
  @field('completed_at') completed_at!: number | null  // Unix timestamp
  @json('progress_data', sanitizeJSON) progress_data!: any
  @json('completion_data', sanitizeJSON) completion_data!: CompletionData | null

  @readonly @date('created_at') createdAt!: Date
  @readonly @date('updated_at') updatedAt!: Date

  get isCompleted(): boolean {
    return this.completed_at !== null
  }

  get isInProgress(): boolean {
    return this.progress_percentage > 0 && !this.isCompleted
  }

  get completedAtDate(): Date | null {
    return this.completed_at ? new Date(this.completed_at * 1000) : null
  }
}

export interface CompletionData {
  message: string
  message_certificate: string
  content_title: string
  completed_at: string
  days_user_practiced: number
  practice_minutes: number
}

function sanitizeJSON(json: any) {
  return json || null
}
```

---

### 2.2 Schema Definition

**Update:** `src/services/sync/schema/index.ts`

```typescript
import { appSchema, tableSchema } from '@nozbe/watermelondb'

const userAwardProgressTable = tableSchema({
  name: 'user_award_progress',
  columns: [
    { name: 'award_id', type: 'string', isIndexed: true },
    { name: 'progress_percentage', type: 'number' },
    { name: 'completed_at', type: 'number', isOptional: true, isIndexed: true },
    { name: 'progress_data', type: 'string', isOptional: true }, // JSON
    { name: 'completion_data', type: 'string', isOptional: true }, // JSON
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number', isIndexed: true }
  ]
})

export const schema = appSchema({
  version: 2, // Increment version
  tables: [
    contentProgressTable,
    contentLikeTable,
    userAwardProgressTable // Add new table
  ]
})
```

---

## Phase 3: Frontend - Award Definitions Cache

### 3.1 Award Definition Types

**New File:** `src/services/awards/types.ts`

```typescript
/**
 * Award definition from Sanity CMS
 */
export interface AwardDefinition {
  _id: string                      // Sanity document ID
  name: string
  badge: string                    // Badge image URL
  award: string                    // Certificate image URL
  logo: string                     // Logo image URL
  brand: string                    // drumeo, pianote, etc.
  is_active: boolean
  content_id: number               // Associated course/content ID
  has_kickoff: boolean            // Exclude kickoff lesson from requirements
  instructor_name?: string
  instructor_signature?: string

  // Additional metadata
  description?: string
  type: 'content-award'           // Award type (currently only this)
}

/**
 * Map of award_id → AwardDefinition
 */
export type AwardDefinitionsMap = Map<string, AwardDefinition>

/**
 * Map of content_id → award_id[]
 * For quick lookup: "Which awards are associated with this content?"
 */
export type ContentToAwardsMap = Map<number, string[]>
```

---

### 3.2 Award Definitions Service

**New File:** `src/services/awards/award-definitions.ts`

```typescript
import { getSanityClient } from '../sanity'
import { AwardDefinition, AwardDefinitionsMap, ContentToAwardsMap } from './types'

/**
 * Service for fetching and caching award definitions from Sanity
 */
class AwardDefinitionsService {
  private definitions: AwardDefinitionsMap = new Map()
  private contentIndex: ContentToAwardsMap = new Map()
  private lastFetch: number = 0
  private cacheDuration: number = 5 * 60 * 1000 // 5 minutes
  private isFetching: boolean = false

  /**
   * Get all award definitions (cached)
   */
  async getAll(forceRefresh: boolean = false): Promise<AwardDefinition[]> {
    if (this.shouldRefresh() || forceRefresh) {
      await this.fetchFromSanity()
    }
    return Array.from(this.definitions.values())
  }

  /**
   * Get award definition by ID
   */
  async getById(awardId: string): Promise<AwardDefinition | null> {
    if (this.shouldRefresh()) {
      await this.fetchFromSanity()
    }
    return this.definitions.get(awardId) || null
  }

  /**
   * Get all awards associated with a content ID
   */
  async getByContentId(contentId: number): Promise<AwardDefinition[]> {
    if (this.shouldRefresh()) {
      await this.fetchFromSanity()
    }

    const awardIds = this.contentIndex.get(contentId) || []
    return awardIds
      .map(id => this.definitions.get(id))
      .filter(Boolean) as AwardDefinition[]
  }

  /**
   * Check if content has associated awards
   */
  async hasAwards(contentId: number): Promise<boolean> {
    if (this.shouldRefresh()) {
      await this.fetchFromSanity()
    }
    return (this.contentIndex.get(contentId)?.length ?? 0) > 0
  }

  /**
   * Fetch award definitions from Sanity
   */
  private async fetchFromSanity(): Promise<void> {
    if (this.isFetching) {
      // Wait for existing fetch to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.isFetching) {
            clearInterval(checkInterval)
            resolve()
          }
        }, 100)
      })
    }

    this.isFetching = true

    try {
      const client = getSanityClient()

      const query = `*[_type == "award" && is_active == true] {
        _id,
        name,
        badge,
        award,
        logo,
        brand,
        is_active,
        content_id,
        has_kickoff,
        instructor_name,
        instructor_signature,
        description,
        "type": "content-award"
      }`

      const awards: AwardDefinition[] = await client.fetch(query)

      // Clear and rebuild cache
      this.definitions.clear()
      this.contentIndex.clear()

      awards.forEach(award => {
        // Store definition
        this.definitions.set(award._id, award)

        // Index by content_id for fast lookup
        if (award.content_id) {
          const existing = this.contentIndex.get(award.content_id) || []
          this.contentIndex.set(award.content_id, [...existing, award._id])
        }
      })

      this.lastFetch = Date.now()
    } catch (error) {
      console.error('Failed to fetch award definitions from Sanity:', error)
      throw error
    } finally {
      this.isFetching = false
    }
  }

  /**
   * Check if cache should be refreshed
   */
  private shouldRefresh(): boolean {
    return this.definitions.size === 0 ||
           (Date.now() - this.lastFetch) > this.cacheDuration
  }

  /**
   * Manually refresh cache
   */
  async refresh(): Promise<void> {
    await this.fetchFromSanity()
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.definitions.clear()
    this.contentIndex.clear()
    this.lastFetch = 0
  }
}

// Singleton instance
export const awardDefinitions = new AwardDefinitionsService()
```

---

## Phase 4: Frontend - Repository

### 4.1 UserAwardProgressRepository

**New File:** `src/services/sync/repositories/user-award-progress.ts`

```typescript
import { Q } from '@nozbe/watermelondb'
import UserAwardProgress from '../models/UserAwardProgress'
import SyncRepository from './base'
import { SyncReadDTO, SyncWriteDTO } from '../types'
import { awardDefinitions } from '../../awards/award-definitions'

export default class UserAwardProgressRepository extends SyncRepository<UserAwardProgress> {
  constructor(store: SyncStore<UserAwardProgress>) {
    super(store)
  }

  /**
   * Get all awards
   */
  async getAll(options?: {
    limit?: number
    onlyCompleted?: boolean
  }): Promise<SyncReadDTO<UserAwardProgress[]>> {
    const clauses = []

    if (options?.onlyCompleted) {
      clauses.push(Q.where('completed_at', Q.notEq(null)))
    }

    clauses.push(Q.sortBy('updated_at', Q.desc))

    if (options?.limit) {
      clauses.push(Q.take(options.limit))
    }

    return this.queryAll(...clauses)
  }

  /**
   * Get completed awards
   */
  async getCompleted(limit?: number): Promise<SyncReadDTO<UserAwardProgress[]>> {
    return this.getAll({ onlyCompleted: true, limit })
  }

  /**
   * Get in-progress awards
   */
  async getInProgress(limit?: number): Promise<SyncReadDTO<UserAwardProgress[]>> {
    return this.queryAll(
      Q.where('progress_percentage', Q.gt(0)),
      Q.where('completed_at', Q.eq(null)),
      Q.sortBy('progress_percentage', Q.desc),
      ...(limit ? [Q.take(limit)] : [])
    )
  }

  /**
   * Get award by award_id
   */
  async getByAwardId(awardId: string): Promise<SyncReadDTO<UserAwardProgress | null>> {
    return this.readOne(awardId)
  }

  /**
   * Check if user has completed a specific award
   */
  async hasCompletedAward(awardId: string): Promise<boolean> {
    const result = await this.readOne(awardId)
    return result.data?.isCompleted ?? false
  }

  /**
   * Get awards completed recently (for activity feed)
   */
  async getRecentlyCompleted(options?: {
    limit?: number
    since?: number // Unix timestamp
  }): Promise<SyncReadDTO<UserAwardProgress[]>> {
    const clauses = [
      Q.where('completed_at', Q.notEq(null))
    ]

    if (options?.since) {
      clauses.push(Q.where('completed_at', Q.gte(options.since)))
    }

    clauses.push(Q.sortBy('completed_at', Q.desc))

    if (options?.limit) {
      clauses.push(Q.take(options.limit))
    }

    return this.queryAll(...clauses)
  }

  /**
   * Create or update award progress
   * Used when client detects award eligibility
   */
  async recordAwardProgress(
    awardId: string,
    progressPercentage: number,
    options?: {
      completedAt?: number | null
      progressData?: any
      completionData?: any
      immediate?: boolean // If true, push immediately
    }
  ): Promise<SyncWriteDTO<UserAwardProgress>> {
    const builder = (record: UserAwardProgress) => {
      record.award_id = awardId
      record.progress_percentage = progressPercentage

      if (options?.completedAt !== undefined) {
        record.completed_at = options.completedAt
      }

      if (options?.progressData !== undefined) {
        record.progress_data = options.progressData
      }

      if (options?.completionData !== undefined) {
        record.completion_data = options.completionData
      }
    }

    if (options?.immediate) {
      return this.upsertOneRemote(awardId, builder)
    } else {
      return this.upsertOne(awardId, builder)
    }
  }

  /**
   * Mark award as completed
   */
  async completeAward(
    awardId: string,
    completionData: any
  ): Promise<SyncWriteDTO<UserAwardProgress>> {
    return this.recordAwardProgress(awardId, 100, {
      completedAt: Math.floor(Date.now() / 1000),
      completionData,
      immediate: true // Push immediately for instant feedback
    })
  }

  /**
   * Get awards for a specific content ID
   * Cross-references with Sanity definitions
   */
  async getAwardsForContent(contentId: number): Promise<{
    definitions: AwardDefinition[]
    progress: Map<string, UserAwardProgress>
  }> {
    // Get award definitions for this content
    const definitions = await awardDefinitions.getByContentId(contentId)

    // Get user's progress for these awards
    const awardIds = definitions.map(d => d._id)
    const progressMap = new Map<string, UserAwardProgress>()

    for (const awardId of awardIds) {
      const result = await this.getByAwardId(awardId)
      if (result.data) {
        progressMap.set(awardId, result.data)
      }
    }

    return { definitions, progress: progressMap }
  }
}
```

---

## Phase 5: Frontend - Award Eligibility Detection

### 5.1 Award Eligibility Service

**New File:** `src/services/awards/award-eligibility.ts`

```typescript
import { awardDefinitions } from './award-definitions'
import { getContentProgress } from '../contentProgress'
import { getChildIds } from '../content'
import db from '../sync/repository-proxy'

export interface AwardEligibility {
  awardId: string
  eligible: boolean
  progress: number
  totalRequired: number
  completedCount: number
  missingContent: number[]
}

/**
 * Service for checking award eligibility when content is completed
 */
export class AwardEligibilityService {

  /**
   * Check if completing this content grants any awards
   * Returns list of awards that should be granted
   */
  async checkEligibilityForContent(contentId: number): Promise<{
    newlyEarned: string[]
    progressUpdated: Array<{ awardId: string, progress: number }>
  }> {
    // Get all awards associated with this content
    const awards = await awardDefinitions.getByContentId(contentId)

    if (awards.length === 0) {
      return { newlyEarned: [], progressUpdated: [] }
    }

    const newlyEarned: string[] = []
    const progressUpdated: Array<{ awardId: string, progress: number }> = []

    for (const award of awards) {
      const eligibility = await this.checkAwardEligibility(award._id, award.content_id, award.has_kickoff)

      if (eligibility.eligible) {
        // Check if already earned
        const hasCompleted = await db.userAwardProgress.hasCompletedAward(award._id)

        if (!hasCompleted) {
          newlyEarned.push(award._id)
        }
      } else if (eligibility.progress > 0) {
        // Progress updated but not completed yet
        progressUpdated.push({
          awardId: award._id,
          progress: eligibility.progress
        })
      }
    }

    return { newlyEarned, progressUpdated }
  }

  /**
   * Calculate award eligibility for a specific award
   */
  async checkAwardEligibility(
    awardId: string,
    courseContentId: number,
    hasKickoff: boolean = false
  ): Promise<AwardEligibility> {
    try {
      // Get all child content IDs for this course
      let childIds = await getChildIds(courseContentId)

      // Exclude kickoff lesson if specified
      if (hasKickoff && childIds.length > 0) {
        childIds = childIds.slice(1) // Assumes first is kickoff
      }

      if (childIds.length === 0) {
        return {
          awardId,
          eligible: false,
          progress: 0,
          totalRequired: 0,
          completedCount: 0,
          missingContent: []
        }
      }

      // Check completion status for each child
      const completionStatuses = await Promise.all(
        childIds.map(async (id) => {
          const progress = await getContentProgress(id)
          return {
            contentId: id,
            completed: progress?.state === 'completed'
          }
        })
      )

      const completedCount = completionStatuses.filter(s => s.completed).length
      const missingContent = completionStatuses
        .filter(s => !s.completed)
        .map(s => s.contentId)

      const progress = Math.round((completedCount / childIds.length) * 100)
      const eligible = completedCount === childIds.length

      return {
        awardId,
        eligible,
        progress,
        totalRequired: childIds.length,
        completedCount,
        missingContent
      }
    } catch (error) {
      console.error(`Failed to check eligibility for award ${awardId}:`, error)
      return {
        awardId,
        eligible: false,
        progress: 0,
        totalRequired: 0,
        completedCount: 0,
        missingContent: []
      }
    }
  }

  /**
   * Generate completion data for newly earned award
   */
  async generateCompletionData(awardId: string, courseContentId: number): Promise<any> {
    const award = await awardDefinitions.getById(awardId)

    if (!award) {
      return null
    }

    // Get course info (would need to be implemented)
    // This is a placeholder - adjust based on your content service
    const courseTitle = award.name.replace('Complete ', '').replace(' Course', '')

    return {
      message: `Great job on finishing this course! You've worked hard and it shows.`,
      message_certificate: `You practiced and completed all lessons in this course.`,
      content_title: courseTitle,
      completed_at: new Date().toISOString(),
      days_user_practiced: 0, // Would need to calculate from progress data
      practice_minutes: 0 // Would need to calculate from watch sessions
    }
  }
}

// Singleton instance
export const awardEligibility = new AwardEligibilityService()
```

---

## Phase 6: Frontend - Event System for Popups

### 6.1 Award Events

**New File:** `src/services/awards/award-events.ts`

```typescript
import { AwardDefinition } from './types'
import { CompletionData } from '../sync/models/UserAwardProgress'

/**
 * Event payload when award is granted
 */
export interface AwardGrantedPayload {
  awardId: string
  definition: AwardDefinition
  completionData: CompletionData
  timestamp: number
}

/**
 * Event payload when award progress is updated
 */
export interface AwardProgressPayload {
  awardId: string
  progress: number
  definition: AwardDefinition
}

/**
 * Award event emitter for frontend to listen to
 */
class AwardEventEmitter {
  private listeners: Map<string, Set<Function>> = new Map()

  /**
   * Emit award granted event
   * Frontend team listens to this to show popup
   */
  emitAwardGranted(payload: AwardGrantedPayload): void {
    this.emit('awardGranted', payload)

    // Also emit as custom DOM event for non-React components
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('awardGranted', { detail: payload })
      window.dispatchEvent(event)
    }
  }

  /**
   * Emit award progress updated event
   */
  emitAwardProgress(payload: AwardProgressPayload): void {
    this.emit('awardProgress', payload)
  }

  /**
   * Subscribe to award events
   *
   * Usage:
   * ```typescript
   * const unsubscribe = awardEvents.on('awardGranted', (payload) => {
   *   // Show popup
   *   console.log('Award earned!', payload.definition.name)
   * })
   *
   */
  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }

    this.listeners.get(event)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  /**
   * Subscribe once
   */
  once(event: string, callback: Function): () => void {
    const wrapper = (...args: any[]) => {
      callback(...args)
      this.listeners.get(event)?.delete(wrapper)
    }
    return this.on(event, wrapper)
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, payload: any): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(payload)
        } catch (error) {
          console.error(`Error in ${event} listener:`, error)
        }
      })
    }
  }

  /**
   * Remove all listeners
   */
  clear(): void {
    this.listeners.clear()
  }
}

// Singleton instance
export const awardEvents = new AwardEventEmitter()
```

---

### 6.2 Award Manager (Orchestrator)

**New File:** `src/services/awards/award-manager.ts`

```typescript
import { awardEligibility } from './award-eligibility'
import { awardDefinitions } from './award-definitions'
import { awardEvents } from './award-events'
import db from '../sync/repository-proxy'

/**
 * Main orchestrator for award detection and granting
 * Call this when user completes content
 */
export class AwardManager {

  /**
   * Handle content completion - check for awards
   * This is the main entry point for award detection
   *
   * Usage:
   * ```typescript
   * // When user clicks "Mark as Complete"
   * await awardManager.onContentCompleted(contentId)
   *
   */
  async onContentCompleted(contentId: number): Promise<void> {
    try {
      // Check if this content is associated with any awards
      const hasAwards = await awardDefinitions.hasAwards(contentId)

      if (!hasAwards) {
        return // No awards for this content
      }

      // Check eligibility
      const { newlyEarned, progressUpdated } =
        await awardEligibility.checkEligibilityForContent(contentId)

      // Grant newly earned awards
      for (const awardId of newlyEarned) {
        await this.grantAward(awardId, contentId)
      }

      // Update progress for in-progress awards
      for (const { awardId, progress } of progressUpdated) {
        await this.updateAwardProgress(awardId, progress)
      }
    } catch (error) {
      console.error('Failed to process award completion:', error)
      // Don't throw - awards are non-critical
    }
  }

  /**
   * Grant award to user
   */
  private async grantAward(awardId: string, courseContentId: number): Promise<void> {
    // Get award definition
    const definition = await awardDefinitions.getById(awardId)

    if (!definition) {
      console.error(`Award definition not found: ${awardId}`)
      return
    }

    // Generate completion data
    const completionData = await awardEligibility.generateCompletionData(
      awardId,
      courseContentId
    )

    // Save to local DB (instant) and sync to server (background)
    await db.userAwardProgress.completeAward(awardId, completionData)

    // Emit event for frontend to show popup
    awardEvents.emitAwardGranted({
      awardId,
      definition,
      completionData,
      timestamp: Date.now()
    })
  }

  /**
   * Update award progress (not yet completed)
   */
  private async updateAwardProgress(awardId: string, progress: number): Promise<void> {
    // Update local DB
    await db.userAwardProgress.recordAwardProgress(awardId, progress)

    // Get definition for event
    const definition = await awardDefinitions.getById(awardId)

    if (definition) {
      awardEvents.emitAwardProgress({
        awardId,
        progress,
        definition
      })
    }
  }

  /**
   * Manually refresh all award definitions from Sanity
   */
  async refreshDefinitions(): Promise<void> {
    await awardDefinitions.refresh()
  }

  /**
   * Get user's award statistics
   */
  async getStatistics(): Promise<{
    total: number
    completed: number
    inProgress: number
    completionRate: number
  }> {
    const allAwards = await awardDefinitions.getAll()
    const completed = await db.userAwardProgress.getCompleted()
    const inProgress = await db.userAwardProgress.getInProgress()

    return {
      total: allAwards.length,
      completed: completed.data.length,
      inProgress: inProgress.data.length,
      completionRate: allAwards.length > 0
        ? Math.round((completed.data.length / allAwards.length) * 100)
        : 0
    }
  }
}

// Singleton instance
export const awardManager = new AwardManager()
```

---

## Phase 7: Frontend - Sync Configuration

### 7.1 Add to Store Configs

**Update:** `src/services/sync/store-configs.ts`

```typescript
import UserAwardProgress from './models/UserAwardProgress'
import { handlePull, handlePush, makeFetchRequest } from './fetch'
import { updatedAtComparator } from './resolver'

export const storeConfigs = [
  // ... existing configs (ContentProgress, ContentLike)

  {
    model: UserAwardProgress,
    pull: handlePull(makeFetchRequest('/api/content/v1/user/awards')),
    push: handlePush(makeFetchRequest('/api/content/v1/user/awards', {
      method: 'POST'
    })),
    comparator: updatedAtComparator // Server always wins
  }
]
```

---

### 7.2 Update Repository Proxy

**Update:** `src/services/sync/repository-proxy.ts`

```typescript
import UserAwardProgressRepository from './repositories/user-award-progress'
import UserAwardProgress from './models/UserAwardProgress'

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
      }
    }
    return target[prop]
  }
})

export default repositories
```

---

## Phase 8: Frontend - Initialization & Usage

### 8.1 Initialize Sync Manager

**Update app initialization:**

```typescript
import UserAwardProgress from './sync/models/UserAwardProgress'
import { awardManager } from './awards/award-manager'

// Initialize database with UserAwardProgress model
const database = new Database({
  adapter: adapter,
  modelClasses: [ContentProgress, ContentLike, UserAwardProgress]
})

// Setup sync with all models
manager.syncStoresWithStrategies(
  manager.storesForModels([ContentProgress, ContentLike, UserAwardProgress]),
  [
    manager.createStrategy(InitialStrategy),
    manager.createStrategy(PollingStrategy, 60_000)
  ]
)

// Load award definitions on app startup
await awardManager.refreshDefinitions()
```

---

### 8.2 Integration Example (React Component)

```typescript
import { useEffect, useState } from 'react'
import { awardEvents, AwardGrantedPayload } from './services/awards/award-events'
import { awardManager } from './services/awards/award-manager'
import db from './services/sync/repository-proxy'

function CourseLesson({ lessonId, courseId }) {
  const [showAwardPopup, setShowAwardPopup] = useState(false)
  const [awardData, setAwardData] = useState<AwardGrantedPayload | null>(null)

  useEffect(() => {
    // Listen for award granted events
    const unsubscribe = awardEvents.on('awardGranted', (payload: AwardGrantedPayload) => {
      setAwardData(payload)
      setShowAwardPopup(true)
    })

    return () => unsubscribe()
  }, [])

  const handleMarkComplete = async () => {
    // 1. Mark lesson as complete (your existing logic)
    await db.contentProgress.recordProgressRemotely(lessonId, 100)

    // 2. Check for awards (instant UI, background sync)
    await awardManager.onContentCompleted(courseId)
  }

  return (
    <>
      <button onClick={handleMarkComplete}>
        Mark as Complete
      </button>

      {showAwardPopup && awardData && (
        <AwardPopup
          award={awardData.definition}
          completionData={awardData.completionData}
          onClose={() => setShowAwardPopup(false)}
        />
      )}
    </>
  )
}
```

---

### 8.3 Usage Example (Plain JavaScript)

```javascript
import { awardManager } from './services/awards/award-manager'

// Listen for award events
window.addEventListener('awardGranted', (event) => {
  const { definition, completionData } = event.detail

  // Show popup
  showAwardPopup({
    title: definition.name,
    badge: definition.badge,
    message: completionData.message,
    practiceMinutes: completionData.practice_minutes
  })
})

// When user completes content
async function onContentComplete(contentId) {
  // Check for awards
  await awardManager.onContentCompleted(contentId)
}
```

---

## Phase 9: Testing

### 9.1 Backend Tests

**New File:** `app/Modules/Gamification/tests/Feature/AwardSyncTest.php`

```php
<?php

namespace App\Modules\Gamification\Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Modules\Gamification\Models\UserAwardProgress;
use Carbon\Carbon;

class AwardSyncTest extends TestCase
{
    /** @test */
    public function pull_returns_empty_when_no_awards()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->getJson('/api/content/v1/user/awards');

        $response->assertOk()
            ->assertJsonStructure(['meta', 'entries'])
            ->assertJsonPath('entries', []);
    }

    /** @test */
    public function pull_returns_user_awards_with_correct_format()
    {
        $user = User::factory()->create();

        $award = UserAwardProgress::create([
            'user_id' => $user->id,
            'client_record_id' => 'award-123',
            'award_id' => 'award-123',
            'progress_percentage' => 100,
            'completed_at' => now(),
            'completion_data' => ['message' => 'Congrats!']
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/content/v1/user/awards');

        $response->assertOk()
            ->assertJsonStructure([
                'meta' => ['since', 'max_updated_at', 'timestamp'],
                'entries' => [
                    '*' => [
                        'record' => [
                            'client_record_id',
                            'award_id',
                            'progress_percentage',
                            'completed_at',
                            'completion_data'
                        ],
                        'meta' => [
                            'ids' => ['client_record_id'],
                            'lifecycle' => ['created_at', 'updated_at', 'deleted_at']
                        ]
                    ]
                ]
            ]);
    }

    /** @test */
    public function pull_respects_since_parameter()
    {
        $user = User::factory()->create();

        // Old award
        $old = UserAwardProgress::create([
            'user_id' => $user->id,
            'client_record_id' => 'old',
            'award_id' => 'old',
            'progress_percentage' => 50,
            'created_at' => Carbon::now()->subDays(2),
            'updated_at' => Carbon::now()->subDays(2),
        ]);

        // New award
        $new = UserAwardProgress::create([
            'user_id' => $user->id,
            'client_record_id' => 'new',
            'award_id' => 'new',
            'progress_percentage' => 75,
        ]);

        $since = Carbon::now()->subDay()->timestamp;

        $response = $this->actingAs($user)
            ->getJson("/api/content/v1/user/awards?since={$since}");

        $response->assertOk()
            ->assertJsonCount(1, 'entries')
            ->assertJsonPath('entries.0.record.award_id', 'new');
    }

    /** @test */
    public function push_creates_new_award_progress()
    {
        $user = User::factory()->create();

        $payload = [
            'entries' => [
                [
                    'record' => [
                        'client_record_id' => 'award-456',
                        'award_id' => 'award-456',
                        'progress_percentage' => 50,
                        'completed_at' => null,
                    ],
                    'meta' => [
                        'ids' => ['client_record_id' => 'award-456'],
                        'deleted' => false
                    ]
                ]
            ]
        ];

        $response = $this->actingAs($user)
            ->postJson('/api/content/v1/user/awards', $payload);

        $response->assertOk()
            ->assertJsonPath('results.0.type', 'success');

        $this->assertDatabaseHas('user_award_progress', [
            'user_id' => $user->id,
            'client_record_id' => 'award-456',
            'award_id' => 'award-456',
            'progress_percentage' => 50
        ]);
    }

    /** @test */
    public function push_updates_existing_award_progress()
    {
        $user = User::factory()->create();

        $existing = UserAwardProgress::create([
            'user_id' => $user->id,
            'client_record_id' => 'award-789',
            'award_id' => 'award-789',
            'progress_percentage' => 50,
        ]);

        $payload = [
            'entries' => [
                [
                    'record' => [
                        'client_record_id' => 'award-789',
                        'award_id' => 'award-789',
                        'progress_percentage' => 100,
                        'completed_at' => now()->timestamp,
                    ],
                    'meta' => [
                        'ids' => ['client_record_id' => 'award-789'],
                        'deleted' => false
                    ]
                ]
            ]
        ];

        $response = $this->actingAs($user)
            ->postJson('/api/content/v1/user/awards', $payload);

        $response->assertOk();

        $existing->refresh();
        $this->assertEquals(100, $existing->progress_percentage);
        $this->assertNotNull($existing->completed_at);
    }

    /** @test */
    public function push_returns_validation_errors()
    {
        $user = User::factory()->create();

        $payload = [
            'entries' => [
                [
                    'record' => [
                        'client_record_id' => 'invalid',
                        // Missing award_id
                        'progress_percentage' => 50,
                    ],
                    'meta' => [
                        'ids' => ['client_record_id' => 'invalid'],
                        'deleted' => false
                    ]
                ]
            ]
        ];

        $response = $this->actingAs($user)
            ->postJson('/api/content/v1/user/awards', $payload);

        $response->assertOk()
            ->assertJsonPath('results.0.type', 'failure')
            ->assertJsonPath('results.0.failureType', 'validation');
    }
}
```

---

### 9.2 Frontend Tests

**New File:** `src/services/awards/award-manager.test.ts`

```typescript
import { awardManager } from './award-manager'
import { awardEvents } from './award-events'
import { awardDefinitions } from './award-definitions'
import db from '../sync/repository-proxy'

describe('AwardManager', () => {
  beforeEach(() => {
    // Setup mocks
    jest.clearAllMocks()
  })

  test('grants award when content is completed', async () => {
    // Mock award definition
    jest.spyOn(awardDefinitions, 'hasAwards').mockResolvedValue(true)
    jest.spyOn(awardDefinitions, 'getById').mockResolvedValue({
      _id: 'award-123',
      name: 'Complete Blues Course',
      badge: 'https://example.com/badge.png',
      // ... other fields
    })

    // Mock eligibility check
    const checkSpy = jest.spyOn(awardEligibility, 'checkEligibilityForContent')
      .mockResolvedValue({
        newlyEarned: ['award-123'],
        progressUpdated: []
      })

    // Listen for event
    const eventSpy = jest.fn()
    awardEvents.on('awardGranted', eventSpy)

    // Complete content
    await awardManager.onContentCompleted(12345)

    // Assertions
    expect(checkSpy).toHaveBeenCalledWith(12345)
    expect(eventSpy).toHaveBeenCalled()
    expect(eventSpy.mock.calls[0][0]).toMatchObject({
      awardId: 'award-123',
      definition: expect.objectContaining({
        name: 'Complete Blues Course'
      })
    })
  })

  test('updates progress when award is not yet complete', async () => {
    jest.spyOn(awardDefinitions, 'hasAwards').mockResolvedValue(true)

    jest.spyOn(awardEligibility, 'checkEligibilityForContent')
      .mockResolvedValue({
        newlyEarned: [],
        progressUpdated: [{ awardId: 'award-456', progress: 75 }]
      })

    const progressSpy = jest.fn()
    awardEvents.on('awardProgress', progressSpy)

    await awardManager.onContentCompleted(12345)

    expect(progressSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        awardId: 'award-456',
        progress: 75
      })
    )
  })

  test('does nothing when content has no awards', async () => {
    jest.spyOn(awardDefinitions, 'hasAwards').mockResolvedValue(false)

    const grantedSpy = jest.fn()
    awardEvents.on('awardGranted', grantedSpy)

    await awardManager.onContentCompleted(12345)

    expect(grantedSpy).not.toHaveBeenCalled()
  })
})
```

---

## Implementation Checklist

### Backend

- [ ] Add `client_record_id` migration
- [ ] Backfill existing `user_award_progress` records
- [ ] Create `AwardSyncController`
- [ ] Add sync routes to `authenticated.php`
- [ ] Update `UserAwardProgress` model with `client_record_id` fillable
- [ ] Write backend tests
- [ ] Test pull endpoint manually
- [ ] Test push endpoint manually

### Frontend

- [ ] Create `UserAwardProgress` model
- [ ] Add schema definition and increment version
- [ ] Implement WatermelonDB schema migration
- [ ] Create award definition types
- [ ] Implement `AwardDefinitionsService`
- [ ] Create `UserAwardProgressRepository`
- [ ] Implement `AwardEligibilityService`
- [ ] Create award event emitter
- [ ] Implement `AwardManager`
- [ ] Create simple query API (`award-query.ts`)
- [ ] Add to sync store configs
- [ ] Update repository proxy
- [ ] Initialize in app startup
- [ ] Write frontend tests
- [ ] Document integration for FE team

### Integration Testing

- [ ] Test full flow: complete content → award granted → popup shown
- [ ] Test offline → online sync
- [ ] Test award progress updates
- [ ] Test multiple awards for same content
- [ ] Test award definitions refresh
- [ ] Performance test with many awards

---

## Frontend Integration Guide

### For Frontend Team: How to Use Awards

#### 1. Query Award Status and Progress (Simple API)

For most use cases, use these simple query functions to get award status and progress from local WatermelonDB:

```typescript
import {
  getAwardStatusForContent,
  getAwardProgress,
  getAllUserAwardProgress,
  getCompletedAwards,
  getInProgressAwards,
  hasCompletedAward,
  getAwardStatistics
} from '@/services/awards/award-query'

// Example 1: Show award progress on a course page
async function showCourseAwardProgress(courseId: number) {
  const status = await getAwardStatusForContent(courseId)

  if (status.hasAwards) {
    status.awards.forEach(award => {
      console.log(`${award.name}: ${award.progressPercent}% complete`)
      if (award.isCompleted) {
        console.log(`Earned on: ${award.completedAt}`)
      }
    })
  }
}

// Example 2: Display user's award collection page
async function loadAwardsPage() {
  const stats = await getAwardStatistics()
  console.log(`${stats.completedCount} of ${stats.totalAvailable} awards earned`)

  const completed = await getCompletedAwards()
  const inProgress = await getInProgressAwards()

  return { completed, inProgress, stats }
}

// Example 3: Check if user has earned a specific award
async function checkAwardEarned(awardId: string) {
  const hasEarned = await hasCompletedAward(awardId)
  return hasEarned
}

// Example 4: Get detailed progress for a specific award
async function getAwardDetails(awardId: string) {
  const progress = await getAwardProgress(awardId)

  if (progress) {
    console.log(`Progress: ${progress.progressPercent}%`)
    console.log(`Completed: ${progress.isCompleted}`)
  }
}
```

#### 2. Listen for Award Events (Real-time Notifications)

Use event listeners to show award popups when users earn new awards:

```typescript
import { awardEvents } from '@/services/awards/award-events'

// In your React component
useEffect(() => {
  const unsubscribe = awardEvents.on('awardGranted', (payload) => {
    // Show popup with award details
    showAwardPopup({
      title: payload.definition.name,
      badgeImage: payload.definition.badge,
      certificateImage: payload.definition.award,
      message: payload.completionData.message,
      practiceMinutes: payload.completionData.practice_minutes
    })
  })

  return () => unsubscribe()
}, [])
```

#### 3. Trigger Award Check on Content Completion

When users complete content, check if they've earned any awards:

```typescript
import { awardManager } from '@/services/awards/award-manager'

async function handleMarkComplete() {
  // Your existing completion logic
  await markContentComplete(lessonId)

  // Check for awards (instant UI, background sync)
  await awardManager.onContentCompleted(courseId)
}
```

#### 4. Display User's Awards (Using Simple Query API)

**DEPRECATED:** The examples below use the old repository API. Use the new query functions from section 1 instead.

```typescript
import db from '@/services/sync/repository-proxy'

async function loadUserAwards() {
  const completed = await db.userAwardProgress.getCompleted()

  return completed.data.map(award => ({
    id: award.award_id,
    progress: award.progress_percentage,
    completedAt: award.completedAtDate,
    stats: award.completion_data
  }))
}
```

#### 5. Show Award Progress (Using Simple Query API)

**DEPRECATED:** Use `getAwardStatusForContent()` from section 1 instead.

```typescript
async function getAwardProgressForCourse(courseId) {
  const { definitions, progress } =
    await db.userAwardProgress.getAwardsForContent(courseId)

  return definitions.map(def => ({
    name: def.name,
    badge: def.badge,
    progress: progress.get(def._id)?.progress_percentage ?? 0,
    isComplete: progress.get(def._id)?.isCompleted ?? false
  }))
}
```

---

## Architecture Decisions Summary

| Decision | Rationale |
|----------|-----------|
| **client_record_id = award_id** | Each user can only earn each award once, so award_id is unique per user |
| **Bi-directional sync** | Allows offline award detection and instant UI updates |
| **Push silently succeeds** | Client optimistically shows awards, server validates in background |
| **Cache Sanity definitions** | Enables offline eligibility checking and reduces API calls |
| **Event-driven popups** | Decouples award system from UI, flexible integration |
| **No soft deletes** | Awards are permanent (simplifies sync protocol) |
| **Instant UI + background sync** | Best user experience - no waiting for server response |

---

## Migration Strategy

### Database Migration Steps

1. Run migration to add `client_record_id` column
2. Backfill existing records (set `client_record_id = award_id`)
3. Make column non-nullable
4. Add index on `client_record_id`

### WatermelonDB Schema Migration

```typescript
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations'

const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        {
          type: 'create_table',
          schema: userAwardProgressTable
        }
      ]
    }
  ]
})
```

---

## Timeline Estimate

| Phase | Estimated Time |
|-------|----------------|
| Backend (migration, controller, routes) | 4-6 hours |
| Frontend models & schema | 2-3 hours |
| Award definitions service | 3-4 hours |
| Eligibility detection | 4-6 hours |
| Event system & manager | 2-3 hours |
| Sync configuration | 1-2 hours |
| Testing (BE + FE) | 6-8 hours |
| Integration & documentation | 2-3 hours |
| **Total** | **24-35 hours** |

---

## Next Steps

1. **Review this plan** - Confirm architecture decisions
2. **Backend implementation** - Start with migration and sync controller
3. **Frontend implementation** - Parallel development of models and services
4. **Integration testing** - Test full flow end-to-end
5. **Documentation** - Guide for FE team on using award events
6. **Deployment** - Roll out to staging, then production

---

## Questions / Discussion Points

- [ ] Confirm `client_record_id = award_id` is acceptable
- [ ] Should we support award revocation in the future?
- [ ] Do we need award notifications beyond popups (push notifications, emails)?
- [ ] Should award definitions be versioned (handle schema changes)?
- [ ] Performance: how many awards do we expect per user?
- [ ] Should we pre-calculate which awards are available when course list loads?

---

## Quick Reference: Simple Award Query API

For frontend developers who just want to quickly check award status and progress, use these simple functions:

### Available Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `getAwardStatusForContent(contentId)` | Get award status for any content (course, learning-path, guided-course) | Award status with progress percentage |
| `getAwardProgress(awardId)` | Get progress for a specific award | Progress percentage and completion status |
| `getAllUserAwardProgress(options?)` | Get all user's awards (completed + in-progress) | Array of all awards with progress |
| `getCompletedAwards(limit?)` | Get only completed awards | Array of completed awards |
| `getInProgressAwards(limit?)` | Get awards that are started but not completed | Array of in-progress awards |
| `hasCompletedAward(awardId)` | Check if user has earned a specific award | Boolean |
| `getAwardStatistics()` | Get summary stats (total, completed, completion rate) | Statistics object |

### Common Use Cases

#### Display award progress on a course page
```typescript
import { getAwardStatusForContent } from 'musora-content-services'

const status = await getAwardStatusForContent(courseId)
// status.hasAwards: boolean
// status.awards: [{ name, progressPercent, isCompleted, badgeImage, ... }]
```

#### Check if user has completed an award
```typescript
import { hasCompletedAward } from 'musora-content-services'

if (await hasCompletedAward('award-123')) {
  // User has earned this award
}
```

#### Build an awards collection page
```typescript
import { getCompletedAwards, getInProgressAwards, getAwardStatistics } from 'musora-content-services'

const stats = await getAwardStatistics()
const completed = await getCompletedAwards()
const inProgress = await getInProgressAwards()

// Display: "15 of 50 awards earned (30% completion rate)"
```

#### Show award notification when earned
```typescript
import { awardEvents } from 'musora-content-services'

awardEvents.on('awardGranted', (payload) => {
  // Show popup with award details
  showAwardPopup({
    title: payload.definition.name,
    badge: payload.definition.badge,
    message: payload.completionData.message
  })
})
```

---

## Client-Side Message Generation

Award completion messages and certificate data are generated client-side (see `CLIENT_AWARD_GENERATION_PLAN.md` for full implementation details):

### Benefits
- **Reduces backend API payload**: From ~500KB to ~200 bytes
- **Enables offline certificate viewing**: All data available locally
- **Faster award popup display**: No backend processing needed
- **Consistent messaging**: Same templates across all platforms

### Implementation
Messages are generated using local data:
- **Practice minutes**: Calculated from WatermelonDB `ContentPractice` records
- **Practice days**: Calculated from earliest `ContentProgress.created_at` to completion
- **Message templates**: Defined in `AwardMessageGenerator` class

### Files Created
- `src/constants/award-assets.ts` - Static certificate assets
- `src/services/awards/types.ts` - TypeScript definitions
- `src/services/awards/message-generator.ts` - Message templates
- `src/services/awards/certificate-builder.ts` - Certificate data assembly
- `src/services/awards/completion-data-generator.ts` - Practice metrics calculation
- `src/services/sync/repositories/content-practice.ts` - Practice time queries

### Usage Example
```typescript
import { buildCertificateData } from 'musora-content-services'

// Build complete certificate with client-generated messages
const certificate = await buildCertificateData(userAwardProgressId)

// Certificate includes:
// - popupMessage: "Great job on finishing this guided course!..."
// - certificateMessage: "You practiced for 180 minutes..."
// - All image URLs (badge, certificate, logos, signature)
// - User and award metadata
```

See Example 7 in `src/services/awards/USAGE_EXAMPLES.md` for a complete React component implementation.

---

**End of Plan**
