export const USER_ROLES = {
  USER: 'user',
  DEVELOPER: 'developer',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// List of developer emails for quick access control
export const DEVELOPER_EMAILS = ['marcminott@gmail.com'];

// Permissions for each role
export const ROLE_PERMISSIONS = {
  [USER_ROLES.USER]: [],
  [USER_ROLES.DEVELOPER]: [
    'access_developer_tools',
    'view_analytics',
    'export_data',
    'access_debug_info'
  ],
  [USER_ROLES.ADMIN]: [
    'manage_content',
    'view_analytics',
    'moderate_reviews',
    'moderate_comments'
  ],
  [USER_ROLES.SUPER_ADMIN]: [
    'manage_users',
    'access_developer_tools',
    'manage_system_settings',
    'view_analytics',
    'export_data',
    'manage_content',
    'moderate_reviews',
    'moderate_comments'
  ]
};