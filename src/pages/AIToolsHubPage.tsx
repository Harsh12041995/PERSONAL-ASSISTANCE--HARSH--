import { useMemo, useState } from 'react';
import PageMeta from '../shared/PageMeta';

type Tool = {
  id: string;
  name: string;
  category: 'chat' | 'image' | 'video' | 'automation' | 'dev';
  url: string;
  description: string;
};

const TOOLS: Tool[] = [
  { id: 'chatgpt', name: 'ChatGPT', category: 'chat', url: 'https://chatgpt.com', description: 'General AI assistant for writing, coding, and planning.' },
  { id: 'claude', name: 'Claude', category: 'chat', url: 'https://claude.ai', description: 'Long-form reasoning and document workflows.' },
  { id: 'gemini', name: 'Gemini', category: 'chat', url: 'https://gemini.google.com', description: 'Google AI for multimodal assistance.' },
  { id: 'midjourney', name: 'Midjourney', category: 'image', url: 'https://www.midjourney.com', description: 'High-quality AI image generation.' },
  { id: 'runway', name: 'Runway', category: 'video', url: 'https://runwayml.com', description: 'AI video generation and editing.' },
  { id: 'zapier', name: 'Zapier', category: 'automation', url: 'https://zapier.com', description: 'No-code automation between apps.' },
  { id: 'n8n', name: 'n8n', category: 'automation', url: 'https://n8n.io', description: 'Flexible workflow automation platform.' },
  { id: 'github-copilot', name: 'GitHub Copilot', category: 'dev', url: 'https://github.com/features/copilot', description: 'Coding assistant for developers.' },
];

const categories = ['all', 'chat', 'image', 'video', 'automation', 'dev'] as const;

type Category = (typeof categories)[number];

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
};

export default function AIToolsHubPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [selectedUrl, setSelectedUrl] = useState('https://chatgpt.com');
  const [customUrl, setCustomUrl] = useState('');

  const filtered = useMemo(
    () => TOOLS.filter((tool) => activeCategory === 'all' || tool.category === activeCategory),
    [activeCategory]
  );

  const openCustom = () => {
    const next = normalizeUrl(customUrl);
    if (!next) return;
    setSelectedUrl(next);
  };

  return (
    <>
      <PageMeta title="AI Tools Hub" description="Integrate and browse top AI tools directly inside your portal" />

      <div className="space-y-6 pb-10">
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-xl shadow-slate-300">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">AI Integrations</p>
          <h1 className="mt-1 text-3xl font-bold">AI Tools Hub + Browser Space</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-200">
            Connect to leading AI tools and open internet links directly inside your portal. Use this as your central AI workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  activeCategory === cat ? 'bg-cyan-600 text-white' : 'border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedUrl(tool.url)}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-left transition hover:border-cyan-200 hover:bg-cyan-50"
              >
                <p className="text-sm font-bold text-gray-800">{tool.name}</p>
                <p className="mt-1 text-xs text-gray-500">{tool.description}</p>
                <p className="mt-2 text-[11px] font-medium text-cyan-700">Open inside portal</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="Enter any URL (e.g. www.perplexity.ai)"
              className="min-w-[260px] flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
            />
            <button onClick={openCustom} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
              Open in Portal
            </button>
            <a
              href={selectedUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Open in New Tab
            </a>
          </div>

          <div className="mb-2 text-xs text-gray-500">Current URL: {selectedUrl}</div>

          <div className="h-[68vh] overflow-hidden rounded-xl border border-gray-200 bg-white">
            <iframe
              key={selectedUrl}
              src={selectedUrl}
              title="AI Tools Browser Space"
              className="h-full w-full"
              referrerPolicy="no-referrer"
            />
          </div>

          <p className="mt-2 text-xs text-gray-400">
            Some websites block iframe embedding for security reasons. Use "Open in New Tab" for those sites.
          </p>
        </div>
      </div>
    </>
  );
}
