/**
 * @module Awards
 *
 * @description
 * Query award progress, listen for award events, and generate certificates.
 *
 * **Query Functions** (read-only):
 * - `getContentAwards(contentId)` - Get awards for a learning path/course
 * - `getContentAwardsByIds(contentIds)` - Get awards for multiple content items (batch optimized)
 * - `getCompletedAwards(brand)` - Get user's earned awards
 * - `getInProgressAwards(brand)` - Get awards user is working toward
 * - `getAwardStatistics(brand)` - Get aggregate award stats
 *
 * **Event Callbacks**:
 * - `registerAwardCallback(fn)` - Listen for new awards earned
 * - `registerProgressCallback(fn)` - Listen for progress updates
 *
 * **Certificates**:
 * - `fetchCertificate(awardId)` - Generate certificate (Web only)
 *
 * @example Quick Start
 * import {
 *   getContentAwards,
 *   getCompletedAwards,
 *   registerAwardCallback
 * } from 'musora-content-services'
 *
 * // Show awards for a learning path
 * const { hasAwards, awards } = await getContentAwards(learningPathId)
 *
 * // Get user's completed awards
 * const completed = await getCompletedAwards('drumeo')
 *
 * // Listen for new awards (show notification)
 * useEffect(() => {
 *   return registerAwardCallback((award) => {
 *     showCelebration(award.name, award.badge, award.completion_data.message)
 *   })
 * }, [])
 *
 * @example How Awards Update (Collection Context)
 * // Award progress updates automatically when you save content progress.
 * // CRITICAL: Pass collection context when inside a learning path!
 *
 * import { contentStatusCompleted } from 'musora-content-services'
 *
 * // Correct - passes collection context
 * const collection = { type: 'learning-path-v2', id: learningPathId }
 * await contentStatusCompleted(lessonId, collection)
 *
 * // Wrong - no collection context (affects wrong awards!)
 * await contentStatusCompleted(lessonId, null)
 */

import './types.js'
import { awardDefinitions } from './internal/award-definitions'
import { AwardMessageGenerator } from './internal/message-generator'
import db from '../sync/repository-proxy'
import UserAwardProgressRepository from '../sync/repositories/user-award-progress'
import {awardTemplate} from "../../contentTypeConfig.js";

function enhanceCompletionData(completionData) {
  if (!completionData) return null

  return {
    ...completionData,
    message: AwardMessageGenerator.generatePopupMessage(completionData)
  }
}

/**
 * @param {number} contentId - Railcontent ID of the content item (lesson, course, or learning path)
 * @returns {Promise<ContentAwardsResponse>} Status object with award information
 *
 * @description
 * Returns awards associated with a content item and the user's progress toward each.
 * Use this to display award progress on learning path or course detail pages.
 *
 * - Pass a **learning path ID** to get awards for that learning path
 * - Pass a **course ID** to get awards for that course
 * - Pass a **lesson ID** to get all awards that include that lesson in their requirements
 *
 * Returns `{ hasAwards: false, awards: [] }` on error (never throws).
 *
 * @example // Display award card on learning path detail page
 * function LearningPathAwardCard({ learningPathId }) {
 *   const [awardData, setAwardData] = useState({ hasAwards: false, awards: [] })
 *
 *   useEffect(() => {
 *     getContentAwards(learningPathId).then(setAwardData)
 *   }, [learningPathId])
 *
 *   if (!awardData.hasAwards) return null
 *
 *   const award = awardData.awards[0] // Learning paths typically have one award
 *   return (
 *     <AwardCard
 *       badge={award.badge}
 *       title={award.awardTitle}
 *       progress={award.progressPercentage}
 *       isCompleted={award.isCompleted}
 *       completedAt={award.completedAt}
 *       instructorName={award.instructorName}
 *     />
 *   )
 * }
 *
 * @example // Check award status before showing certificate button
 * const { hasAwards, awards } = await getContentAwards(learningPathId)
 * const completedAward = awards.find(a => a.isCompleted)
 * if (completedAward) {
 *   showCertificateButton(completedAward.awardId)
 * }
 */
export async function getContentAwards(contentId) {
  try {
    const hasAwards = await awardDefinitions.hasAwards(contentId)

    if (!hasAwards) {
      return {
        hasAwards: false,
        awards: []
      }
    }

    const data = await db.userAwardProgress.getAwardsForContent(contentId)

    const awards = data && data.definitions.length !== 0
      ? defineAwards(data)
      : []

    return {
      hasAwards: awards.length > 0,
      awards,
    }

  } catch (error) {
    console.error(`Failed to get award status for content ${contentId}:`, error)
    return {
      hasAwards: false,
      awards: []
    }
  }
}

/**
 * @param {number[]} contentIds - Array of Railcontent IDs to fetch awards for
 * @returns {Promise<Object.<number, ContentAwardsResponse>>} Object mapping content IDs to their award data
 *
 * @description
 * Returns awards for multiple content items at once. More efficient than calling
 * `getContentAwards()` multiple times. Returns an object where keys are content IDs
 * and values are the same structure as `getContentAwards()`.
 *
 * Content IDs without awards will have `{ hasAwards: false, awards: [] }` in the result.
 *
 * Returns empty object `{}` on error (never throws).
 *
 * @example
 * const learningPathIds = [12345, 67890, 11111]
 * const awardsMap = await getContentAwardsByIds(learningPathIds)
 *
 * learningPathIds.forEach(id => {
 *   const { hasAwards, awards } = awardsMap[id] || { hasAwards: false, awards: [] }
 *   if (hasAwards) {
 *     console.log(`Learning path ${id} has ${awards.length} award(s)`)
 *   }
 * })
 *
 * @example
 * function CourseListWithAwards({ courseIds }) {
 *   const [awardsMap, setAwardsMap] = useState({})
 *
 *   useEffect(() => {
 *     getContentAwardsByIds(courseIds).then(setAwardsMap)
 *   }, [courseIds])
 *
 *   return courseIds.map(courseId => {
 *     const { hasAwards, awards } = awardsMap[courseId] || { hasAwards: false, awards: [] }
 *     return (
 *       <CourseCard key={courseId} courseId={courseId}>
 *         {hasAwards && <AwardBadge award={awards[0]} />}
 *       </CourseCard>
 *     )
 *   })
 * }
 */
export async function getContentAwardsByIds(contentIds) {
  try {
    if (!Array.isArray(contentIds) || contentIds.length === 0) {
      return {}
    }

    const awardsDataMap = await db.userAwardProgress.getAwardsForContentMany(contentIds)

    const result = {}

    contentIds.forEach(contentId => {
      const data = awardsDataMap.get(contentId) // {definitions, progress}

      const awards = data && data.definitions.length !== 0
        ? defineAwards(data)
        : []

      result[contentId] = {
        hasAwards: awards.length > 0,
        awards,
      }
    })

    return result
  } catch (error) {
    console.error(`Failed to get award status for content IDs ${contentIds}:`, error)
    return {}
  }
}

function defineAwards(data) {
  return data.definitions.map(def => {
    const userProgress = data.progress.get(def._id)
    const completionData = enhanceCompletionData(userProgress?.completion_data)

    return {
      awardId: def._id,
      awardTitle: def.name,
      ...getBadgeFields(def),
      award: def.award,
      brand: def.brand,
      instructorName: def.instructor_name,
      progressPercentage: userProgress?.progress_percentage ?? 0,
      isCompleted: userProgress ? UserAwardProgressRepository.isCompleted(userProgress) : false,
      completedAt: userProgress?.completed_at,
      completionData
    }
  })
}

/**
 * @param {string} [brand=null] - Brand to filter by (drumeo, pianote, guitareo, singeo), or null for all brands
 * @param {AwardPaginationOptions} [options={}] - Optional pagination and filtering
 * @returns {Promise<AwardInfo[]>} Array of completed award objects sorted by completion date (newest first)
 *
 * @description
 * Returns all awards the user has completed. Use this for "My Achievements" or
 * profile award gallery screens. Each award includes:
 *
 * - Badge and award images for display
 * - Completion date for "Earned on X" display
 * - `completionData.message` - Pre-generated congratulations text
 * - `completionData.XXX` - other fields are award type dependant
 *
 * Returns empty array `[]` on error (never throws).
 *
 * @example // Awards gallery screen
 * function AwardsGalleryScreen() {
 *   const [awards, setAwards] = useState([])
 *   const brand = useBrand() // 'drumeo', 'pianote', etc.
 *
 *   useEffect(() => {
 *     getCompletedAwards(brand).then(setAwards)
 *   }, [brand])
 *
 *   return (
 *     <FlatList
 *       data={awards}
 *       keyExtractor={item => item.awardId}
 *       numColumns={2}
 *       renderItem={({ item }) => (
 *         <AwardBadge
 *           badge={item.badge}
 *           title={item.awardTitle}
 *           earnedDate={new Date(item.completedAt).toLocaleDateString()}
 *           onPress={() => showAwardDetail(item)}
 *         />
 *       )}
 *     />
 *   )
 * }
 *
 * @example // Show award detail with practice stats
 * function AwardDetailModal({ award }) {
 *   return (
 *     <Modal>
 *       <Image source={{ uri: award.award }} />
 *       <Text>{award.awardTitle}</Text>
 *       <Text>Instructor: {award.instructorName}</Text>
 *       <Text>Completed: {new Date(award.completedAt).toLocaleDateString()}</Text>
 *       <Text>Practice time: {award.completionData.practice_minutes} minutes</Text>
 *       <Text>Days practiced: {award.completionData.days_user_practiced}</Text>
 *       <Text>{award.completionData.message}</Text>
 *     </Modal>
 *   )
 * }
 *
 * @example // Paginated loading
 * const PAGE_SIZE = 12
 * const loadMore = async (page) => {
 *   const newAwards = await getCompletedAwards(brand, {
 *     limit: PAGE_SIZE,
 *     offset: page * PAGE_SIZE
 *   })
 *   setAwards(prev => [...prev, ...newAwards])
 * }
 */
export async function getCompletedAwards(brand = null, options = {}) {
  try {
    const allProgress = await db.userAwardProgress.getCompleted()

    const completed = allProgress.data.filter(p =>
      p.progress_percentage === 100 && p.completed_at !== null
    )
    let awards = await Promise.all(
      completed.map(async (progress) => {
        const definition = await awardDefinitions.getById(progress.award_id)
        if (!definition) {
          return null
        }

        if (brand && definition.brand !== brand) {
          return null
        }
        const completionData = definition.type === awardDefinitions.CONTENT_AWARD ? enhanceCompletionData(progress.completion_data) : progress.completion_data;
        const hasCertificate = definition.type === awardDefinitions.CONTENT_AWARD
        return {
          awardId: progress.award_id,
          awardTitle: definition.name,
          awardType: definition.type,
          ...getBadgeFields(definition),
          award: definition.award,
          brand: definition.brand,
          hasCertificate: hasCertificate,
          instructorName: definition.instructor_name,
          progressPercentage: progress.progress_percentage,
          isCompleted: true,
          completedAt: progress.completed_at,
          completionData
        }
      })
    )
    awards = awards.filter(award => award !== null)

    awards.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())

    if (options.limit) {
      const offset = options.offset || 0
      awards = awards.slice(offset, offset + options.limit)
    }
    return awards
  } catch (error) {
    console.error('Failed to get completed awards:', error)
    return []
  }
}

/**
 * @param {string} [brand=null] - Brand to filter by (drumeo, pianote, guitareo, singeo), or null for all brands
 * @param {AwardPaginationOptions} [options={}] - Optional pagination options
 * @returns {Promise<AwardInfo[]>} Array of in-progress award objects sorted by progress percentage (highest first)
 *
 * @description
 * Returns awards the user has started but not yet completed. Sorted by progress
 * percentage (highest first) so awards closest to completion appear first.
 * Use this for "Continue Learning" or dashboard widgets.
 *
 * Progress is calculated based on lessons completed within the correct collection
 * context. For learning paths, only lessons completed within that specific learning
 * path count toward its award.
 *
 * Returns empty array `[]` on error (never throws).
 *
 * @example // "Almost There" widget on home screen
 * function AlmostThereWidget() {
 *   const [topAwards, setTopAwards] = useState([])
 *   const brand = useBrand()
 *
 *   useEffect(() => {
 *     // Get top 3 closest to completion
 *     getInProgressAwards(brand, { limit: 3 }).then(setTopAwards)
 *   }, [brand])
 *
 *   if (topAwards.length === 0) return null
 *
 *   return (
 *     <View>
 *       <Text>Almost There!</Text>
 *       {topAwards.map(award => (
 *         <TouchableOpacity
 *           key={award.awardId}
 *           onPress={() => navigateToLearningPath(award)}
 *         >
 *           <Image source={{ uri: award.badge }} />
 *           <Text>{award.awardTitle}</Text>
 *           <ProgressBar progress={award.progressPercentage / 100} />
 *           <Text>{award.progressPercentage}% complete</Text>
 *         </TouchableOpacity>
 *       ))}
 *     </View>
 *   )
 * }
 *
 * @example // Full in-progress awards list
 * function InProgressAwardsScreen() {
 *   const [awards, setAwards] = useState([])
 *
 *   useEffect(() => {
 *     getInProgressAwards().then(setAwards)
 *   }, [])
 *
 *   return (
 *     <FlatList
 *       data={awards}
 *       keyExtractor={item => item.awardId}
 *       renderItem={({ item }) => (
 *         <AwardProgressCard
 *           badge={item.badge}
 *           title={item.awardTitle}
 *           progress={item.progressPercentage}
 *           brand={item.brand}
 *         />
 *       )}
 *     />
 *   )
 * }
 */
export async function getInProgressAwards(brand = null, options = {}) {
  try {
    const allProgress = await db.userAwardProgress.getAll()
    const inProgress = allProgress.data.filter(p =>
      p.progress_percentage >= 0 && (p.progress_percentage < 100 || p.completed_at === null)
    )

    let awards = await Promise.all(
      inProgress.map(async (progress) => {
        const definition = await awardDefinitions.getById(progress.award_id)

        if (!definition) {
          return null
        }

        if (brand && definition.brand !== brand) {
          return null
        }

        const completionData = enhanceCompletionData(progress.completion_data)

        return {
          awardId: progress.award_id,
          awardTitle: definition.name,
          ...getBadgeFields(definition),
          award: definition.award,
          brand: definition.brand,
          instructorName: definition.instructor_name,
          progressPercentage: progress.progress_percentage,
          isCompleted: false,
          completedAt: null,
          completionData
        }
      })
    )

    awards = awards.filter(award => award !== null)

    awards.sort((a, b) => b.progressPercentage - a.progressPercentage)

    if (options.limit) {
      const offset = options.offset || 0
      awards = awards.slice(offset, offset + options.limit)
    }

    return awards
  } catch (error) {
    console.error('Failed to get in-progress awards:', error)
    return []
  }
}

/**
 * @param {string} [brand=null] - Brand to filter by (drumeo, pianote, guitareo, singeo), or null for all brands
 * @returns {Promise<AwardStatistics>} Statistics object with award counts and completion percentage
 *
 * @description
 * Returns aggregate statistics about the user's award progress. Use this for
 * profile stats, gamification dashboards, or achievement summaries.
 *
 * Returns an object with:
 * - `totalAvailable` - Total awards that can be earned
 * - `completed` - Number of awards earned
 * - `inProgress` - Number of awards started but not completed
 * - `notStarted` - Number of awards not yet started
 * - `completionPercentage` - Overall completion % (0-100, one decimal)
 *
 * Returns all zeros on error (never throws).
 *
 * @example // Profile stats card
 * function ProfileStatsCard() {
 *   const [stats, setStats] = useState(null)
 *   const brand = useBrand()
 *
 *   useEffect(() => {
 *     getAwardStatistics(brand).then(setStats)
 *   }, [brand])
 *
 *   if (!stats) return <LoadingSpinner />
 *
 *   return (
 *     <View style={styles.statsCard}>
 *       <StatItem label="Awards Earned" value={stats.completed} />
 *       <StatItem label="In Progress" value={stats.inProgress} />
 *       <StatItem label="Available" value={stats.totalAvailable} />
 *       <ProgressRing
 *         progress={stats.completionPercentage / 100}
 *         label={`${stats.completionPercentage}%`}
 *       />
 *     </View>
 *   )
 * }
 *
 * @example // Achievement progress bar
 * const stats = await getAwardStatistics('drumeo')
 * return (
 *   <View>
 *     <Text>{stats.completed} of {stats.totalAvailable} awards earned</Text>
 *     <ProgressBar progress={stats.completionPercentage / 100} />
 *   </View>
 * )
 */
export async function getAwardStatistics(brand = null) {
  try {
    let allDefinitions = await awardDefinitions.getAll()

    if (brand) {
      allDefinitions = allDefinitions.filter(def => def.brand === brand)
    }

    const definitionIds = new Set(allDefinitions.map(def => def._id))

    const allProgress = await db.userAwardProgress.getAll()
    const filteredProgress = allProgress.data.filter(p => definitionIds.has(p.award_id))

    const completedCount = filteredProgress.filter(p =>
      p.progress_percentage === 100 && p.completed_at !== null
    ).length

    const inProgressCount = filteredProgress.filter(p =>
      p.progress_percentage >= 0 && (p.progress_percentage < 100 || p.completed_at === null)
    ).length

    const totalAvailable = allDefinitions.length
    const notStarted = totalAvailable - completedCount - inProgressCount

    return {
      totalAvailable,
      completed: completedCount,
      inProgress: inProgressCount,
      notStarted: notStarted > 0 ? notStarted : 0,
      completionPercentage: totalAvailable > 0
        ? Math.round((completedCount / totalAvailable) * 100 * 10) / 10
        : 0
    }
  } catch (error) {
    console.error('Failed to get award statistics:', error)
    return {
      totalAvailable: 0,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      completionPercentage: 0
    }
  }
}

/**
 * @returns {Promise<{ deletedCount: number }>}
 */
export async function resetAllAwards() {
  try {
    const result = await db.userAwardProgress.deleteAllAwards()
    return result
  } catch (error) {
    console.error('Failed to reset awards:', error)
    return { deletedCount: 0 }
  }
}

function getBadgeFields(def) {
  return {
    badge: def.is_active ? def.badge : null,
    badge_rear: def.is_active ? def.badge_rear : null,
    badge_logo: def.logo,
    badge_template: awardTemplate[def.brand].front,
    badge_template_rear: awardTemplate[def.brand].rear,
  }
}
