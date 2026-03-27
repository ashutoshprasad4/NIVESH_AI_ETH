'use client';
import { useState, useEffect } from 'react';
import { searchStocks, NSE_STOCKS } from '@/lib/nse-stocks';
import { Search, Star, StarOff, Trash2, TrendingUp, TrendingDown, Target, Bell, StickyNote, BarChart2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface WatchlistStock {
  symbol: string;
  name: string;
  addedAt: string;
  targetPrice?: number;
  stopLoss?: number;
  notes?: string;
  alertEnabled?: boolean;
}

interface LiveData {
  currentPrice: number;
  changePercent: number;
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([]);
  const [liveData, setLiveData] = useState<Record<string, LiveData>>({});
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<WatchlistStock>>({});

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('algo_watchlist');
    if (saved) {
      try { setWatchlist(JSON.parse(saved)); } catch { }
    }
    // else: start with empty list — user adds their own stocks
  }, []);

  // Save to localStorage whenever watchlist changes (including empty)
  useEffect(() => {
    localStorage.setItem('algo_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Fetch live prices with AbortController and race condition protection
  useEffect(() => {
    if (watchlist.length === 0) {
      setLiveData({});
      return;
    }

    const controller = new AbortController();

    const fetchPrices = async () => {
      const results: Record<string, LiveData> = {};

      // Use a local copy to avoid closure issues during the long fetch
      const symbolsToFetch = watchlist.map(s => s.symbol);

      try {
        // Fetch in smaller batches or with a bit more care
        // For now, parallel is fine but we add an AbortSignal
        await Promise.all(symbolsToFetch.map(async (sym) => {
          try {
            const res = await fetch(`/api/market?symbol=${sym}&period=5d&interval=1d`, { signal: controller.signal });
            const data = await res.json();
            if (!data.error) results[sym] = { currentPrice: data.currentPrice, changePercent: data.changePercent };
          } catch (e: any) {
            if (e.name !== 'AbortError') console.error(`Watchlist fetch failed for ${sym}`, e);
          }
        }));

        if (!controller.signal.aborted) {
          setLiveData(prev => ({ ...prev, ...results }));
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') console.error("Watchlist fetchAll failed", e);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5 * 60 * 1000); // 5 min refresh

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [watchlist.map(s => s.symbol).join(',')]);

  const addToWatchlist = (sym: string, name: string) => {
    if (watchlist.find(s => s.symbol === sym)) return;
    const newStock: WatchlistStock = { symbol: sym, name, addedAt: new Date().toLocaleDateString('en-IN') };
    setWatchlist(prev => [...prev, newStock]);
    setSearchInput(''); setSuggestions([]); setShowSuggestions(false);
  };

  const removeFromWatchlist = (sym: string) => {
    setWatchlist(prev => prev.filter(s => s.symbol !== sym));
  };

  const saveEdit = (sym: string) => {
    setWatchlist(prev => prev.map(s => s.symbol === sym ? { ...s, ...editValues } : s));
    setEditingStock(null); setEditValues({});
  };

  const toEdit = (stock: WatchlistStock) => {
    setEditingStock(stock.symbol);
    setEditValues({ targetPrice: stock.targetPrice, stopLoss: stock.stopLoss, notes: stock.notes });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0E0F14] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-yellow-500/20 p-2 rounded-xl border border-yellow-500/30">
              <Star size={22} className="text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">My Watchlist</h1>
              <p className="text-xs text-gray-500 mt-0.5">Track your chosen stocks with target prices, stop-losses, and personal notes</p>
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-500 bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl">
          {watchlist.length} stocks tracked
        </div>
      </div>

      {/* UX Feature Callout */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-5 py-4 text-sm text-gray-400 leading-relaxed">
        <span className="text-blue-400 font-semibold">💡 Pro Tips:</span> Set a <strong className="text-gray-300">Target Price</strong> to know when to book profits. Add a <strong className="text-gray-300">Stop-Loss</strong> to protect against steep falls. Click any stock to open its full chart analysis.
      </div>

      {/* Search + Add */}
      <div className="relative max-w-md">
        <form onSubmit={e => {
          e.preventDefault();
          if (!searchInput.trim()) return;
          // If exactly one suggestion, add it; otherwise try to add as typed symbol
          if (suggestions.length === 1) {
            addToWatchlist(suggestions[0].symbol, suggestions[0].name);
          } else {
            let sym = searchInput.trim().toUpperCase();
            if (!sym.endsWith('.NS') && !sym.endsWith('.BO')) sym += '.NS';
            addToWatchlist(sym, sym.replace('.NS', ''));
          }
        }} className="flex items-center gap-2 bg-gray-900 border border-gray-700 focus-within:border-yellow-500 rounded-xl px-4 py-3">
          <Search size={16} className="text-gray-500" />
          <input
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setSuggestions(searchStocks(e.target.value)); setShowSuggestions(true); }}
            onFocus={() => { if (searchInput) setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
            placeholder="Search company or symbol and press Enter…"
          />
          {searchInput && (
            <button type="submit" className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-1 rounded shrink-0">Add</button>
          )}
        </form>
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 mt-1 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            {suggestions.map(s => (
              <button key={s.symbol}
                onMouseDown={e => { e.preventDefault(); addToWatchlist(s.symbol, s.name); }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800 text-left border-b border-gray-800/60 last:border-0 transition-colors">
                <div>
                  <div className="text-sm font-semibold text-gray-100">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.symbol}</div>
                </div>
                <Star size={14} className="text-yellow-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Watchlist Table */}
      {watchlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <StarOff size={40} className="text-gray-700" />
          <p className="text-gray-500">Your watchlist is empty. Search above to add stocks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {watchlist.map((stock) => {
            const live = liveData[stock.symbol];
            const price = live?.currentPrice;
            const pct = live?.changePercent;
            const isUp = (pct ?? 0) >= 0;
            const atTarget = price && stock.targetPrice && price >= stock.targetPrice;
            const atStop = price && stock.stopLoss && price <= stock.stopLoss;

            return (
              <div key={stock.symbol} className={`bg-gray-900/60 border rounded-2xl p-5 transition-all ${atTarget ? 'border-green-500/50 bg-green-500/5' : atStop ? 'border-red-500/50 bg-red-500/5' : 'border-gray-800 hover:border-gray-700'}`}>
                <div className="flex items-start gap-4">
                  {/* Stock info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/charts?symbol=${stock.symbol}`} className="font-bold text-gray-100 hover:text-blue-400 transition-colors flex items-center gap-1">
                        {stock.symbol.replace('.NS', '')} <ExternalLink size={12} />
                      </Link>
                      <span className="text-xs text-gray-500 truncate">{stock.name}</span>
                      {atTarget && <span className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-bold">🎯 Target Hit!</span>}
                      {atStop && <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">⛔ Stop-Loss Hit!</span>}
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-3 mt-2">
                      {price ? (
                        <>
                          <span className="font-mono text-xl font-bold text-gray-100">₹{Number(price).toFixed(2)}</span>
                          <span className={`flex items-center gap-1 text-sm font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                            {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                            {isUp ? '+' : ''}{Number(pct).toFixed(2)}%
                          </span>
                        </>
                      ) : (
                        <div className="h-6 w-32 bg-gray-800 rounded animate-pulse" />
                      )}
                    </div>

                    {/* Target / Stop / Notes display */}
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {stock.targetPrice && (
                        <div className="flex items-center gap-1 text-xs text-green-400">
                          <Target size={11} /> Target: <span className="font-mono font-bold">₹{stock.targetPrice}</span>
                          {price && <span className="text-gray-500 ml-1">({price < stock.targetPrice ? `+${((stock.targetPrice / price - 1) * 100).toFixed(1)}%` : 'Reached'})</span>}
                        </div>
                      )}
                      {stock.stopLoss && (
                        <div className="flex items-center gap-1 text-xs text-red-400">
                          <Bell size={11} /> Stop-Loss: <span className="font-mono font-bold">₹{stock.stopLoss}</span>
                        </div>
                      )}
                      {stock.notes && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <StickyNote size={11} /> <span className="italic truncate max-w-[200px]">{stock.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/charts?symbol=${stock.symbol}`}
                      className="p-2 rounded-lg bg-gray-800 hover:bg-blue-500/20 hover:text-blue-400 text-gray-400 transition-all" title="Open Chart">
                      <BarChart2 size={15} />
                    </Link>
                    <button onClick={() => toEdit(stock)}
                      className="p-2 rounded-lg bg-gray-800 hover:bg-yellow-500/20 hover:text-yellow-400 text-gray-400 transition-all" title="Set Target / Stop">
                      <Target size={15} />
                    </button>
                    <button onClick={() => removeFromWatchlist(stock.symbol)}
                      className="p-2 rounded-lg bg-gray-800 hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition-all" title="Remove">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Inline edit panel */}
                {editingStock === stock.symbol && (
                  <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">🎯 Target Price (₹)</label>
                      <input type="number" value={editValues.targetPrice ?? ''} onChange={e => setEditValues(v => ({ ...v, targetPrice: Number(e.target.value) }))}
                        className="w-full bg-gray-800 border border-gray-700 text-sm text-gray-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">⛔ Stop-Loss (₹)</label>
                      <input type="number" value={editValues.stopLoss ?? ''} onChange={e => setEditValues(v => ({ ...v, stopLoss: Number(e.target.value) }))}
                        className="w-full bg-gray-800 border border-gray-700 text-sm text-gray-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[11px] text-gray-500 mb-1 block">📝 Notes</label>
                      <input value={editValues.notes ?? ''} onChange={e => setEditValues(v => ({ ...v, notes: e.target.value }))}
                        placeholder="Your trade thesis, entry reason…"
                        className="w-full bg-gray-800 border border-gray-700 text-sm text-gray-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-600" />
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <button onClick={() => saveEdit(stock.symbol)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded-lg font-medium transition-colors">Save</button>
                      <button onClick={() => setEditingStock(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm py-2 rounded-lg font-medium transition-colors">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}