/**
 * @namespace Forums
 * @property {module:Categories} Categories
 * @property {module:Threads} Threads
 */
import { Either } from '../../core/types/ads/either'
import { HttpClient } from '../../infrastructure/http/HttpClient'
import { HttpError } from '../../infrastructure/http/interfaces/HttpError'
import { PaginatedResponse } from '../api/types'
import { ForumThread } from './types'

const baseUrl = `/api/forums`

export async function getActiveDiscussions(
  brand: string,
  { page = 1, limit = 10 } = {}
): Promise<Either<HttpError, TransformedResponse>> {
  return HttpClient.client()
    .get<PaginatedResponse<ForumThread>>(
      `${baseUrl}/v1/threads/latest?brand=${brand}&page=${page}&limit=${limit}`
    )
    .then((r) => r.map(transformLatestDiscussions))
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
        url: `forums/threads/${thread.category_id}/${thread.id}`,
        title: thread.title,
        post: postContent,
        postId:postId,
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
