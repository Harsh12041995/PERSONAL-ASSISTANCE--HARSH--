import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { financeApi, ITransaction, budgetApi, IBudget } from '../services/personalApi';
import { localToday } from '../utils/date';

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Bills', 'Savings', 'Income', 'Other'];
const CAT_EMOJI: Record<string, string> = {
    Food: '🍔', Transport: '🚗', Entertainment: '🎬', Health: '💊', Shopping: '🛍️',
    Bills: '⚡', Savings: '🏦', Income: '💵', Other: '📦',
};
const CAT_COLOR: Record<string, string> = {
    Food: 'bg-orange-100 text-orange-700', Transport: 'bg-sky-100 text-sky-700',
    Entertainment: 'bg-purple-100 text-purple-700', Health: 'bg-rose-100 text-rose-700',
    Shopping: 'bg-pink-100 text-pink-700', Bills: 'bg-yellow-100 text-yellow-700',
    Savings: 'bg-emerald-100 text-emerald-700', Income: 'bg-green-100 text-green-700', Other: 'bg-gray-100 text-gray-700',
};

const today = localToday;
const formatINR = (n: number) => `${n < 0 ? '-' : ''}₹${Math.abs(n).toLocaleString('en-IN')}`;
const DEFAULT_BUDGETS: Record<string, number> = { Food: 5000, Transport: 2000, Entertainment: 2000, Shopping: 5000 };

export default function FinancePage() {
    const [txns, setTxns] = useState<ITransaction[]>([]);
    const [budgets, setBudgets] = useState<IBudget[]>([]);
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [cat, setCat] = useState('Food');
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try { setTxns(await financeApi.getAll()); }
        catch { setError('Could not load transactions.'); }
        finally { setLoading(false); }
        budgetApi.getAll().then(setBudgets).catch(() => setBudgets([]));
    }, []);
    useEffect(() => { load(); }, [load]);

    // Budget limit per category — real budget doc if set, else a sensible default.
    const budgetFor = (c: string) => budgets.find(b => b.category === c)?.limit ?? DEFAULT_BUDGETS[c] ?? 0;
    const saveBudget = async (category: string, limit: number) => {
        try {
            const saved = await budgetApi.upsert({ category, limit, emoji: CAT_EMOJI[category] || '📦', period: 'monthly', color: '' });
            setBudgets(prev => {
                const rest = prev.filter(b => b.category !== category);
                return [...rest, saved];
            });
            toast.success(`${category} budget set to ${formatINR(limit)}`);
        } catch { toast.error("Couldn't save budget."); }
    };

    const totalIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const resetForm = () => { setDesc(''); setAmount(''); setCat('Food'); setType('expense'); setEditingId(null); };

    const startEdit = (t: ITransaction) => {
        setEditingId(t._id);
        setDesc(t.note || '');
        setAmount(String(t.amount));
        setCat(t.category);
        setType(t.type);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const add = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!desc.trim() || !amount || saving) return;
        setSaving(true);
        const payload = { type, amount: parseFloat(amount), category: cat, note: desc, emoji: CAT_EMOJI[cat] || '📦' };
        try {
            if (editingId) {
                const updated = await financeApi.update(editingId, payload);
                if (updated) setTxns(prev => prev.map(t => t._id === editingId ? updated : t));
            } else {
                const saved = await financeApi.create({ ...payload, date: today() });
                setTxns(prev => [saved, ...prev]);
            }
            resetForm();
        } catch {
            setError('Failed to save transaction.');
            toast.error('Failed to save transaction.');
        } finally { setSaving(false); }
    };

    const remove = async (id: string) => {
        try {
            await financeApi.remove(id);
            setTxns(prev => prev.filter(t => t._id !== id));
            if (editingId === id) resetForm();
        }
        catch { setError('Failed to delete.'); toast.error('Failed to delete.'); }
    };

    // Budget calculation from real data
    const spentByCategory = (c: string) => txns.filter(t => t.category === c && t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Monthly chart data
    const monthlyData = (() => {
        const map: Record<string, { income: number; expense: number }> = {};
        txns.forEach(t => {
            const m = (t.date || '').slice(0, 7);
            if (!m) return;
            if (!map[m]) map[m] = { income: 0, expense: 0 };
            if (t.type === 'income') map[m].income += t.amount; else map[m].expense += t.amount;
        });
        return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
    })();
    const chartMax = Math.max(1, ...monthlyData.flatMap(([, v]) => [v.income, v.expense]));
    const fmtMonth = (ym: string) => {
        const [y, m] = ym.split('-');
        return `${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m]}'${y.slice(2)}`;
    };

    return (
        <div className="space-y-6 pb-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">💰 Finance Tracker</h1>
                <p className="text-sm text-gray-500 mt-0.5">Track income, expenses & savings — PhonePe import coming soon</p>
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Balance', value: balance, color: 'text-violet-600', bg: 'bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-100' },
                    { label: 'Income', value: totalIncome, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                    { label: 'Expenses', value: totalExpense, color: 'text-red-500', bg: 'bg-red-50 border-red-100' },
                ].map(s => (
                    <div key={s.label} className={`rounded-2xl border p-5 ${s.bg}`}>
                        <p className="text-xs font-semibold text-gray-500 mb-1">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color}`}>{formatINR(s.value)}</p>
                    </div>
                ))}
            </div>

            {/* Budget progress bars — editable, persisted per category */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-800 mb-1">Budget Overview</h2>
                <p className="text-xs text-gray-400 mb-4">Set a monthly limit per category — click a limit to edit it.</p>
                <div className="space-y-3">
                    {CATEGORIES.filter(c => c !== 'Income').map(c => {
                        const limit = budgetFor(c);
                        const spent = spentByCategory(c);
                        const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
                        const isOver = limit > 0 && spent >= limit * 0.8;
                        return (
                            <div key={c}>
                                <div className="flex justify-between items-center text-xs font-medium text-gray-600 mb-1">
                                    <span>{CAT_EMOJI[c]} {c}</span>
                                    <span className={isOver ? 'text-red-500' : ''}>
                                        {formatINR(spent)} / {' '}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const v = window.prompt(`Monthly budget for ${c} (₹):`, String(limit));
                                                if (v !== null) { const n = parseInt(v, 10); if (!Number.isNaN(n) && n >= 0) saveBudget(c, n); }
                                            }}
                                            className="underline decoration-dotted hover:text-violet-600"
                                        >
                                            {formatINR(limit)}
                                        </button>
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Monthly Income vs Expense chart ── */}
            {monthlyData.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h2 className="text-sm font-bold text-gray-800 mb-4">Monthly Overview</h2>
                    <div className="flex items-end gap-3 h-36 overflow-x-auto pb-1">
                        {monthlyData.map(([month, vals]) => (
                            <div key={month} className="flex-1 min-w-[54px] flex flex-col items-center gap-1">
                                <div className="flex items-end gap-1 h-28 w-full">
                                    {/* Income bar */}
                                    <div className="flex-1 flex flex-col justify-end">
                                        <div className="bg-emerald-400 rounded-t-md transition-all duration-500 min-h-[2px]"
                                            style={{ height: `${Math.round((vals.income / chartMax) * 100)}%` }}
                                            title={`Income: ${formatINR(vals.income)}`} />
                                    </div>
                                    {/* Expense bar */}
                                    <div className="flex-1 flex flex-col justify-end">
                                        <div className="bg-red-400 rounded-t-md transition-all duration-500 min-h-[2px]"
                                            style={{ height: `${Math.round((vals.expense / chartMax) * 100)}%` }}
                                            title={`Expense: ${formatINR(vals.expense)}`} />
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{fmtMonth(month)}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 mt-2 pt-3 border-t border-gray-50">
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-400" /><span className="text-xs text-gray-500">Income</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-400" /><span className="text-xs text-gray-500">Expense</span></div>
                    </div>
                </div>
            )}

            {/* Add transaction */}
            <form onSubmit={add} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-800 mb-3">{editingId ? '✏️ Edit Transaction' : '+ Add Transaction'}</h2>
                <div className="flex flex-wrap gap-2">
                    <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" className="flex-1 min-w-[140px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="₹ Amount" className="w-32 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    <select value={cat} onChange={e => setCat(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <select value={type} onChange={e => setType(e.target.value as 'expense' | 'income')} className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                    </select>
                    <button type="submit" disabled={saving || !desc.trim() || !amount} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Update' : 'Save'}</button>
                    {editingId && <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>}
                </div>
            </form>

            {/* Transaction list */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-50"><h2 className="text-sm font-bold text-gray-800">All Transactions</h2></div>
                {loading ? (
                    <div className="flex items-center justify-center py-10"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-violet-500" /></div>
                ) : txns.length === 0 ? (
                    <div className="text-center py-10 text-gray-400"><p className="text-3xl mb-2">💸</p><p className="text-sm">No transactions yet. Add your first above!</p></div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {txns.map(t => (
                            <div key={t._id} className="group flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                                <span className="text-xl">{CAT_EMOJI[t.category] || '📦'}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800">{t.note || t.category}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLOR[t.category] || 'bg-gray-100 text-gray-600'}`}>{t.category}</span>
                                        <span className="text-[10px] text-gray-400">{t.date}</span>
                                    </div>
                                </div>
                                <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {t.type === 'income' ? '+' : '-'}{formatINR(t.amount)}
                                </span>
                                <button onClick={() => startEdit(t)} title="Edit" className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-violet-500 hover:bg-violet-50 transition-all">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => remove(t._id)} title="Delete" className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
