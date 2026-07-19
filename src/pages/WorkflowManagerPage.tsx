import { useEffect, useMemo, useState } from 'react';
import PageMeta from '../shared/PageMeta';
import { IWorkflowConfig, IWorkflowDMActivity, IWorkflowQueueItem, workflowApi, automationApi } from '../services/personalApi';
import { notifyError } from '../utils/notify';

const defaultConfig: IWorkflowConfig = {
  connections: { instagram: false, googleDrive: false, captionEngine: false },
  ioPoints: {
    driveInputFolderId: '',
    dmInputMode: 'webhook',
    instagramOutputAccountId: '',
    archiveOutputFolderId: '',
    alertOutputChannel: 'in-app',
  },
  dmRules: {
    leadKeywords: 'collab, partnership, pricing, sponsor',
    urgentKeywords: 'refund, issue, problem, urgent',
    autoAcknowledge: true,
    slaMinutes: 30,
  },
};

const successPill = 'rounded-full px-2.5 py-1 text-[11px] font-semibold';

export default function WorkflowManagerPage() {
  const [config, setConfig] = useState<IWorkflowConfig>(defaultConfig);
  const [queue, setQueue] = useState<IWorkflowQueueItem[]>([]);
  const [dmActivity, setDmActivity] = useState<IWorkflowDMActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newAsset, setNewAsset] = useState({ fileName: '', driveFolder: '', caption: '', scheduledAt: '' });
  const [newDM, setNewDM] = useState({ sender: '', message: '', category: 'general' as IWorkflowDMActivity['category'] });
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [automationResult, setAutomationResult] = useState<any>(null);

  const loadAll = async () => {
    setLoading(true);
    // Load each section independently — a failure in one (e.g. DM activity)
    // must not blank config + queue, which have their own working endpoints.
    const [cfgR, qR, dmR] = await Promise.allSettled([
      workflowApi.getConfig(),
      workflowApi.getQueue(),
      workflowApi.getDMActivity(),
    ]);
    if (cfgR.status === 'fulfilled') {
      const cfg = cfgR.value;
      setConfig({
        ...defaultConfig,
        ...(cfg || {}),
        connections: { ...defaultConfig.connections, ...(cfg?.connections || {}) },
        ioPoints: { ...defaultConfig.ioPoints, ...(cfg?.ioPoints || {}) },
        dmRules: { ...defaultConfig.dmRules, ...(cfg?.dmRules || {}) },
      });
    }
    if (qR.status === 'fulfilled') setQueue(qR.value || []);
    if (dmR.status === 'fulfilled') setDmActivity(dmR.value || []);
    if (cfgR.status === 'rejected' && qR.status === 'rejected' && dmR.status === 'rejected') {
      console.error('Failed to load workflow module');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // An honest checklist of what's actually configured (replaces the old fake
  // "Readiness %" that could read 100% with zero real connectivity).
  const checklist = useMemo(() => [
    { label: 'DM triage keywords set', done: !!(config.dmRules.leadKeywords || config.dmRules.urgentKeywords) },
    { label: 'Drive input folder configured', done: !!config.ioPoints.driveInputFolderId },
    { label: 'Instagram output account set', done: !!config.ioPoints.instagramOutputAccountId },
    { label: 'At least one queued asset', done: queue.length > 0 },
    { label: 'DM activity to triage', done: dmActivity.length > 0 },
  ], [config, queue.length, dmActivity.length]);

  const saveConfig = async (next: IWorkflowConfig) => {
    setSaving(true);
    setConfig(next);
    try {
      await workflowApi.saveConfig(next);
    } catch (e) {
      notifyError(e, 'Failed to save config.');
    } finally {
      setSaving(false);
    }
  };

  const toggleConnection = (key: keyof IWorkflowConfig['connections']) => {
    const next = {
      ...config,
      connections: { ...config.connections, [key]: !config.connections[key] },
    };
    saveConfig(next);
  };

  const updateRule = (patch: Partial<IWorkflowConfig['dmRules']>) => {
    const next = { ...config, dmRules: { ...config.dmRules, ...patch } };
    setConfig(next);
  };

  const persistRules = () => saveConfig(config);
  const updateIo = (patch: Partial<IWorkflowConfig['ioPoints']>) => {
    const next = { ...config, ioPoints: { ...config.ioPoints, ...patch } };
    setConfig(next);
  };

  const addToQueue = async () => {
    if (!newAsset.fileName.trim() || !newAsset.driveFolder.trim()) return;
    try {
      const created = await workflowApi.createQueueItem({
        fileName: newAsset.fileName.trim(),
        driveFolder: newAsset.driveFolder.trim(),
        caption: newAsset.caption.trim() || 'Caption pending',
        status: 'draft',
        scheduledAt: newAsset.scheduledAt || '',
      });
      setQueue((prev) => [created, ...prev]);
      setNewAsset({ fileName: '', driveFolder: '', caption: '', scheduledAt: '' });
    } catch (e) {
      notifyError(e, 'Failed to add queue item.');
    }
  };

  const cycleStatus = async (id: string) => {
    const order: IWorkflowQueueItem['status'][] = ['draft', 'ready', 'scheduled', 'posted'];
    const item = queue.find((q) => q._id === id);
    if (!item) return;
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    try {
      const updated = await workflowApi.updateQueueItem(id, { status: next });
      setQueue((prev) => prev.map((q) => (q._id === id ? updated : q)));
    } catch (e) {
      notifyError(e, 'Failed to update queue item.');
    }
  };

  const removeQueueItem = async (id: string) => {
    try {
      await workflowApi.deleteQueueItem(id);
      setQueue((prev) => prev.filter((q) => q._id !== id));
    } catch (e) {
      notifyError(e, 'Failed to delete queue item.');
    }
  };

  const addDMActivity = async () => {
    if (!newDM.sender.trim() || !newDM.message.trim()) return;
    try {
      const created = await workflowApi.createDMActivity({
        sender: newDM.sender.trim(),
        message: newDM.message.trim(),
        category: newDM.category,
        status: 'new',
        receivedAt: new Date().toISOString(),
      });
      setDmActivity((prev) => [created, ...prev]);
      setNewDM({ sender: '', message: '', category: 'general' });
    } catch (e) {
      notifyError(e, 'Failed to create DM activity.');
    }
  };

  const nextDMStatus: Record<IWorkflowDMActivity['status'], IWorkflowDMActivity['status']> = {
    new: 'acknowledged',
    acknowledged: 'escalated',
    escalated: 'resolved',
    resolved: 'resolved',
  };

  const advanceDMStatus = async (id: string) => {
    const activity = dmActivity.find((a) => a._id === id);
    if (!activity) return;
    const status = nextDMStatus[activity.status];
    try {
      const updated = await workflowApi.updateDMActivity(id, { status });
      setDmActivity((prev) => prev.map((d) => (d._id === id ? updated : d)));
    } catch (e) {
      notifyError(e, 'Failed to update DM status.');
    }
  };

  const handleRunAutomation = async () => {
    setRunningAutomation(true);
    setAutomationResult(null);
    try {
      const res = await automationApi.run();
      setAutomationResult(res);
      await loadAll(); // Refresh data
    } catch (e) {
      notifyError(e, 'Automation run failed.');
    } finally {
      setRunningAutomation(false);
    }
  };

  const planItems = [
    'Use Meta official APIs + webhooks for Instagram publishing and DM events.',
    'Use Google Drive API watcher (folder-based ingestion) for media intake.',
    'Create moderation and escalation rules for DMs (lead, support, abuse).',
    'Use queue approvals before posting to avoid accidental brand issues.',
    'Track conversion metrics: response time, post frequency, lead quality, CTR.',
    'Add retries, idempotency keys, and audit logs for every automation run.',
    'Add human-in-the-loop approvals for sensitive messages and high-reach posts.',
    'Monitor API rate limits and token expiry with proactive refresh workflows.',
  ];

  if (loading) return <div className="flex h-64 items-center justify-center text-sm text-gray-400">Loading workflow manager...</div>;

  return (
    <>
      <PageMeta
        title="Smart Workflow Manager"
        description="Instagram + Drive + DM workflow orchestration for social media management"
      />

      <div className="space-y-6 pb-10">
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-blue-700 via-cyan-700 to-emerald-700 p-6 text-white shadow-xl shadow-cyan-200">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-100">Execution Hub</p>
          <h1 className="mt-1 text-3xl font-bold">Smart Workflow Manager</h1>
          <p className="mt-2 max-w-3xl text-sm text-cyan-100">
            Plan your social media operations: DM screening rules, a media queue, and a caption pipeline.
          </p>
          <div className="mt-4 rounded-xl border border-amber-300/40 bg-amber-400/15 px-3 py-2 text-xs text-amber-50">
            <span className="font-bold">⚠️ Simulation mode.</span> There's no live Instagram/Drive integration yet — connections and "Run Automation" update your own data only (queue statuses, DM categories). Going live is on the roadmap below.
          </div>
          <div className="mt-4 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm">
            <div className="flex items-center gap-2 font-semibold">Setup checklist {saving && <span className="text-cyan-100 font-normal">· Saving...</span>}</div>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {checklist.map(c => (
                <div key={c.label} className="flex items-center gap-1.5 text-xs">
                  <span>{c.done ? '✅' : '⬜'}</span>
                  <span className={c.done ? 'text-white' : 'text-cyan-100/70'}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleRunAutomation}
            disabled={runningAutomation}
            className={`mt-6 flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-lg transition-all ${runningAutomation
                ? 'bg-white/20 text-white/50 cursor-not-allowed'
                : 'bg-white text-blue-700 hover:bg-cyan-50 hover:scale-105'
              }`}
          >
            {runningAutomation ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Executing Workflows...
              </>
            ) : (
              <>
                <span>✨ Run Automation Engine</span>
              </>
            )}
          </button>

          {automationResult && (
            <div className="mt-4 rounded-xl bg-white/10 p-4 text-xs text-white backdrop-blur-md">
              <p className="font-bold uppercase tracking-wider text-cyan-200">Execution Report:</p>
              <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-cyan-300">Notes Summarized</p>
                  <p className="text-lg font-bold">{automationResult.summaries?.notes || 0}</p>
                </div>
                <div>
                  <p className="text-cyan-300">Captures Refined</p>
                  <p className="text-lg font-bold">{automationResult.summaries?.captures || 0}</p>
                </div>
                <div>
                  <p className="text-cyan-300">Queues Posted</p>
                  <p className="text-lg font-bold">{automationResult.queueProcessed || 0}</p>
                </div>
                <div>
                  <p className="text-cyan-300">DMs Triaged</p>
                  <p className="text-lg font-bold">{automationResult.dmsTriaged || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-1">
            <h2 className="text-sm font-bold text-gray-800">1) App Connections <span className="text-[10px] font-semibold text-amber-600">· simulated</span></h2>
            <p className="mt-1 text-xs text-gray-500">Toggles are placeholders — no OAuth yet. They only record your intent until a real integration ships.</p>
            <div className="mt-4 space-y-3">
              {(
                [
                  { key: 'instagram', label: 'Instagram (Meta Graph API)' },
                  { key: 'googleDrive', label: 'Google Drive (Media Source)' },
                  { key: 'captionEngine', label: 'Caption Engine (AI)' },
                ] as { key: keyof IWorkflowConfig['connections']; label: string }[]
              ).map((conn) => (
                <button
                  key={conn.key}
                  onClick={() => toggleConnection(conn.key)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${config.connections[conn.key]
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <span>{conn.label}</span>
                  <span>{config.connections[conn.key] ? 'Connected' : 'Connect'}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-sm font-bold text-gray-800">2) DM Screening Rules</h2>
            <p className="mt-1 text-xs text-gray-500">Auto-classify DMs into lead, support, spam, and escalation lanes.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Lead Keywords</label>
                <input
                  value={config.dmRules.leadKeywords}
                  onChange={(e) => updateRule({ leadKeywords: e.target.value })}
                  onBlur={persistRules}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Urgent Keywords</label>
                <input
                  value={config.dmRules.urgentKeywords}
                  onChange={(e) => updateRule({ urgentKeywords: e.target.value })}
                  onBlur={persistRules}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">SLA (minutes)</label>
                <input
                  type="number"
                  min={5}
                  value={config.dmRules.slaMinutes}
                  onChange={(e) => updateRule({ slaMinutes: Number(e.target.value) || 30 })}
                  onBlur={persistRules}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => saveConfig({ ...config, dmRules: { ...config.dmRules, autoAcknowledge: !config.dmRules.autoAcknowledge } })}
                  className={`w-full rounded-xl px-3 py-2 text-sm font-semibold ${config.dmRules.autoAcknowledge ? 'bg-cyan-600 text-white' : 'border border-gray-200 bg-white text-gray-600'
                    }`}
                >
                  {config.dmRules.autoAcknowledge ? 'Auto Acknowledge: ON' : 'Auto Acknowledge: OFF'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">3) Input / Output Point Settings</h2>
          <p className="mt-1 text-xs text-gray-500">Configure where data enters and where outcomes are published.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Drive Input Folder ID</label>
              <input
                value={config.ioPoints.driveInputFolderId}
                onChange={(e) => updateIo({ driveInputFolderId: e.target.value })}
                onBlur={persistRules}
                placeholder="Google Drive folder id"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">DM Input Mode</label>
              <select
                value={config.ioPoints.dmInputMode}
                onChange={(e) => {
                  const mode = e.target.value as IWorkflowConfig['ioPoints']['dmInputMode'];
                  updateIo({ dmInputMode: mode });
                  saveConfig({ ...config, ioPoints: { ...config.ioPoints, dmInputMode: mode } });
                }}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
              >
                <option value="webhook">webhook</option>
                <option value="manual">manual</option>
                <option value="hybrid">hybrid</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Instagram Output Account ID</label>
              <input
                value={config.ioPoints.instagramOutputAccountId}
                onChange={(e) => updateIo({ instagramOutputAccountId: e.target.value })}
                onBlur={persistRules}
                placeholder="Instagram business account id"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Archive Output Folder ID</label>
              <input
                value={config.ioPoints.archiveOutputFolderId}
                onChange={(e) => updateIo({ archiveOutputFolderId: e.target.value })}
                onBlur={persistRules}
                placeholder="Archive folder id"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Alert Output Channel</label>
              <input
                value={config.ioPoints.alertOutputChannel}
                onChange={(e) => updateIo({ alertOutputChannel: e.target.value })}
                onBlur={persistRules}
                placeholder="in-app / email / telegram / slack"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">4) DM Activity Console</h2>
          <p className="mt-1 text-xs text-gray-500">Capture and triage DM activity in your portal.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input
              value={newDM.sender}
              onChange={(e) => setNewDM((p) => ({ ...p, sender: e.target.value }))}
              placeholder="@sender"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
            />
            <input
              value={newDM.message}
              onChange={(e) => setNewDM((p) => ({ ...p, message: e.target.value }))}
              placeholder="Message"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none md:col-span-2"
            />
            <div className="flex gap-2">
              <select
                value={newDM.category}
                onChange={(e) => setNewDM((p) => ({ ...p, category: e.target.value as IWorkflowDMActivity['category'] }))}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
              >
                <option value="general">general</option>
                <option value="lead">lead</option>
                <option value="support">support</option>
                <option value="spam">spam</option>
              </select>
              <button onClick={addDMActivity} className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700">
                Add
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {dmActivity.length === 0 && <p className="text-sm text-gray-400">No DM activity yet.</p>}
            {dmActivity.map((dm) => (
              <div key={dm._id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{dm.sender}</p>
                  <p className="text-xs text-gray-500">{dm.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`${successPill} bg-blue-100 text-blue-700`}>{dm.category}</span>
                  <span className={`${successPill} bg-gray-200 text-gray-700`}>{dm.status}</span>
                  {dm.status !== 'resolved' && (
                    <button onClick={() => advanceDMStatus(dm._id)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-white">
                      Advance
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">5) Drive to Instagram Publishing Queue</h2>
          <p className="mt-1 text-xs text-gray-500">Queue assets from Drive folders with captions and posting states.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input
              value={newAsset.fileName}
              onChange={(e) => setNewAsset((p) => ({ ...p, fileName: e.target.value }))}
              placeholder="File name"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
            />
            <input
              value={newAsset.driveFolder}
              onChange={(e) => setNewAsset((p) => ({ ...p, driveFolder: e.target.value }))}
              placeholder="Drive folder"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
            />
            <input
              value={newAsset.scheduledAt}
              onChange={(e) => setNewAsset((p) => ({ ...p, scheduledAt: e.target.value }))}
              placeholder="YYYY-MM-DD HH:mm"
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
            />
            <button onClick={addToQueue} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Add Queue Item
            </button>
          </div>

          <textarea
            value={newAsset.caption}
            onChange={(e) => setNewAsset((p) => ({ ...p, caption: e.target.value }))}
            placeholder="Caption"
            rows={2}
            className="mt-3 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
          />

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                  <th className="py-2 pr-3">Asset</th>
                  <th className="py-2 pr-3">Drive Source</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item._id} className="border-b border-gray-50">
                    <td className="py-3 pr-3">
                      <p className="font-medium text-gray-800">{item.fileName}</p>
                      <p className="text-xs text-gray-500">{item.caption}</p>
                    </td>
                    <td className="py-3 pr-3 text-gray-600">{item.driveFolder}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={`${successPill} ${item.status === 'posted'
                            ? 'bg-emerald-100 text-emerald-700'
                            : item.status === 'scheduled'
                              ? 'bg-blue-100 text-blue-700'
                              : item.status === 'ready'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex gap-2">
                        <button onClick={() => cycleStatus(item._id)} className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                          Next Stage
                        </button>
                        <button onClick={() => removeQueueItem(item._id)} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800">🛣️ Roadmap to go live</h2>
          <p className="mt-1 text-xs text-gray-500">What real integration will require (not yet built):</p>
          <ol className="mt-4 space-y-2 text-sm text-gray-700">
            {planItems.map((item, idx) => (
              <li key={item} className="flex gap-2">
                <span className="mt-0.5 text-xs font-bold text-cyan-700">{idx + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}
