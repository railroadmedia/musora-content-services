/**
 * @module Awards
 */
import '../api/types.js'
import './types.js'

/**
 * Get awards for a specific user.
 *
 * @param {number|null} userId - The user ID. If not provided, the authenticated user is used instead.
 * @param {string|null} brand - Brand
 * @param {number|null} page - Page attribute for pagination
 * @param {number|null} limit - Limit how many items to return
 * @returns {Promise<PaginatedResponse<Award>>} - The awards for the user.
 */
export async function fetchAwardsForUser(userId, brand, page = 1, limit = 20) {
  // TODO: connect to the API to get the user awards
  return {
    data: [
      {
        id: 1,
        title: '30-Day Drummer',
        badge:
          'https://cdn.sanity.io/files/4032r8py/staging/5c7449ea40f09a096451a48e4a58e4452244e38d.png',
        date_completed: '2021-01-01',
        description:
          'You received this award for completing 30-Day Drummer with a perfect streak. You practiced a total of 123 minutes over the past 30 days.',
      },
      {
        id: 2,
        title: '30-Day Bass',
        badge:
          'https://cdn.sanity.io/files/4032r8py/production/b7efb6a2f0bd57e87dd13f85b1c3b0c876272b7c.png',
        date_completed: '2022-02-02',
        description:
          'You received this award for completing 30-Day Bass with a perfect streak. You practiced a total of 123 minutes over the past 30 days.',
      },
      {
        id: 3,
        title: 'New Piano Players Start Here',
        badge:
          'https://cdn.sanity.io/files/4032r8py/staging/94e663015da362b41695f5d6f3a8ca3f8317e1b5.png',
        date_completed: '2023-03-03',
        description:
          'You received this award for completing New Piano Players Start Here with a perfect streak. You practiced a total of 123 minutes over the past 30 days.',
      },
      {
        id: 4,
        title: 'Ear Training For Singers',
        badge:
          'https://cdn.sanity.io/files/4032r8py/staging/24fc36e8351d7994bfe8fb5c63c577cf5ed16dc9.png',
        date_completed: '2024-04-04',
        description:
          'You received this award for completing Ear Training For Singers with a perfect streak. You practiced a total of 123 minutes over the past 30 days.',
      },
    ],
    meta: {
      current_page: 1,
      from: 1,
      to: 15,
      per_page: 15,
      last_page: 1,
      total: 4,
      path: 'to be implemented when BE is ready',
    },
    links: {
      first: 'to be implemented when BE is ready',
      last: 'to be implemented when BE is ready',
      next: 'to be implemented when BE is ready',
      prev: 'to be implemented when BE is ready',
    },
  }
}
