export interface UserPermissions {
  permissions: number[] // Array of permission IDs the user has access to
  isAdmin: boolean // Whether the user is an admin
  isModerator: boolean // Whether the user is a moderator
  isABasicMember: boolean // Whether the user has basic membership
}
