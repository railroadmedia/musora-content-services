import { postDataHandler } from './railcontent.js'

/**
 * Exported functions that are excluded from index generation.
 *
 * @type {string[]}
 */
const excludeFromGeneratedIndex = []

export async function login(payload) {
  let url = `/user-management-system/login/token`
  return await postDataHandler(url, payload)
}

