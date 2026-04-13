export interface UserPermissions {
  permissions: string[] // Array of permission IDs the user has access to
  isAdmin: boolean // Whether the user is an admin
  isModerator: boolean // Whether the user is a moderator
  isABasicMember: boolean // Whether the user has basic membership
  membershipTier: UserMembershipTier // User's membership tier ('plus', 'basic', 'free')
}

export type UserMembershipTier = 'plus' | 'basic' | 'free'
