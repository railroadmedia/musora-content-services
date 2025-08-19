/**
 * @typedef {object} BrandMethodLevels
 * @property {string} drumeo
 * @property {string} pianote
 * @property {string} guitareo
 * @property {string} singeo
 */

/**
 * @typedef {object} BrandTotalXp
 * @property {string} drumeo
 * @property {string} pianote
 * @property {string} guitareo
 * @property {string} singeo
 */

/**
 * @typedef {object} BrandTimePracticed
 * @property {number} drumeo
 * @property {number} pianote
 * @property {number} guitareo
 * @property {number} singeo
 */

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} email
 * @property {string} display_name
 * @property {string} first_name
 * @property {string} last_name
 * @property {string|null} gender
 * @property {string} country
 * @property {string|null} region
 * @property {string|null} city
 * @property {string} birthday
 * @property {string|null} phone_number
 * @property {string} profile_picture_url
 * @property {string} timezone
 * @property {string} permission_level
 * @property {string} last_used_brand
 * @property {string} membership_level
 * @property {string|null} membership_start_date
 * @property {string} membership_expiration_date
 * @property {number} is_lifetime_member
 * @property {string|null} revenuecat_origin_app_user_id
 * @property {number} is_drumeo_lifetime_member
 * @property {string} access_level
 * @property {number} total_xp
 * @property {BrandMethodLevels} brand_method_levels
 * @property {BrandTotalXp} brand_total_xp
 * @property {BrandTimePracticed} brand_minutes_practiced
 * @property {BrandTimePracticed} brand_seconds_practiced
 * @property {number|null} guitar_playing_since_year
 * @property {number} drumeo_onboarding_skip_setup
 * @property {number} pianote_onboarding_skip_setup
 * @property {number} guitareo_onboarding_skip_setup
 * @property {number} singeo_onboarding_skip_setup
 * @property {number} drumeo_trial_section_hide
 * @property {number} pianote_trial_section_hide
 * @property {number} guitareo_trial_section_hide
 * @property {number} singeo_trial_section_hide
 * @property {number} notify_on_lesson_comment_like
 * @property {number|null} notifications_summary_frequency_minutes
 * @property {number} notify_on_forum_post_reply
 * @property {number} notify_on_forum_followed_thread_reply
 * @property {number} notify_on_forum_post_like
 * @property {number} notify_weekly_update
 * @property {number} notify_on_lesson_comment_reply
 * @property {number|null} challenges_enrollment_notifications
 * @property {number|null} challenges_community_notifications
 * @property {number|null} challenges_solo_notifications
 * @property {number} send_mobile_app_push_notifications
 * @property {number} send_email_notifications
 * @property {number} use_legacy_video_player
 * @property {number} drumeo_ship_magazine
 * @property {string|null} magazine_shipping_address_id
 * @property {string|null} ios_latest_review_display_date
 * @property {number} ios_count_review_display
 * @property {string|null} google_latest_review_display_date
 * @property {number} google_count_review_display
 * @property {string|null} biography
 * @property {string|null} support_note
 * @property {string} created_at
 * @property {string} updated_at
 * @property {number} is_pack_owner
 * @property {number} has_recharge_subscription
 * @property {string|null} recharge_interval
 * @property {number} has_apple_subscription
 * @property {number} has_google_subscription
 * @property {number} requires_password_update
 * @property {number} cio_synced_workspaces
 * @property {string|null} recharge_renewal_date
 * @property {string|null} trial_expiration_date
 * @property {number} is_trial
 * @property {string|null} legacy_expiration_date
 * @property {boolean} needs_logout
 * @property {string} primary_brand
 * @property {string} first_access_at
 * @property {number} is_challenge_owner
 * @property {boolean} login_as_users
 */

/**
 * @typedef {Object} AuthResponse
 * @property {string} token
 * @property {User} user
 */

/**
 * @typedef {Object} UserPermissions
 *
 * @property {string[]} permissions
 * @property {boolean} isAdmin
 * @property {boolean} isABasicMember
 */

/**
 * @typedef {Object} StreakDTO
 *
 * @property {string} type - week or day
 * @property {number} length
 * @property {Date|null} start_date
 * @property {Date|null} end_date
 */

/**
 * @typedef {Object} OtherStatsDTO
 *
 * @property {StreakDTO} longest_day_streak
 * @property {StreakDTO} longest_week_streak
 * @property {number} total_practice_time
 * @property {number} comment_likes
 * @property {number} forum_post_likes
 * @property {number} experience_points
 */

/**
 * @typedef {Object} BlockedUsersDTO
 *
 * @property {number} id
 * @property {string} display_name
 * @property {string|null} profile_picture_url
 */
