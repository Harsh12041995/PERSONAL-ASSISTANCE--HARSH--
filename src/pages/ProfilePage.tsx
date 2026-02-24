import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PageMeta from '../shared/PageMeta';
import { IUserSettings, settingsApi } from '../services/personalApi';

const DEFAULT_SETTINGS: IUserSettings = {
  displayName: 'User',
  profileImage: '',
  bio: '',
  timezone: 'Asia/Kolkata',
  theme: 'light',
  notifications: {
    dailyDigest: true,
    habitReminders: true,
    goalDeadlines: true,
    contactFollowUp: true,
  },
  integrations: {
    whatsappEnabled: false,
    whatsappNumber: '',
    telegramEnabled: false,
    telegramUsername: '',
  },
  geminiApiKey: '',
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
};

const TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Singapore',
  'Asia/Dubai',
];

const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) return reject(new Error('Unable to read image'));
      const img = new Image();
      img.onload = () => {
        const maxSize = 512;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const width = Math.round(img.width * ratio);
        const height = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Unable to process image'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = src;
    };
    reader.onerror = () => reject(new Error('Unable to read image'));
    reader.readAsDataURL(file);
  });

export default function ProfilePage() {
  const { user, role } = useAuth() as any;
  const [settings, setSettings] = useState<IUserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    settingsApi
      .get()
      .then((data) => {
        if (data && Object.keys(data).length) {
          setSettings({ ...DEFAULT_SETTINGS, ...data, profileImage: data.profileImage || '' });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await settingsApi.save(settings);
      localStorage.setItem('profileImage', settings.profileImage || '');
      window.dispatchEvent(new Event('profile-image-updated'));
      setStatusText('Profile updated successfully');
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setStatusText('');
      }, 1800);
    } catch {
      setStatusText('Failed to save profile');
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = (settings.displayName || user?.name || user?.email || 'U')
    .split(' ')
    .map((part: string) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const onImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setSettings((prev) => ({ ...prev, profileImage: compressed }));
      setStatusText('Image selected and optimized. Click Save Profile to apply.');
    } catch {
      setStatusText('Could not process image. Try a different file.');
    }
  };

  const profileStrength = (() => {
    let score = 0;
    if (settings.displayName.trim()) score += 25;
    if (settings.bio.trim()) score += 25;
    if (settings.profileImage) score += 25;
    if (settings.timezone && settings.currency) score += 25;
    return score;
  })();

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-gray-400">Loading profile...</div>;
  }

  return (
    <>
      <PageMeta title="Profile" description="View and edit your personal profile" />

      <div className="mx-auto max-w-4xl space-y-6 pb-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">👤 My Profile</h1>
            <p className="mt-0.5 text-sm text-gray-500">Manage your identity and personal preferences</p>
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Profile'}
          </button>
        </div>

        {statusText && (
          <div className={`rounded-xl border px-4 py-2.5 text-sm ${saved ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
            {statusText}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-gray-800">Profile Identity</h2>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-200">
                {settings.profileImage ? (
                  <img src={settings.profileImage} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">{initials}</div>
                )}
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">{settings.displayName || 'User'}</p>
                <p className="text-sm text-gray-500">{user?.email || 'No email'}</p>
                <p className="mt-1 inline-block rounded-full bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                  {role || 'user'}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                Change image
                <input type="file" accept="image/*" className="hidden" onChange={onImagePick} />
              </label>
              {settings.profileImage && (
                <button
                  type="button"
                  onClick={() => {
                    setSettings((prev) => ({ ...prev, profileImage: '' }));
                    setStatusText('Image removed. Click Save Profile to apply.');
                  }}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Remove image
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-gray-800">Profile Quality</h2>
            <div className="mb-3 h-2.5 w-full rounded-full bg-gray-100">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all"
                style={{ width: `${profileStrength}%` }}
              />
            </div>
            <p className="text-xs font-semibold text-gray-600">{profileStrength}% complete</p>
            <div className="mt-4 space-y-2 text-xs text-gray-600">
              <p>• Add a clear profile photo for stronger identity.</p>
              <p>• Keep bio concise and outcome-focused.</p>
              <p>• Use correct timezone and currency for accurate planning.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-800">Basic Info</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Display Name</label>
              <input
                value={settings.displayName}
                onChange={(e) => setSettings((prev) => ({ ...prev, displayName: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Bio</label>
              <textarea
                rows={3}
                value={settings.bio}
                onChange={(e) => setSettings((prev) => ({ ...prev, bio: e.target.value }))}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="Tell a bit about yourself"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-800">Preferences</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings((prev) => ({ ...prev, currency: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none"
              >
                {['INR', 'USD', 'EUR', 'GBP', 'SGD', 'AED'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Date Format</label>
              <select
                value={settings.dateFormat}
                onChange={(e) => setSettings((prev) => ({ ...prev, dateFormat: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none"
              >
                {['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map((fmt) => (
                  <option key={fmt}>{fmt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
