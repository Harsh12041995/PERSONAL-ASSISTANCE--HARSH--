export const FEATURE_PERMISSION_MAP: Record<string, string> = {
  '/capture': 'tasks',
  '/personal-tasks': 'tasks',
  '/calendar': 'calendar',
  '/finance': 'finance',
  '/knowledge': 'tasks',
  '/goals': 'tasks',
  '/health': 'tasks',
  '/career': 'tasks',
  '/social': 'social',
  '/blogs': 'blogs',
  '/workflow-manager': 'social',
  '/ai-chat': 'ai_chat',
  '/hq': 'ai_chat',
  '/portfolio': 'tasks',
  '/settings': 'tasks',
  '/profile': 'tasks',
  '/admin/users': 'user_management',
  '/admin/permission-matrix': 'user_management'
};

export const isRouteAllowedByPermission = (
  route: string,
  hasFeatureAccess: (permissionId: string) => boolean
): boolean => {
  const permission = FEATURE_PERMISSION_MAP[route];
  if (!permission) return true;
  return hasFeatureAccess(permission);
};
