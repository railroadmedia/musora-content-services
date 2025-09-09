import { LikesRepository } from './sync/repositories'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

export async function isContentLiked(contentId) {
  return (await LikesRepository.create().isLikedOptimistic(contentId)).data
}

export async function isContentLikedByIds(contentIds) {
  const existences = (await LikesRepository.create().areLikedOptimistic(contentIds)).data
  return Object.fromEntries(contentIds.map((id, i) => [id, existences[i]]))
}

export async function likeContent(contentId) {
  return await LikesRepository.create().like(contentId)
}

export async function unlikeContent(contentId) {
  return await LikesRepository.create().unlike(contentId)
}
