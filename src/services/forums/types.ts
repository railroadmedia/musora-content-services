export interface ForumUser {
  id: number
  display_name: string
  profile_picture_url: string | null
}

export interface ForumPost {
  id: number
  content: string
  created_at: string
  created_at_human: string
  author: ForumUser | null
  like_count: number
  is_liked: boolean
}

export interface ForumThread {
  id: number
  slug: string
  title: string
  locked: boolean
  pinned: boolean
  state: string
  author: ForumUser | null
  category_id: number
  post_count: number
  last_post: ForumPost | null
  is_read: boolean
}

export interface ForumThread {
  id: number
  slug: string
  title: string
  locked: boolean
  pinned: boolean
  state: string
  author: ForumUser | null
  category_id: number
  post_count: number
  last_post: ForumPost | null
}

export interface ForumCategory {
  id: number
  brand: string
  title: string
  description: string
  icon: string | null
  threads_count: number
  last_post: ForumPost | null
}
