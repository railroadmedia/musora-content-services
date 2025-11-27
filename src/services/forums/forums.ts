import { HttpClient } from '../../infrastructure/http/HttpClient'
import { PaginatedResponse } from '../api/types'
import { ForumThread } from './types'
import { globalConfig } from '../config.js'

const baseUrl = `/api/forums`

/**
 * @namespace Forums
 * @property {module:Categories} Categories
 * @property {module:Threads} Threads
 */

export async function getActiveDiscussions(brand: string, { page = 1, limit = 10 } = {}) {
  const httpClient = new HttpClient(globalConfig.baseUrl)
  const latestDiscussions = await httpClient.get<PaginatedResponse<ForumThread>>(
    `${baseUrl}/v1/threads/latest?brand=${brand}&page=${page}&limit=${limit}`
  )

  // Transform the response
  return transformLatestDiscussions(latestDiscussions)
}

interface TransformedDiscussion {
  id: number
  url: string
  title: string
  post: string
  author: {
    id: number
    name: string
    avatar: string
  }
}

interface TransformedResponse {
  data: TransformedDiscussion[]
  meta: PaginatedResponse<ForumThread>['meta']
}

// Helper function to strip HTML tags and decode entities
function stripHtml(html: string): string {
  // Remove blockquotes and their content first
  let filtered = html.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '')

  // Remove iframes and their content
  filtered = filtered.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')

  // Remove remaining HTML tags
  const withoutTags = filtered.replace(/<[^>]*>/g, '')

  // Decode common HTML entities
  const decoded = withoutTags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')

  return decoded.trim()
}

function transformLatestDiscussions(response: PaginatedResponse<ForumThread>): TransformedResponse {
  const transformedData = response.data
    .filter((thread) => thread.last_post && thread.author) // Filter out null posts/authors
    .map((thread) => {
      const postContent = stripHtml(thread.last_post!.content)
      const postId = thread.last_post!.id

      return {
        id: thread.id,
        url: `forums/post/${postId}`,
        title: thread.title,
        post: postContent,
        author: {
          id: thread.author!.id,
          name: thread.author!.display_name,
          avatar: thread.author!.profile_picture_url || '',
        },
      }
    })

  return {
    data: transformedData,
    meta: response.meta,
  }
}
