import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import PageMeta from '../shared/PageMeta';
import { captureApi, IWorkflowConfig, workflowApi } from '../services/personalApi';

type VisitEvent = {
  id: string;
  url: string;
  source: string;
  startedAt: string;
};

type BridgeResult = {
  requested_url?: string;
  final_url?: string;
  title?: string;
  text_excerpt?: string;
  top_links?: Array<{ label: string; href: string }>;
  screenshot_base64_png?: string;
  engine?: string;
  query?: string;
};

const QUICK_TOOLS = [
  { name: 'ChatGPT', url: 'https://chatgpt.com' },
  { name: 'Claude', url: 'https://claude.ai' },
  { name: 'Gemini', url: 'https://gemini.google.com' },
  { name: 'Canva', url: 'https://www.canva.com' },
  { name: 'Notion', url: 'https://www.notion.so' },
  { name: 'n8n', url: 'https://n8n.io' },
];

const SEARCH_ENGINES = [
  {
    id: 'duckduckgo-lite',
    name: 'DuckDuckGo Lite',
    buildUrl: (q: string) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
    note: 'Best chance for iframe compatibility.',
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    buildUrl: (q: string) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    note: 'May block iframe; fallback to new tab.',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    buildUrl: (q: string) => `https://www.perplexity.ai/search/new?q=${encodeURIComponent(q)}`,
    note: 'Usually blocks iframe; use new tab when needed.',
  },
  {
    id: 'google',
    name: 'Google',
    buildUrl: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    note: 'Usually blocks iframe; use new tab when needed.',
  },
  {
    id: 'bing',
    name: 'Bing',
    buildUrl: (q: string) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    note: 'May work depending on browser policies.',
  },
] as const;

const SOCIAL_STACK = [
  { name: 'Instagram Feed', url: 'https://www.instagram.com/' },
  { name: 'Instagram DM', url: 'https://www.instagram.com/direct/inbox/' },
  { name: 'LinkedIn Feed', url: 'https://www.linkedin.com/feed/' },
  { name: 'X Home', url: 'https://x.com/home' },
  { name: 'Meta Business', url: 'https://business.facebook.com/' },
];

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
};

const defaultBrowserWorkspace: NonNullable<IWorkflowConfig['browserWorkspace']> = {
  homeUrl: 'https://chatgpt.com',
  allowedDomains: 'chatgpt.com,claude.ai,gemini.google.com',
  allowAnyUrl: true,
  sessionTracking: true,
  recordingEnabled: true,
  integrationWebhookUrl: '',
  integrationAuthToken: '',
  emitVisitEvents: true,
  emitRecordingEvents: true,
  socialMode: true,
};

export default function AIToolsHubPage() {
  const [selectedUrl, setSelectedUrl] = useState(defaultBrowserWorkspace.homeUrl);
  const [customUrl, setCustomUrl] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [visitLog, setVisitLog] = useState<VisitEvent[]>([]);
  const [workflowConfig, setWorkflowConfig] = useState<IWorkflowConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [loading, setLoading] = useState(true);

  const [queueCaption, setQueueCaption] = useState('');
  const [insight, setInsight] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEngineId, setSelectedEngineId] = useState<(typeof SEARCH_ENGINES)[number]['id']>('duckduckgo-lite');
  const [socialQueueCount, setSocialQueueCount] = useState(0);
  const [unresolvedDM, setUnresolvedDM] = useState(0);
  const [bridgeMode, setBridgeMode] = useState(false);
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [bridgeResult, setBridgeResult] = useState<BridgeResult | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [bridgeError, setBridgeError] = useState('');
  const [bridgeUrlOverride, setBridgeUrlOverride] = useState('');

  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const browserWorkspace = workflowConfig?.browserWorkspace || defaultBrowserWorkspace;
  const bridgeBaseUrl = (bridgeUrlOverride || import.meta.env.VITE_BROWSER_BRIDGE_URL || 'http://localhost:8010').replace(/\/$/, '');
  const selectedEngine = SEARCH_ENGINES.find((e) => e.id === selectedEngineId) || SEARCH_ENGINES[0];

  const productivityScore = useMemo(() => {
    const cfg = workflowConfig;
    if (!cfg) return 0;
    const points = [
      cfg.connections?.instagram,
      cfg.connections?.googleDrive,
      cfg.connections?.captionEngine,
      (cfg.ioPoints?.instagramOutputAccountId || '').trim().length > 0,
      (cfg.ioPoints?.driveInputFolderId || '').trim().length > 0,
      browserWorkspace.sessionTracking,
      browserWorkspace.recordingEnabled,
    ].filter(Boolean).length;
    return Math.round((points / 7) * 100);
  }, [workflowConfig, browserWorkspace.sessionTracking, browserWorkspace.recordingEnabled]);

  const openUrl = (url: string, source: string) => {
    const next = normalizeUrl(url);
    if (!next) return;

    setSelectedUrl(next);
    setRefreshKey((v) => v + 1);

    if (browserWorkspace.sessionTracking) {
      setVisitLog((prev) => [{
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url: next,
        source,
        startedAt: new Date().toISOString(),
      }, ...prev].slice(0, 30));
    }
  };

  const bridgePreview = async (url: string) => {
    const next = normalizeUrl(url);
    if (!next) return;
    try {
      setBridgeLoading(true);
      setBridgeError('');
      const res = await fetch(`${bridgeBaseUrl}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: next, wait_ms: 2200, max_links: 12 }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Bridge preview failed (${res.status}): ${msg}`);
      }
      const data: BridgeResult = await res.json();
      setBridgeResult(data);
      setBridgeStatus('connected');
      setSelectedUrl(next);
      if (browserWorkspace.sessionTracking) {
        setVisitLog((prev) => [{
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          url: next,
          source: `bridge-preview`,
          startedAt: new Date().toISOString(),
        }, ...prev].slice(0, 30));
      }
    } catch {
      const message = 'Bridge service is unavailable. Start python bridge on port 8010.';
      setBridgeError(message);
      setBridgeStatus('disconnected');
      toast.error(message);
    } finally {
      setBridgeLoading(false);
    }
  };

  const bridgeSearch = async () => {
    const q = customUrl.trim();
    if (!q) return;
    try {
      setBridgeLoading(true);
      setBridgeError('');
      const res = await fetch(`${bridgeBaseUrl}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: 'duckduckgo_lite', query: q, wait_ms: 2200 }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Bridge search failed (${res.status}): ${msg}`);
      }
      const data: BridgeResult = await res.json();
      setBridgeResult(data);
      setBridgeStatus('connected');
    } catch {
      const message = 'Bridge search failed. Ensure python bridge is running and reachable.';
      setBridgeError(message);
      setBridgeStatus('disconnected');
      toast.error(message);
    } finally {
      setBridgeLoading(false);
    }
  };

  const checkBridgeHealth = async () => {
    try {
      setBridgeError('');
      const res = await fetch(`${bridgeBaseUrl}/health`);
      if (!res.ok) throw new Error('Bridge health failed');
      setBridgeStatus('connected');
      toast.success('Bridge connected');
    } catch {
      setBridgeStatus('disconnected');
      const message = `Bridge not reachable at ${bridgeBaseUrl}`;
      setBridgeError(message);
      toast.error(message);
    }
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const [cfg, queue, dm] = await Promise.all([
        workflowApi.getConfig(),
        workflowApi.getQueue(),
        workflowApi.getDMActivity(),
      ]);

      const merged: IWorkflowConfig = {
        ...cfg,
        browserWorkspace: { ...defaultBrowserWorkspace, ...(cfg.browserWorkspace || {}) },
      };
      setWorkflowConfig(merged);
      setSelectedUrl(merged.browserWorkspace?.homeUrl || defaultBrowserWorkspace.homeUrl);
      setSocialQueueCount((queue || []).length);
      setUnresolvedDM((dm || []).filter((d) => d.status !== 'resolved').length);
    } catch {
      toast.error('Failed to load AI workspace data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const saveConfig = async () => {
    if (!workflowConfig) return;
    try {
      setSavingConfig(true);
      await workflowApi.saveConfig(workflowConfig);
      toast.success('Workspace settings saved');
    } catch {
      toast.error('Failed to save workspace settings');
    } finally {
      setSavingConfig(false);
    }
  };

  const updateBrowserWorkspace = (patch: Partial<NonNullable<IWorkflowConfig['browserWorkspace']>>) => {
    setWorkflowConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        browserWorkspace: {
          ...defaultBrowserWorkspace,
          ...(prev.browserWorkspace || {}),
          ...patch,
        },
      };
    });
  };

  const addCurrentUrlToWorkflowQueue = async () => {
    try {
      await workflowApi.createQueueItem({
        fileName: `browser-link-${Date.now()}`,
        driveFolder: workflowConfig?.ioPoints?.driveInputFolderId || 'browser-workspace',
        caption: queueCaption.trim() || `Action required: ${selectedUrl}`,
        status: 'draft',
        scheduledAt: '',
      });
      setQueueCaption('');
      setSocialQueueCount((v) => v + 1);
      toast.success('Added to social workflow queue');
    } catch {
      toast.error('Failed to add to queue');
    }
  };

  const captureInsight = async () => {
    const text = insight.trim();
    if (!text) return;
    try {
      await captureApi.create({ type: 'Article', text: `[AI Workspace] ${text}`, emoji: '🧠' });
      setInsight('');
      toast.success('Insight captured to your personal system');
    } catch {
      toast.error('Failed to capture insight');
    }
  };

  const runSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    openUrl(selectedEngine.buildUrl(q), `search:${selectedEngine.name}`);
  };

  const startRecording = async () => {
    if (!browserWorkspace.recordingEnabled) {
      toast.error('Recording is disabled in settings');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error('Screen recording could not start');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) mediaRecorderRef.current.stop();
  };

  return (
    <>
      <PageMeta title="AI Tools Hub" description="Productive AI workspace for browser ops, social queue actions, and capture" />

      <div className="space-y-6 pb-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-gray-600">Bridge URL</p>
            <input
              value={bridgeUrlOverride}
              onChange={(e) => setBridgeUrlOverride(e.target.value)}
              placeholder={import.meta.env.VITE_BROWSER_BRIDGE_URL || 'http://localhost:8010'}
              className="min-w-[240px] flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
            />
            <button onClick={checkBridgeHealth} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Check Bridge</button>
            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${bridgeStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' : bridgeStatus === 'disconnected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
              {bridgeStatus}
            </span>
          </div>
          {bridgeError && <p className="mt-2 text-xs text-red-600">{bridgeError}</p>}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-xl shadow-slate-300">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">Productivity Workspace</p>
          <h1 className="mt-1 text-3xl font-bold">AI Tools Hub</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-200">
            Use this as your execution cockpit: browse tools, process social channels, capture insights, queue actions, and record your workflow.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4"><p className="text-xs text-gray-500">Workflow Readiness</p><p className="text-2xl font-bold text-gray-900">{productivityScore}%</p></div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4"><p className="text-xs text-gray-500">Social Queue</p><p className="text-2xl font-bold text-gray-900">{socialQueueCount}</p></div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4"><p className="text-xs text-gray-500">Unresolved DM</p><p className="text-2xl font-bold text-gray-900">{unresolvedDM}</p></div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4"><p className="text-xs text-gray-500">Tracked Visits</p><p className="text-2xl font-bold text-gray-900">{visitLog.length}</p></div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                <p className="text-xs font-bold text-indigo-800">Search Engine Browser</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SEARCH_ENGINES.map((engine) => (
                    <button
                      key={engine.id}
                      onClick={() => setSelectedEngineId(engine.id)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        selectedEngineId === engine.id
                          ? 'bg-indigo-600 text-white'
                          : 'border border-indigo-200 bg-white text-indigo-700'
                      }`}
                    >
                      {engine.name}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') runSearch();
                    }}
                    placeholder={`Search with ${selectedEngine.name}`}
                    className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs"
                  />
                  <button onClick={runSearch} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">
                    Search
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-indigo-700">{selectedEngine.note}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {QUICK_TOOLS.map((tool) => (
                  <button key={tool.name} onClick={() => openUrl(tool.url, tool.name)} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                    {tool.name}
                  </button>
                ))}
              </div>

              {browserWorkspace.socialMode !== false && (
                <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-cyan-100 bg-cyan-50 p-3">
                  {SOCIAL_STACK.map((item) => (
                    <button key={item.name} onClick={() => openUrl(item.url, item.name)} className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-800">
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="Enter any URL" className="min-w-[260px] flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
                <button onClick={() => openUrl(customUrl, 'custom-url')} className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white">Open</button>
                <button onClick={() => bridgePreview(customUrl)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Bridge Preview</button>
                <button onClick={bridgeSearch} className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white">Bridge Search</button>
                <button onClick={() => setRefreshKey((v) => v + 1)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">Reload</button>
                <a href={selectedUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">New Tab</a>
                <label className="ml-1 flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700">
                  <input type="checkbox" checked={bridgeMode} onChange={(e) => setBridgeMode(e.target.checked)} />
                  Bridge View
                </label>
              </div>

              <div className="mb-2 text-xs text-gray-500">Current URL: {selectedUrl}</div>

              <div className="mb-3 flex flex-wrap gap-2">
                <button onClick={startRecording} disabled={recording || loading} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{recording ? 'Recording...' : 'Start Recording'}</button>
                <button onClick={stopRecording} disabled={!recording} className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">Stop</button>
                {recordedUrl && <a href={recordedUrl} download="ai-workspace-recording.webm" className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700">Download</a>}
              </div>

              {bridgeMode ? (
                <div className="h-[66vh] overflow-auto rounded-xl border border-gray-200 bg-white p-3">
                  {bridgeLoading ? (
                    <p className="text-sm text-gray-500">Loading bridge output...</p>
                  ) : !bridgeResult ? (
                    <p className="text-sm text-gray-500">Run Bridge Preview or Bridge Search to render content here.</p>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-400">Final URL</p>
                        <p className="text-sm font-semibold text-gray-800 break-all">{bridgeResult.final_url || bridgeResult.requested_url}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Title</p>
                        <p className="text-base font-bold text-gray-900">{bridgeResult.title || 'Untitled'}</p>
                      </div>
                      {bridgeResult.screenshot_base64_png && (
                        <img
                          src={`data:image/png;base64,${bridgeResult.screenshot_base64_png}`}
                          alt="Bridge screenshot"
                          className="w-full rounded-lg border border-gray-200"
                        />
                      )}
                      <div>
                        <p className="text-xs text-gray-400">Visible Text</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{bridgeResult.text_excerpt || 'No excerpt found.'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Top Links</p>
                        <div className="space-y-1">
                          {(bridgeResult.top_links || []).map((link, idx) => (
                            <button
                              key={`${link.href}-${idx}`}
                              onClick={() => bridgePreview(link.href)}
                              className="w-full text-left rounded-lg border border-gray-200 px-2 py-1.5 text-xs hover:bg-gray-50"
                            >
                              {link.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[66vh] overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <iframe key={`${selectedUrl}-${refreshKey}`} src={selectedUrl} title="AI Workspace Browser" className="h-full w-full" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Action Center</h3>
              <textarea value={queueCaption} onChange={(e) => setQueueCaption(e.target.value)} placeholder="Add current URL with action note for social queue" className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs" rows={2} />
              <button onClick={addCurrentUrlToWorkflowQueue} className="mt-2 w-full rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white">Add To Social Queue</button>

              <textarea value={insight} onChange={(e) => setInsight(e.target.value)} placeholder="Capture insight from current research/session" className="mt-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs" rows={3} />
              <button onClick={captureInsight} className="mt-2 w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Capture Insight</button>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Session Timeline</h3>
              <div className="mt-2 max-h-56 space-y-2 overflow-auto pr-1">
                {visitLog.length === 0 ? (
                  <p className="text-xs text-gray-400">No tracked sessions yet.</p>
                ) : (
                  visitLog.map((visit) => (
                    <button key={visit.id} onClick={() => openUrl(visit.url, 'history')} className="w-full rounded-lg border border-gray-100 p-2 text-left hover:bg-gray-50">
                      <p className="truncate text-xs font-semibold text-gray-700">{visit.url}</p>
                      <p className="text-[11px] text-gray-400">{visit.source} • {new Date(visit.startedAt).toLocaleString()}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900">Workspace Settings</h3>
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={browserWorkspace.socialMode !== false} onChange={(e) => updateBrowserWorkspace({ socialMode: e.target.checked })} />Social mode</label>
              <label className="mt-1 flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={browserWorkspace.sessionTracking} onChange={(e) => updateBrowserWorkspace({ sessionTracking: e.target.checked })} />Session tracking</label>
              <label className="mt-1 flex items-center gap-2 text-xs text-gray-700"><input type="checkbox" checked={browserWorkspace.recordingEnabled} onChange={(e) => updateBrowserWorkspace({ recordingEnabled: e.target.checked })} />Recording enabled</label>
              <input value={browserWorkspace.homeUrl} onChange={(e) => updateBrowserWorkspace({ homeUrl: e.target.value })} className="mt-2 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs" placeholder="Default home URL" />
              <button onClick={saveConfig} disabled={savingConfig} className="mt-2 w-full rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{savingConfig ? 'Saving...' : 'Save Settings'}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
