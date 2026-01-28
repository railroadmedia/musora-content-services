export interface BrandMethodLevels {
  drumeo: string
  pianote: string
  guitareo: string
  singeo: string
}

export interface BrandTimePracticed {
  drumeo: number
  pianote: number
  guitareo: number
  singeo: number
}

export interface User {
  id: number
  email: string
  display_name: string
  first_name: string
  last_name: string
  gender: string | null
  country: string
  region: string | null
  city: string | null
  birthday: string
  phone_number: string | null
  profile_picture_url: string
  timezone: string
  permission_level: string
  last_used_brand: string
  membership_level: string
  membership_start_date: string | null
  membership_expiration_date: string
  is_lifetime_member: number
  revenuecat_origin_app_user_id: string | null
  is_drumeo_lifetime_member: number
  access_level: string
  brand_method_levels: BrandMethodLevels
  brand_minutes_practiced: BrandTimePracticed
  brand_seconds_practiced: BrandTimePracticed
  brand_pinned_progress: Record<string, number[]>
  guitar_playing_since_year: number | null
  drumeo_onboarding_skip_setup: number
  pianote_onboarding_skip_setup: number
  guitareo_onboarding_skip_setup: number
  singeo_onboarding_skip_setup: number
  drumeo_trial_section_hide: number
  pianote_trial_section_hide: number
  guitareo_trial_section_hide: number
  singeo_trial_section_hide: number
  notify_on_lesson_comment_like: number
  notifications_summary_frequency_minutes: number | null
  notify_on_forum_post_reply: number
  notify_on_forum_followed_thread_reply: number
  notify_on_forum_post_like: number
  notify_weekly_update: number
  notify_on_lesson_comment_reply: number
  challenges_enrollment_notifications: number | null
  challenges_community_notifications: number | null
  challenges_solo_notifications: number | null
  send_mobile_app_push_notifications: number
  send_email_notifications: number
  use_legacy_video_player: number
  use_student_view: boolean
  show_admin_toggle: boolean
  drumeo_ship_magazine: number
  magazine_shipping_address_id: string | null
  ios_latest_review_display_date: string | null
  ios_count_review_display: number
  google_latest_review_display_date: string | null
  google_count_review_display: number
  biography: string | null
  support_note: string | null
  created_at: string
  updated_at: string
  is_pack_owner: number
  has_recharge_subscription: number
  recharge_interval: string | null
  has_apple_subscription: number
  has_google_subscription: number
  requires_password_update: number
  cio_synced_workspaces: number
  recharge_renewal_date: string | null
  trial_expiration_date: string | null
  is_trial: number
  legacy_expiration_date: string | null
  needs_logout: boolean
  primary_brand: string
  first_access_at: string
  is_challenge_owner: number
  login_as_users: boolean
}

export interface AuthResponse {
  token: string
  user: User
}

export interface UserPermissions {
  permissions: string[]
  isAdmin: boolean
  isABasicMember: boolean
}

export interface StreakDTO {
  type: 'week' | 'day'
  length: number
  start_date: Date | null
  end_date: Date | null
}

export interface OtherStatsDTO {
  longest_day_streak: StreakDTO
  longest_week_streak: StreakDTO
  total_practice_time: number
  comment_likes: number
  forum_post_likes: number
  experience_points: number
}

export interface BlockedUserDTO {
  id: number
  display_name: string
  profile_picture_url: string | null
}
