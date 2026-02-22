import { useState, useEffect, useCallback } from 'react';
import { financeApi, ITransaction } from '../services/personalApi';

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

const today = () => new Date().toISOString().slice(0, 10);
const formatINR = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function FinancePage() {
    const [txns, setTxns] = useState<ITransaction[]>([]);
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [cat, setCat] = useState('Food');
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try { setTxns(await financeApi.getAll()); }
        catch { setError('Could not load transactions.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const totalIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const add = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!desc.trim() || !amount) return;
        try {
            const saved = await financeApi.create({
                type, amount: parseFloat(amount), category: cat,
                note: desc, date: today(), emoji: CAT_EMOJI[cat] || '📦',
            });
            setTxns(prev => [saved, ...prev]);
            setDesc(''); setAmount('');
        } catch { setError('Failed to save transaction.'); }
    };

    const remove = async (id: string) => {
        try { await financeApi.remove(id); setTxns(prev => prev.filter(t => t._id !== id)); }
        catch { setError('Failed to delete.'); }
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

            {/* Budget progress bars (based on real data) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-800 mb-4">Budget Overview (from your transactions)</h2>
                <div className="space-y-3">
                    {[
                        { cat: 'Food', budget: 5000 }, { cat: 'Transport', budget: 2000 },
                        { cat: 'Entertainment', budget: 2000 }, { cat: 'Shopping', budget: 5000 },
                    ].map(b => {
                        const spent = spentByCategory(b.cat);
                        const pct = Math.min(100, Math.round((spent / b.budget) * 100));
                        const isOver = pct >= 80;
                        return (
                            <div key={b.cat}>
                                <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                                    <span>{CAT_EMOJI[b.cat]} {b.cat}</span>
                                    <span className={isOver ? 'text-red-500' : ''}>{formatINR(spent)} / {formatINR(b.budget)}</span>
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
                <h2 className="text-sm font-bold text-gray-800 mb-3">+ Add Transaction</h2>
                <div className="flex flex-wrap gap-2">
                    <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" className="flex-1 min-w-[140px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="₹ Amount" className="w-32 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    <select value={cat} onChange={e => setCat(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <select value={type} onChange={e => setType(e.target.value as any)} className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                    </select>
                    <button type="submit" className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors">Save</button>
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
                                <button onClick={() => remove(t._id)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
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
