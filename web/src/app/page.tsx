'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import SignalCard from '@/components/SignalCard';
import { TrendingUp, TrendingDown, ArrowRight, RefreshCw, Activity } from 'lucide-react';

const TOP_STOCKS = ['HDFCBANK.NS', 'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'SBIN.NS', 'AXISBANK.NS'];
const INDICES = ['^NSEI', '^BSESN'];

export default function Dashboard() {
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const [indices, setIndices] = useState<Record<string, any>>({});
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState('');

  useEffect(() => {
    setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const fetchAll = async (isInitial = false, signal?: AbortSignal) => {
      // 1. Try loading from cache first
      if (isInitial) {
        const cached = localStorage.getItem('niveshai_dashboard_cache');
        if (cached) {
          try {
            const { quotes: cQ, indices: cI, signals: cS, timestamp } = JSON.parse(cached);
            const isFresh = Date.now() - timestamp < 300000;
            if (cQ) setQuotes(cQ);
            if (cI) setIndices(cI);
            if (cS) setSignals(cS || []);
            if (isFresh) {
              setLoading(false);
              return;
            }
          } catch (e) { console.error("Cache parse error", e); }
        }
      }

      if (isInitial) setLoading(true);

      try {
        // Prepare batched symbols
        const allSymbols = [...INDICES, ...TOP_STOCKS].join(',');

        // Fetch market data (batched) and radar (parallel)
        const [marketRes, radarRes] = await Promise.all([
          fetch(`/api/market?symbol=${allSymbols}`, { signal }),
          fetch('/api/radar', { signal })
        ]);

        const marketData = await marketRes.json();
        const radarData = await radarRes.json();

        const newQuotes: Record<string, any> = {};
        const newIndices: Record<string, any> = {};

        // Parse batched market data
        TOP_STOCKS.forEach(sym => {
          if (marketData[sym] && !marketData[sym].error) {
            newQuotes[sym] = marketData[sym];
          }
        });
        INDICES.forEach(sym => {
          if (marketData[sym] && !marketData[sym].error) {
            newIndices[sym] = marketData[sym];
          }
        });

        const radarSignals = (radarData.signals || []).slice(0, 10);

        // 3. Update States
        setIndices(newIndices);
        setQuotes(newQuotes);
        setSignals(radarSignals);

        // 4. Update Cache
        localStorage.setItem('niveshai_dashboard_cache', JSON.stringify({
          quotes: newQuotes,
          indices: newIndices,
          signals: radarSignals,
          timestamp: Date.now()
        }));

      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error("Fetch all failed", e);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAll(true, controller.signal);
    const interval = setInterval(() => fetchAll(false, controller.signal), 30000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0E0F14] p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Market Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Live NSE Intelligence — AI-powered signal layer for Indian retail investors</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-900 border border-gray-800 px-4 py-2 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          NSE Live · {time || '—'}
        </div>
      </div>

      {/* Market Overview / Indices */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INDICES.map((sym) => {
            const d = indices[sym];
            const pct = d?.changePercent ?? 0;
            const price = d?.currentPrice ?? 0;
            const isUp = pct >= 0;
            const name = sym === '^NSEI' ? 'NIFTY 50' : 'SENSEX';
            return (
              <div key={sym} className="bg-gradient-to-br from-gray-900 to-gray-800/50 border border-gray-800 rounded-2xl p-5 flex items-center justify-between group overflow-hidden relative">
                <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                  <Activity size={120} />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-1">{name}</div>
                  {loading || !d ? (
                    <div className="h-8 w-32 bg-gray-800 rounded animate-pulse"></div>
                  ) : (
                    <div className="text-2xl font-mono font-bold text-white leading-none">
                      {Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {loading || !d ? (
                    <div className="h-5 w-16 bg-gray-800 rounded animate-pulse ml-auto"></div>
                  ) : (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${isUp ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {isUp ? '+' : ''}{Number(pct).toFixed(2)}%
                    </div>
                  )}
                  <div className="text-[10px] text-gray-500 mt-1 font-medium italic">NSE Real-time</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Market Pulse */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Market Pulse</h2>
          <div className="h-px flex-1 bg-gray-800 mx-4"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TOP_STOCKS.map((sym) => {
            const d = quotes[sym];
            const pct = d?.changePercent ?? 0;
            const price = d?.currentPrice ?? 0;
            const isUp = pct >= 0;
            return (
              <Link href={`/charts?symbol=${sym}`} key={sym}
                className="bg-gray-900/40 border border-gray-800/80 hover:border-blue-500/50 rounded-xl p-4 transition-all group hover:bg-gray-800/60 shadow-lg hover:shadow-blue-500/5">
                <div className="text-xs text-gray-500 font-bold mb-2 group-hover:text-blue-400 transition-colors uppercase">{sym.replace('.NS', '')}</div>
                {loading || !d ? (
                  <div className="space-y-2">
                    <div className="h-5 w-20 bg-gray-800 rounded animate-pulse"></div>
                    <div className="h-3 w-12 bg-gray-800 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    <div className="font-mono font-bold text-lg text-gray-100 italic">₹{Number(price).toFixed(1)}</div>
                    <div className={`flex items-center gap-1 text-xs font-bold mt-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {isUp ? '+' : ''}{Number(pct).toFixed(2)}%
                    </div>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Trending Tickers Horizontal (Removed or Kept? User said Replace AI Modules, I'll keep this but the user might want it gone too. Actually, I'll remove it to avoid redundancy) */}
      {/* ... (removed the previous horizontal trending section to match the more focused screenshot request) */}

      {/* Two columns: Radar preview + Quick Nav */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Opportunities from Radar */}
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Today's Top Opportunities</h2>
            <Link href="/radar" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
              See All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />)
            ) : signals.length > 0 ? (
              signals.slice(0, 3).map((s, i) => (
                <SignalCard key={i} title={s.title} subtitle={`${s.symbol} · ₹${s.price}`}
                  badge={s.badge} badgeColor={s.badgeColor} confidence={s.confidence}
                  description={s.description} tag={s.type?.replace('_', ' ')} />
              ))
            ) : (
              <div className="text-gray-500 text-sm p-6 bg-gray-900 border border-gray-800 rounded-xl">
                No signals loaded yet. Radar is scanning NSE...
              </div>
            )}
          </div>
        </section>

        {/* Trending Tickers Sidebar (Vertical) */}
        <section className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-gray-100 mb-6">Trending tickers</h2>
          <div className="space-y-6">
            {['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ADANIGREEN.NS'].map((sym) => {
              const d = quotes[sym];
              const price = d?.currentPrice ?? 0;
              const pct = d?.changePercent ?? 0;
              const isUp = pct >= 0;
              const name = sym.replace('.NS', '');
              const fullName = {
                'RELIANCE.NS': 'Reliance Industries',
                'TCS.NS': 'Tata Consultancy Services',
                'HDFCBANK.NS': 'HDFC Bank Ltd',
                'INFY.NS': 'Infosys Limited',
                'ADANIGREEN.NS': 'Adani Green Energy',
                'AXISBANK.NS': 'Axis Bank Limited'
              }[sym] || name;

              return (
                <Link href={`/charts?symbol=${sym}`} key={sym} className="flex items-center justify-between group">
                  <div className="flex-1">
                    <div className="text-blue-400 font-bold text-sm group-hover:text-blue-300 transition-colors uppercase">{name}</div>
                    <div className="text-[10px] text-gray-500 font-medium truncate max-w-[100px]">{fullName}</div>
                  </div>

                  {/* Sparkline */}
                  <div className="flex-1 flex justify-center px-4">
                    <svg width="60" height="24" viewBox="0 0 60 24" fill="none" className="overflow-visible">
                      <path
                        d={isUp
                          ? "M0,18 L10,15 L20,20 L30,10 L40,15 L50,5 L60,8"
                          : "M0,5 L10,8 L20,3 L30,15 L40,10 L50,20 L60,18"}
                        stroke={isUp ? "#4ade80" : "#f87171"}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <defs>
                        <linearGradient id={`grad-${sym}`} x1="0" y1="0" x2="0" y2="24">
                          <stop offset="0%" stopColor={isUp ? "#4ade80" : "#f87171"} stopOpacity="0.2" />
                          <stop offset="100%" stopColor={isUp ? "#4ade80" : "#f87171"} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={isUp
                          ? "M0,18 L10,15 L20,20 L30,10 L40,15 L50,5 L60,8 V24 H0 Z"
                          : "M0,5 L10,8 L20,3 L30,15 L40,10 L50,20 L60,18 V24 H0 Z"}
                        fill={`url(#grad-${sym})`}
                      />
                    </svg>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-gray-100 italic">
                      {price ? Number(price).toFixed(2) : '—'}
                    </div>
                    <div className={`text-[10px] font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {isUp ? '+' : ''}{Number(pct).toFixed(2)}%
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <button className="w-full mt-8 py-2 text-xs font-bold text-gray-500 hover:text-blue-400 border border-gray-800 hover:border-blue-500/30 rounded-lg transition-all">
            View Market Map
          </button>
        </section>
      </div>
    </div>
  );
}