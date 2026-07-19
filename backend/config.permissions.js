const PERMISSION_CATALOG = [
  { id: 'tasks', name: 'Task Management', category: 'core' },
  { id: 'finance', name: 'Finance Tracker', category: 'core' },
  { id: 'ai_chat', name: 'AI Assistant', category: 'core' },
  { id: 'calendar', name: 'Calendar', category: 'core' },
  { id: 'social', name: 'Social Manager', category: 'integration' },
  { id: 'command_center', name: 'Command Center (HQ)', category: 'business' },
  { id: 'portfolio', name: 'Portfolio', category: 'business' },
  { id: 'marketing', name: 'Marketing', category: 'business' },
  { id: 'blogs', name: 'Blogs', category: 'business' },
  { id: 'security', name: 'Security Center', category: 'admin' },
  { id: 'admin', name: 'Admin Tools', category: 'admin' },
  { id: 'user_management', name: 'User Management', category: 'admin' }
];

const PERMISSION_IDS = PERMISSION_CATALOG.map((item) => item.id);

module.exports = {
  PERMISSION_CATALOG,
  PERMISSION_IDS
};
