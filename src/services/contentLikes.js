import { db } from './sync'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

export async function isContentLiked(contentId) {
  return (await db.likes.isLikedOptimistic(contentId)).data
}

export async function isContentLikedByIds(contentIds) {
  const existences = await db.likes.areLikedOptimistic(contentIds)
  return Object.fromEntries(contentIds.map((id, i) => [id, existences.data[i]]))
}

export async function likeContent(contentId) {
  return db.likes.likeOptimistic(contentId)
}

export async function unlikeContent(contentId) {
  return db.likes.unlikeOptimistic(contentId)
}
