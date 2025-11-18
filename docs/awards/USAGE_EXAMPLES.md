# Award Query API - Usage Examples

This guide shows practical examples of using the simple award query API in your components.

## Installation

```typescript
import {
  getAwardStatusForContent,
  getAwardProgress,
  getAllUserAwardProgress,
  getCompletedAwards,
  getInProgressAwards,
  hasCompletedAward,
  getAwardStatistics
} from 'musora-content-services'
```

## Example 1: Course Page - Show Award Progress

Display award progress badges on a course page to motivate users.

```tsx
import React, { useEffect, useState } from 'react'
import { getAwardStatusForContent } from 'musora-content-services'
import type { ContentAwardStatus } from 'musora-content-services'

interface CourseAwardBadgeProps {
  courseId: number
}

export function CourseAwardBadge({ courseId }: CourseAwardBadgeProps) {
  const [awardStatus, setAwardStatus] = useState<ContentAwardStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAwards() {
      setLoading(true)
      try {
        const status = await getAwardStatusForContent(courseId)
        setAwardStatus(status)
      } catch (error) {
        console.error('Failed to load awards:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAwards()
  }, [courseId])

  if (loading) return <div>Loading awards...</div>
  if (!awardStatus?.hasAwards) return null

  return (
    <div className="course-awards">
      <h3>Course Award</h3>
      {awardStatus.awards.map(award => (
        <div key={award.awardId} className="award-badge">
          <img src={award.badgeImage} alt={award.name} />
          <div className="award-info">
            <h4>{award.name}</h4>
            {award.isCompleted ? (
              <span className="completed">✓ Earned!</span>
            ) : (
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${award.progressPercent}%` }}
                />
                <span>{award.progressPercent}% Complete</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
```

## Example 2: Awards Collection Page

Build a full awards page showing all earned and in-progress awards.

```tsx
import React, { useEffect, useState } from 'react'
import {
  getCompletedAwards,
  getInProgressAwards,
  getAwardStatistics
} from 'musora-content-services'
import type { AwardStatus } from 'musora-content-services'

export function AwardsCollectionPage() {
  const [completed, setCompleted] = useState<AwardStatus[]>([])
  const [inProgress, setInProgress] = useState<AwardStatus[]>([])
  const [stats, setStats] = useState({
    totalAvailable: 0,
    completedCount: 0,
    inProgressCount: 0,
    completionRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAwards() {
      setLoading(true)
      try {
        const [completedData, inProgressData, statsData] = await Promise.all([
          getCompletedAwards(),
          getInProgressAwards(),
          getAwardStatistics()
        ])

        setCompleted(completedData)
        setInProgress(inProgressData)
        setStats(statsData)
      } catch (error) {
        console.error('Failed to load awards:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAwards()
  }, [])

  if (loading) {
    return <div>Loading your awards...</div>
  }

  return (
    <div className="awards-page">
      <header className="awards-header">
        <h1>Your Awards</h1>
        <div className="stats">
          <p>
            {stats.completedCount} of {stats.totalAvailable} awards earned
          </p>
          <div className="completion-bar">
            <div
              className="fill"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
          <p>{stats.completionRate}% completion rate</p>
        </div>
      </header>

      <section className="completed-awards">
        <h2>Earned Awards ({completed.length})</h2>
        <div className="awards-grid">
          {completed.map(award => (
            <div key={award.awardId} className="award-card completed">
              <img src={award.badgeImage} alt={award.name} />
              <h3>{award.name}</h3>
              <p className="earned-date">
                Earned: {award.completedAt?.toLocaleDateString()}
              </p>
              <button onClick={() => viewCertificate(award.certificateImage)}>
                View Certificate
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="in-progress-awards">
        <h2>In Progress ({inProgress.length})</h2>
        <div className="awards-grid">
          {inProgress.map(award => (
            <div key={award.awardId} className="award-card in-progress">
              <img
                src={award.badgeImage}
                alt={award.name}
                style={{ opacity: 0.5 }}
              />
              <h3>{award.name}</h3>
              <div className="progress">
                <div className="progress-bar">
                  <div
                    className="fill"
                    style={{ width: `${award.progressPercent}%` }}
                  />
                </div>
                <span>{award.progressPercent}% Complete</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function viewCertificate(certificateUrl: string) {
  window.open(certificateUrl, '_blank')
}
```

## Example 3: Learning Path Header - Show Award Badge

Display award status in a learning path or guided course header.

```tsx
import React, { useEffect, useState } from 'react'
import { getAwardStatusForContent } from 'musora-content-services'

interface LearningPathHeaderProps {
  learningPathId: number
  title: string
}

export function LearningPathHeader({ learningPathId, title }: LearningPathHeaderProps) {
  const [hasAward, setHasAward] = useState(false)
  const [awardProgress, setAwardProgress] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    async function checkAward() {
      const status = await getAwardStatusForContent(learningPathId)

      if (status.hasAwards && status.awards.length > 0) {
        const award = status.awards[0]
        setHasAward(true)
        setAwardProgress(award.progressPercent)
        setIsCompleted(award.isCompleted)
      }
    }

    checkAward()
  }, [learningPathId])

  return (
    <header className="learning-path-header">
      <h1>{title}</h1>

      {hasAward && (
        <div className="award-indicator">
          {isCompleted ? (
            <span className="award-earned">
              🏆 Award Earned!
            </span>
          ) : (
            <span className="award-progress">
              Complete this path to earn an award ({awardProgress}%)
            </span>
          )}
        </div>
      )}
    </header>
  )
}
```

## Example 4: Lesson Completion Handler with Award Check

Integrate award checking into your lesson completion flow.

```tsx
import React, { useState } from 'react'
import { awardManager, awardEvents } from 'musora-content-services'
import type { AwardGrantedPayload } from 'musora-content-services'

interface LessonPlayerProps {
  lessonId: number
  courseId: number
}

export function LessonPlayer({ lessonId, courseId }: LessonPlayerProps) {
  const [showAwardPopup, setShowAwardPopup] = useState(false)
  const [earnedAward, setEarnedAward] = useState<AwardGrantedPayload | null>(null)

  useEffect(() => {
    // Listen for award granted events
    const unsubscribe = awardEvents.on('awardGranted', (payload: AwardGrantedPayload) => {
      setEarnedAward(payload)
      setShowAwardPopup(true)
    })

    return () => unsubscribe()
  }, [])

  const handleMarkComplete = async () => {
    try {
      // 1. Mark lesson as complete (your existing logic)
      await markLessonComplete(lessonId)

      // 2. Check for awards - this will emit 'awardGranted' event if earned
      await awardManager.onContentCompleted(courseId)

      // 3. Show success message
      toast.success('Lesson marked as complete!')
    } catch (error) {
      console.error('Failed to complete lesson:', error)
      toast.error('Something went wrong')
    }
  }

  return (
    <div className="lesson-player">
      {/* Your video player */}

      <button onClick={handleMarkComplete}>
        Mark as Complete
      </button>

      {/* Award popup modal */}
      {showAwardPopup && earnedAward && (
        <AwardPopupModal
          award={earnedAward.definition}
          completionData={earnedAward.completionData}
          onClose={() => setShowAwardPopup(false)}
        />
      )}
    </div>
  )
}

async function markLessonComplete(lessonId: number) {
  // Your existing completion logic
}
```

## Example 5: User Profile - Quick Award Stats

Show award statistics in user profile or dashboard.

```tsx
import React, { useEffect, useState } from 'react'
import { getAwardStatistics, getCompletedAwards } from 'musora-content-services'

export function UserProfileAwards() {
  const [stats, setStats] = useState({
    totalAvailable: 0,
    completedCount: 0,
    inProgressCount: 0,
    completionRate: 0
  })
  const [recentAwards, setRecentAwards] = useState([])

  useEffect(() => {
    async function loadAwardStats() {
      const statsData = await getAwardStatistics()
      const recent = await getCompletedAwards(3) // Get 3 most recent

      setStats(statsData)
      setRecentAwards(recent)
    }

    loadAwardStats()
  }, [])

  return (
    <div className="profile-awards">
      <h2>Awards</h2>

      <div className="award-summary">
        <div className="stat">
          <strong>{stats.completedCount}</strong>
          <span>Earned</span>
        </div>
        <div className="stat">
          <strong>{stats.inProgressCount}</strong>
          <span>In Progress</span>
        </div>
        <div className="stat">
          <strong>{stats.completionRate}%</strong>
          <span>Completion Rate</span>
        </div>
      </div>

      <div className="recent-awards">
        <h3>Recent Awards</h3>
        {recentAwards.map(award => (
          <div key={award.awardId} className="recent-award">
            <img src={award.badgeImage} alt={award.name} />
            <span>{award.name}</span>
          </div>
        ))}
      </div>

      <a href="/awards">View All Awards →</a>
    </div>
  )
}
```

## Example 6: Check Award Eligibility Before Showing UI

Check if a user has already earned an award before showing promotional content.

```tsx
import React, { useEffect, useState } from 'react'
import { hasCompletedAward } from 'musora-content-services'

interface CoursePromoProps {
  courseId: number
  awardId: string
}

export function CoursePromo({ courseId, awardId }: CoursePromoProps) {
  const [hasEarned, setHasEarned] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAward() {
      const earned = await hasCompletedAward(awardId)
      setHasEarned(earned)
      setLoading(false)
    }

    checkAward()
  }, [awardId])

  if (loading) return null

  return (
    <div className="course-promo">
      {hasEarned ? (
        <div className="already-earned">
          <span>✓ You've earned this award!</span>
          <a href={`/awards/${awardId}`}>View Certificate</a>
        </div>
      ) : (
        <div className="earn-award-cta">
          <h3>Earn an Award!</h3>
          <p>Complete all lessons in this course to earn a certificate.</p>
          <a href={`/courses/${courseId}`}>Start Course</a>
        </div>
      )}
    </div>
  )
}
```

## Example 7: Display Award Certificate

Use the certificate builder to show award certificates with all images and messages.

```tsx
import React, { useEffect, useState } from 'react'
import { buildCertificateData } from 'musora-content-services'
import type { CertificateData } from 'musora-content-services'

interface CertificatePageProps {
  awardProgressId: number
}

export function CertificatePage({ awardProgressId }: CertificatePageProps) {
  const [certificate, setCertificate] = useState<CertificateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCertificate() {
      setLoading(true)
      setError(null)
      try {
        const data = await buildCertificateData(awardProgressId)
        setCertificate(data)
      } catch (err) {
        console.error('Failed to load certificate:', err)
        setError('Failed to load certificate. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadCertificate()
  }, [awardProgressId])

  if (loading) {
    return <div className="certificate-loading">Loading certificate...</div>
  }

  if (error || !certificate) {
    return <div className="certificate-error">{error || 'Certificate not found'}</div>
  }

  return (
    <div className="certificate-container">
      {/* Header with ribbon */}
      <img src={certificate.ribbonImage} alt="Award Ribbon" className="ribbon" />

      {/* Certificate content */}
      <div className="certificate-content">
        <img src={certificate.musoraBgLogo} alt="" className="background-logo" />

        <h1>Certificate of Completion</h1>

        <p className="recipient">This certifies that</p>
        <h2 className="user-name">{certificate.userName}</h2>

        <p className="completion-message">{certificate.certificateMessage}</p>

        {/* Award images */}
        <div className="award-images">
          <img src={certificate.awardImage} alt="Certificate" className="certificate-image" />
          <img src={certificate.badgeImage} alt="Badge" className="badge-image" />
        </div>

        {/* Instructor signature */}
        {certificate.instructorSignature && (
          <div className="instructor-section">
            <img
              src={certificate.instructorSignature}
              alt="Signature"
              className="signature"
            />
            {certificate.instructorName && (
              <p className="instructor-name">{certificate.instructorName}</p>
            )}
          </div>
        )}

        {/* Brand logos */}
        <div className="logos">
          <img src={certificate.brandLogo} alt="Brand" className="brand-logo" />
          <img src={certificate.musoraLogo} alt="Musora" className="musora-logo" />
        </div>

        <p className="completion-date">
          Completed: {new Date(certificate.completedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Action buttons */}
      <div className="certificate-actions">
        <button onClick={() => window.print()}>Print Certificate</button>
        <button onClick={() => shareCertificate(certificate)}>Share</button>
      </div>
    </div>
  )
}

function shareCertificate(certificate: CertificateData) {
  // Implement sharing logic (social media, download, etc.)
  console.log('Sharing certificate:', certificate.awardTitle)
}
```

### Using Certificate Data Offline

The certificate builder works offline after the initial data sync:

```tsx
import { buildCertificateData } from 'musora-content-services'

// This will work offline because:
// 1. User data comes from backend (needs initial fetch)
// 2. Award definitions are cached from Sanity
// 3. Completion data is stored in local WatermelonDB
async function displayOfflineCertificate(awardProgressId: number) {
  try {
    const certificate = await buildCertificateData(awardProgressId)
    // All images URLs are returned, browser caching handles offline display
    return certificate
  } catch (error) {
    // Handle offline errors gracefully
    console.error('Certificate unavailable offline:', error)
  }
}
```

## Best Practices

1. **Always handle loading states** - Award data is fetched asynchronously from WatermelonDB
2. **Use error boundaries** - Wrap award components in error boundaries to prevent UI crashes
3. **Cache results when appropriate** - Store award status in component state to avoid re-fetching
4. **Listen for award events** - Use `awardEvents.on('awardGranted', ...)` to show real-time popups
5. **Check completion before promotion** - Use `hasCompletedAward()` to avoid showing duplicate awards
6. **Combine with loading skeletons** - Show skeleton UIs while award data loads

## Performance Tips

- Use `limit` parameter when fetching large lists of awards
- The award query API reads from local WatermelonDB (very fast, no network calls)
- Award definitions are cached by default (5-minute cache)
- All functions are async but typically resolve in <10ms from local storage

## Troubleshooting

### Awards not showing up
- Ensure sync is initialized: `SyncManager.getInstance()` must be called on app startup
- Check that award definitions are loaded: `awardManager.refreshDefinitions()`
- Verify the content has associated awards in Sanity CMS

### Progress percentage is 0
- User may not have started the course yet
- Check if `contentProgress` records exist for the course lessons
- Award progress is calculated from completed child lessons

### Event not firing
- Make sure to call `awardManager.onContentCompleted(courseId)` after marking content complete
- Verify event listener is registered before the completion action
- Check console for error messages during award check
