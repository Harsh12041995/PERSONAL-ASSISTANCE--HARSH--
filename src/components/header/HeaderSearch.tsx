import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  const [_loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const navigate = useNavigate();
  const { user } = useAuth();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const q = searchQuery.toLowerCase();

    // Simple quick actions search
    const actions: SearchResult[] = [
      { id: 'h', type: 'action' as "action", title: 'Home', subtitle: 'Go to dashboard', icon: 'GridIcon', path: '/', category: 'Quick Actions', priority: 1 },
      { id: 'c', type: 'action' as "action", title: 'Capture', subtitle: 'Quick thought', icon: 'CommandIcon', path: '/capture', category: 'Quick Actions', priority: 1 },
      { id: 's', type: 'action' as "action", title: 'Settings', subtitle: 'App preferences', icon: 'SettingsIcon', path: '/settings', category: 'Quick Actions', priority: 1 },
      { id: 't', type: 'action' as "action", title: 'Tasks', subtitle: 'Management', icon: 'MenuIcon', path: '/personal-tasks', category: 'Quick Actions', priority: 1 },
    ].filter(a => a.title.toLowerCase().includes(q) || a.subtitle?.toLowerCase().includes(q));

    const groups: SearchGroup[] = actions.length > 0 ? [{ title: 'Quick Actions', results: actions }] : [];
    setResults(groups);
    setSelectedIndex(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalResults = results.reduce((sum, group) => sum + group.results.length, 0);
    if (!totalResults) return;

    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setSelectedIndex(p => (p + 1) % totalResults); break;
      case 'ArrowUp': e.preventDefault(); setSelectedIndex(p => (p - 1 + totalResults) % totalResults); break;
      case 'Enter': e.preventDefault(); executeSelected(); break;
      case 'Escape': e.preventDefault(); setIsOpen(false); break;
    }
  };

  const executeSelected = () => {
    let count = 0;
    for (const g of results) {
      for (const r of g.results) {
        if (count === selectedIndex) {
          if (r.path) navigate(r.path);
          setIsOpen(false);
          return;
        }
        count++;
      }
    }
  };

  useEffect(() => {
    const handleK = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100); } };
    document.addEventListener('keydown', handleK);
    return () => document.removeEventListener('keydown', handleK);
  }, []);

  const getIcon = (name: string) => {
    const icons: any = { SearchIcon, CommandIcon, MenuIcon, FolderIcon, UserIcon, SettingsIcon, GridIcon };
    const Icon = icons[name] || MenuIcon;
    return <Icon className="w-5 h-5" />;
  };

  if (!user) return null;

  return (
    <>
      <button onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }} className="p-2 border rounded-lg hover:bg-gray-50"><SearchIcon className="w-5 h-5" /></button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40" onClick={() => setIsOpen(false)}>
          <div ref={searchRef} className="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center gap-3">
              <SearchIcon className="w-5 h-5 text-gray-400" />
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown} className="flex-1 outline-none text-lg" placeholder="Search..." />
            </div>
            <div className="max-h-96 overflow-y-auto">
              {results.map((g, gi) => (
                <div key={g.title}>
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase bg-gray-50">{g.title}</div>
                  {g.results.map((r, ri) => {
                    const idx = results.slice(0, gi).reduce((s, gr) => s + gr.results.length, 0) + ri;
                    return (
                      <div key={r.id} onClick={() => { if (r.path) navigate(r.path); setIsOpen(false); }} className={`p-4 flex items-center gap-3 cursor-pointer ${idx === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                        {getIcon(r.icon)}
                        <div>
                          <div className="text-sm font-bold">{r.title}</div>
                          <div className="text-xs text-gray-500">{r.subtitle}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderSearch;
