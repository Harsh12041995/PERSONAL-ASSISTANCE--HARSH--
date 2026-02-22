import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchMenuItems, MenuItem } from '../../services/menuService';
import { projectService } from '../../services/projectService';
import { SearchIcon, CommandIcon, MenuIcon, FolderIcon, UserIcon, SettingsIcon, GridIcon } from '../../icons';

interface SearchResult {
  id: string;
  type: 'menu' | 'project' | 'action';
  title: string;
  subtitle?: string;
  icon: string;
  path?: string;
  action?: () => void;
  category: string;
  priority: number;
}

interface SearchGroup {
  title: string;
  results: SearchResult[];
}

const HeaderSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load menu items and projects on mount
  useEffect(() => {
    if (user) {
      loadMenuItems();
      loadProjects();
    }
  }, [user]);

  // Load menu items from backend
  const loadMenuItems = async () => {
    try {
      const items = await fetchMenuItems();
      setMenuItems(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Failed to load menu items:', error);
      setMenuItems([]);
    }
  };

  // Load projects from backend
  const loadProjects = async () => {
    try {
      const response = await projectService.getProjects({ limit: 100 });
      setProjects(response.data?.projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    }
  };

  // Search through all data sources
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const query = searchQuery.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search through menu items
    const menuResults = searchMenuItems(query);
    searchResults.push(...menuResults);

    // Search through projects
    const projectResults = searchProjects(query);
    searchResults.push(...projectResults);

    // Add quick actions
    const actionResults = getQuickActions(query);
    searchResults.push(...actionResults);

    // Group results by category
    const groupedResults = groupResults(searchResults);
    setResults(groupedResults);
    setSelectedIndex(0);
    setLoading(false);
  }, [menuItems, projects]);

  // Search through menu items
  const searchMenuItems = (query: string): SearchResult[] => {
    const results: SearchResult[] = [];
    
    const searchInMenu = (items: MenuItem[], parentName = ''): void => {
      items.forEach(item => {
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesPath = item.path?.toLowerCase().includes(query);
        
        if (matchesName || matchesPath) {
          results.push({
            id: `menu-${item.id}`,
            type: 'menu',
            title: item.name,
            subtitle: parentName || 'Menu Item',
            icon: item.icon || 'MenuIcon',
            path: item.path,
            category: 'Navigation',
            priority: 1
          });
        }
        
        if (item.subItems && item.subItems.length > 0) {
          searchInMenu(item.subItems, item.name);
        }
      });
    };

    searchInMenu(menuItems);
    return results;
  };

  // Search through projects
  const searchProjects = (query: string): SearchResult[] => {
    return projects
      .filter(project => {
        const projectName = project.projectName?.toLowerCase() || project.name?.toLowerCase() || '';
        const projectId = project.projectId?.toLowerCase() || '';
        return projectName.includes(query) || projectId.includes(query);
      })
      .map(project => ({
        id: `project-${project._id || project.id}`,
        type: 'project',
        title: project.projectName || project.name || 'Unnamed Project',
        subtitle: `Project ID: ${project.projectId || 'N/A'}`,
        icon: 'FolderIcon',
        path: `/projects/${project._id || project.id}`,
        category: 'Projects',
        priority: 2
      }));
  };

  // Get quick actions
  const getQuickActions = (query: string): SearchResult[] => {
    const actions: SearchResult[] = [
      {
        id: 'action-dashboard',
        type: 'action',
        title: 'Go to Dashboard',
        subtitle: 'Navigate to main dashboard',
        icon: 'GridIcon',
        path: '/dashboard',
        category: 'Quick Actions',
        priority: 3
      },
      {
        id: 'action-profile',
        type: 'action',
        title: 'Edit Profile',
        subtitle: 'Update your profile information',
        icon: 'UserIcon',
        path: '/profile',
        category: 'Quick Actions',
        priority: 3
      },
      {
        id: 'action-settings',
        type: 'action',
        title: 'Settings',
        subtitle: 'Application settings and preferences',
        icon: 'SettingsIcon',
        path: '/settings',
        category: 'Quick Actions',
        priority: 3
      }
    ];

    return actions.filter(action => 
      action.title.toLowerCase().includes(query) || 
      action.subtitle.toLowerCase().includes(query)
    );
  };

  // Group results by category
  const groupResults = (results: SearchResult[]): SearchGroup[] => {
    const groups = new Map<string, SearchResult[]>();
    
    results.forEach(result => {
      if (!groups.has(result.category)) {
        groups.set(result.category, []);
      }
      groups.get(result.category)!.push(result);
    });

    return Array.from(groups.entries())
      .map(([title, results]) => ({
        title,
        results: results.sort((a, b) => a.priority - b.priority)
      }))
      .sort((a, b) => {
        const priorityA = Math.min(...a.results.map(r => r.priority));
        const priorityB = Math.min(...b.results.map(r => r.priority));
        return priorityA - priorityB;
      });
  };

  // Handle search input changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalResults = results.reduce((sum, group) => sum + group.results.length, 0);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalResults);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + totalResults) % totalResults);
        break;
      case 'Enter':
        e.preventDefault();
        executeSelectedResult();
        break;
      case 'Escape':
        e.preventDefault();
        closeSearch();
        break;
    }
  };

  // Execute the selected search result
  const executeSelectedResult = () => {
    let currentIndex = 0;
    
    for (const group of results) {
      for (const result of group.results) {
        if (currentIndex === selectedIndex) {
          if (result.path) {
            navigate(result.path);
          } else if (result.action) {
            result.action();
          }
          closeSearch();
          return;
        }
        currentIndex++;
      }
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    if (result.path) {
      navigate(result.path);
    } else if (result.action) {
      result.action();
    }
    closeSearch();
  };

  // Open search modal
  const openSearch = () => {
    setIsOpen(true);
    setQuery('');
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Close search modal
  const closeSearch = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setSelectedIndex(0);
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        closeSearch();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Get icon component
  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      SearchIcon,
      CommandIcon,
      MenuIcon,
      FolderIcon,
      UserIcon,
      SettingsIcon,
      GridIcon
    };
    
    const IconComponent = iconMap[iconName] || MenuIcon;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={openSearch}
        className="relative flex items-center justify-center w-10 h-10 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 lg:h-11 lg:w-11"
        title="Search (⌘K)"
      >
        <SearchIcon className="w-5 h-5" />
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/50">
          <div
            ref={searchRef}
            className="w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-700"
          >
            {/* Search Input */}
            <div className="relative p-4 border-b border-gray-200 dark:border-gray-700">
              <SearchIcon className="absolute left-6 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search menus, projects, or actions..."
                className="w-full pl-12 pr-20 py-3 text-lg bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 dark:text-white dark:placeholder-gray-400"
                autoComplete="off"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2 text-xs text-gray-400">
                <span className="hidden sm:inline">⌘K</span>
                {loading && (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                )}
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto">
              {results.length === 0 && query && !loading ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <SearchIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No results found</p>
                  <p className="text-sm">Try searching with different keywords</p>
                </div>
              ) : results.length === 0 && !query ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <SearchIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Search for anything</p>
                  <p className="text-sm">Menus, projects, actions, and more</p>
                </div>
              ) : (
                results.map((group, groupIndex) => (
                  <div key={group.title} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                      {group.title}
                    </div>
                    {group.results.map((result, resultIndex) => {
                      const globalIndex = results
                        .slice(0, groupIndex)
                        .reduce((sum, g) => sum + g.results.length, 0) + resultIndex;
                      
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                            globalIndex === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400">
                              {getIconComponent(result.icon)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {result.title}
                              </div>
                              {result.subtitle && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {result.subtitle}
                                </div>
                              )}
                            </div>
                            <div className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                              {result.type === 'menu' && 'Menu'}
                              {result.type === 'project' && 'Project'}
                              {result.type === 'action' && 'Action'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span>Use ↑↓ to navigate, Enter to select, Esc to close</span>
                <span>⌘K to open search</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderSearch;
