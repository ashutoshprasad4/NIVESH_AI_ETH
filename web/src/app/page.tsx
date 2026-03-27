'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import SignalCard from '@/components/SignalCard';
import { TrendingUp, TrendingDown, ArrowRight, RefreshCw, Activity } from 'lucide-react';

const TOP_STOCKS = ['HDFCBANK.NS', 'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'SBIN.NS', 'ETERNAL.NS'];

export default function Dashboard() {
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState('');

  useEffect(() => {
    setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const results: Record<string, any> = {};
        await Promise.all(TOP_STOCKS.map(async (sym) => {
          const r = await fetch(`/api/market?symbol=${sym}`);
          const d = await r.json();
          results[sym] = d;
        }));
        setQuotes(results);

        const radarRes = await fetch('/api/radar');
        const radarData = await radarRes.json();
        setSignals((radarData.signals || []).slice(0, 3));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchAll();
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

      {/* Market Pulse */}
      <section>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Market Pulse</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TOP_STOCKS.map((sym) => {
            const d = quotes[sym];
            const pct = d?.changePercent ?? 0;
            const price = d?.currentPrice ?? 0;
            const isUp = pct >= 0;
            return (
              <Link href={`/charts?symbol=${sym}`} key={sym}
                className="bg-gray-900/60 border border-gray-800 hover:border-blue-500/50 rounded-xl p-4 transition-all group">
                <div className="text-xs text-gray-500 font-medium mb-1">{sym.replace('.NS', '')}</div>
                {loading || !d ? (
                  <div className="h-5 w-24 bg-gray-800 rounded animate-pulse"></div>
                ) : (
                  <>
                    <div className="font-mono font-bold text-lg text-gray-100">₹{Number(price).toFixed(1)}</div>
                    <div className={`flex items-center gap-1 text-xs font-semibold mt-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {isUp ? '+' : ''}{Number(pct).toFixed(2)}%
                    </div>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </section>

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
              signals.map((s, i) => (
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

        {/* Quick Links */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">AI Modules</h2>
          <div className="space-y-3">
            <Link href="/radar" className="block bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-500/30 hover:border-blue-400 rounded-xl p-5 transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <Activity size={20} className="text-blue-400" />
                <h3 className="font-bold text-gray-100">Opportunity Radar</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">AI monitors insider trades, bulk deals, filings & news — surfaces missed signals daily.</p>
              <div className="flex items-center gap-1 text-xs text-blue-400 mt-3 group-hover:gap-2 transition-all">Open Radar <ArrowRight size={12} /></div>
            </Link>
            <Link href="/charts" className="block bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-500/30 hover:border-purple-400 rounded-xl p-5 transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp size={20} className="text-purple-400" />
                <h3 className="font-bold text-gray-100">Chart Intelligence</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">Real-time pattern detection — breakouts, reversals, support/resistance — with backtested win rates + GPT explanation.</p>
              <div className="flex items-center gap-1 text-xs text-purple-400 mt-3 group-hover:gap-2 transition-all">Analyze Charts <ArrowRight size={12} /></div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
