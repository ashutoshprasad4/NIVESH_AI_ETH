'use client';
import { useState, useEffect } from 'react';
import { RefreshCw, Radar as RadarIcon, ChevronDown, ChevronUp, ExternalLink, Newspaper, Zap, TrendingUp, TrendingDown, AlertCircle, Bot, Settings, Sparkles } from 'lucide-react';

const TYPE_COLORS: Record<string, 'green' | 'red' | 'yellow' | 'blue'> = {
  INSIDER_BUY: 'green', BULK_DEAL: 'blue', FILING_CHANGE: 'yellow',
  PRICE_MOVE: 'green', NEWS_SIGNAL: 'blue', DEFAULT: 'blue'
};

const badgeStyles: Record<string, string> = {
  green: 'bg-green-500/15 text-green-400 border-green-500/30',
  red: 'bg-red-500/15 text-red-400 border-red-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const sentimentStyle: Record<string, string> = {
  BULLISH: 'text-green-400 bg-green-500/10 border-green-500/30',
  BEARISH: 'text-red-400 bg-red-500/10 border-red-500/30',
  NEUTRAL: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

function buildSignalPrompt(signal: any): string {
  const typeLabel: Record<string, string> = {
    INSIDER_BUY:    'Promoter/Insider Shareholding',
    FILING_CHANGE:  'Institutional (FII/DII) Holding',
    BULK_DEAL:      'Unusual Volume / Bulk Deal',
    PRICE_MOVE:     'Significant Price Move',
    NEWS_SIGNAL:    'News Sentiment Signal',
  };
  const label = typeLabel[signal.type] || signal.type;
  const priceStr = signal.price > 0 ? `₹${Number(signal.price).toFixed(2)}` : 'N/A';
  const changeStr = signal.pct_change
    ? `${signal.pct_change >= 0 ? '+' : ''}${Number(signal.pct_change).toFixed(2)}% today`
    : 'flat today';

  return `You are NIVESHAI, a concise AI market analyst for Indian retail investors (NSE/BSE).

A market signal has been detected. Analyse it and respond with exactly 2 short paragraphs.

--- SIGNAL DATA ---
Stock     : ${signal.symbol}
Signal    : ${label}
Summary   : ${signal.description}
Price     : ${priceStr}  |  Change: ${changeStr}
Confidence: ${signal.confidence}%
Badge     : ${signal.badge}
Headline  : ${signal.detail?.headline || signal.title}
-------------------

Paragraph 1 — "What This Means":
In 2-3 sentences, explain what this specific signal means for ${signal.symbol} in the Indian market context. Reference the actual numbers given. Do NOT use generic statements.

Paragraph 2 — "What Should You Do":
In 2-3 sentences, give a concrete, actionable recommendation for a retail investor. Include specific price levels (entry, stop-loss, or watch zone) where appropriate based on the data above.

Format: Write ONLY the two paragraphs, separated by a single blank line. No headers, no bullet points, no markdown symbols.`;
}

function ExpandableSignalCard({ signal, apiKey, apiProvider }: { signal: any; apiKey: string; apiProvider: string }) {
  const [expanded, setExpanded]         = useState(false);
  const [aiWhat,   setAiWhat]           = useState('');
  const [aiAction, setAiAction]         = useState('');
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiError,   setAiError]         = useState('');
  const [aiFetched, setAiFetched]       = useState(false);

  const color   = signal.badgeColor || 'blue';
  const IconMap: Record<string, any> = { green: TrendingUp, red: TrendingDown, yellow: AlertCircle, blue: AlertCircle };
  const Icon    = IconMap[color];
  const hasKey  = apiKey && !apiKey.includes('your_gemini_api_key_here');

  const fetchAIExplanation = async () => {
    if (aiLoading) return;
    if (!hasKey) return;
    setAiLoading(true);
    setAiError('');
    setAiFetched(false);
    try {
      const res  = await fetch('/api/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol:       signal.symbol,
          price:        signal.price,
          pattern:      signal.type,
          user_level:   'Beginner',
          apiKey,
          provider:     apiProvider,
          messages:     [],
          userMessage:  buildSignalPrompt(signal),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const text       = (data.explanation || '').trim();
      const paragraphs = text.split(/\n{2,}/).map((p: string) => p.trim()).filter(Boolean);
      setAiWhat(paragraphs[0]   || text);
      setAiAction(paragraphs[1] || '');
      setAiFetched(true);
    } catch (e: any) {
      setAiError(e.message || 'AI generation failed.');
    }
    setAiLoading(false);
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !aiFetched && !aiLoading) fetchAIExplanation();
  };

  return (
    <div className={`bg-gray-900/60 border rounded-2xl overflow-hidden transition-all ${expanded ? 'border-blue-500/50 shadow-lg shadow-blue-500/5' : 'border-gray-800 hover:border-gray-700'}`}>
      {/* Card Header */}
      <button className="w-full text-left p-5" onClick={handleExpand}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-gray-100 text-[15px]">{signal.title}</span>
              {signal.type && (
                <span className="text-[10px] bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full uppercase tracking-wider">{signal.type.replace('_', ' ')}</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-2">{signal.symbol} {signal.price ? `· ₹${Number(signal.price).toFixed(2)}` : ''} {signal.pct_change ? `· ${signal.pct_change >= 0 ? '+' : ''}${Number(signal.pct_change).toFixed(2)}% today` : ''}</p>
            <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">{signal.description}</p>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <span className={`text-xs font-bold border px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${badgeStyles[color]}`}>
              <Icon size={11} />{signal.badge}
            </span>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-600">Confidence</span>
                <span className="text-xs font-bold text-gray-300">{signal.confidence}%</span>
              </div>
              <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${(signal.confidence ?? 0) > 70 ? 'bg-green-500' : (signal.confidence ?? 0) > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${signal.confidence}%` }} />
              </div>
            </div>
            <span className="text-xs font-medium text-blue-400 flex items-center gap-1 mt-1">
              {expanded ? <><ChevronUp size={12} />Less</> : <><ChevronDown size={12} />Explain</>}
            </span>
          </div>
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && signal.detail && (
        <div className="border-t border-gray-800 bg-gray-950/50 p-5 space-y-4">
          {/* Source row */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                {aiFetched && !aiError
                  ? <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles size={9} />AI Generated</span>
                  : <span className="text-[10px] text-gray-500">📰 {signal.detail.publisher} · {signal.detail.published_at}</span>
                }
              </div>
            </div>
            {signal.detail.link && (
              <a href={signal.detail.link} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 shrink-0">
                <ExternalLink size={14} />
              </a>
            )}
          </div>

          {/* Loading state */}
          {aiLoading && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                <Bot size={18} className="text-purple-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-300 font-medium">NIVESHAI is analysing {signal.symbol}&hellip;</p>
                <div className="flex gap-1">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No API key */}
          {!hasKey && !aiLoading && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center">
                <Bot size={22} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-1">AI Explanation Not Available</p>
                <p className="text-xs text-gray-500 max-w-xs">Add your Gemini or OpenAI API key in
                  <span className="text-purple-400 font-medium"> ⚙ Settings </span>
                  above to unlock AI-powered insights for every signal.
                </p>
              </div>
            </div>
          )}

          {/* AI error — full error panel with retry */}
          {aiError && !aiLoading && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle size={16} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-400 mb-0.5">AI Analysis Failed</p>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed break-words">{aiError}</p>
                <button
                  onClick={e => { e.stopPropagation(); setAiError(''); setAiFetched(false); fetchAIExplanation(); }}
                  className="text-xs font-semibold text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                >
                  <RefreshCw size={11} /> Try Again
                </button>
              </div>
            </div>
          )}

          {/* AI success — What it means */}
          {aiFetched && !aiError && aiWhat && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">🧠 What This Means</span>
                <Sparkles size={10} className="text-purple-400" />
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{aiWhat}</p>
            </div>
          )}

          {/* AI success — Action */}
          {aiFetched && !aiError && aiAction && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-widest">💡 What Should You Do?</span>
                <Sparkles size={10} className="text-purple-400" />
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{aiAction}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RadarPage() {
  const [signals, setSignals]         = useState<any[]>([]);
  const [news, setNews]               = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [filter, setFilter]           = useState('ALL');
  const [activeTab, setActiveTab]     = useState<'signals' | 'news'>('signals');
  const [lastRefresh, setLastRefresh] = useState('');
  const [apiKey, setApiKey]           = useState(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
  const [apiProvider, setApiProvider] = useState('gemini-3');
  const [showSettings, setShowSettings] = useState(false);

  const loadSignals = async (isInitial = false, signal?: AbortSignal) => {
    if (isInitial) {
      const cached = localStorage.getItem('niveshai_radar_cache');
      if (cached) {
        try {
          const { signals: cS, news: cN, timestamp } = JSON.parse(cached);
          const isFresh = Date.now() - timestamp < 600000; // 10 min TTL
          setSignals(cS || []);
          setNews(cN || []);
          if (isFresh) {
            setLoading(false);
            return;
          }
        } catch (e) { console.error("Radar cache error", e); }
      }
    }

    setLoading(isInitial); setError('');
    try {
      const res = await fetch('/api/radar', { signal });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSignals(data.signals || []);
      setNews(data.news || []);
      setLastRefresh(new Date().toLocaleTimeString('en-IN'));

      localStorage.setItem('niveshai_radar_cache', JSON.stringify({
        signals: data.signals,
        news: data.news,
        timestamp: Date.now()
      }));
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    loadSignals(true, controller.signal);
    return () => controller.abort();
  }, []);

  const filtered = filter === 'ALL' ? signals : signals.filter(s => s.type === filter);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0E0F14] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600/20 p-2 rounded-xl border border-blue-500/30">
            <RadarIcon size={22} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Opportunity Radar</h1>
            <p className="text-xs text-gray-500 mt-0.5">AI signal-finder · insider activity, bulk deals, news, filings & price moves</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && <span className="text-[11px] text-gray-500">Updated {lastRefresh}</span>}
          <button onClick={() => setShowSettings(v => !v)}
            className={`p-2 rounded-xl border transition-all ${showSettings ? 'border-purple-500/50 text-purple-400 bg-purple-500/10' : 'border-gray-800 text-gray-500 hover:text-gray-300'}`}>
            <Settings size={15} />
          </button>
          <button onClick={() => loadSignals()} className="flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-blue-500 px-4 py-2 rounded-xl text-sm text-gray-300 hover:text-white transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* AI Key Settings Panel */}
      {showSettings && (
        <div className="bg-gray-900/80 border border-purple-500/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Bot size={14} className="text-purple-400" />
            <span className="text-sm font-semibold text-gray-300">AI Explanation Settings</span>
            <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full ml-1">Powers signal explanations</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            <select value={apiProvider} onChange={e => setApiProvider(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-sm text-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500">
              <option value="gemini-3">Gemini 3 Flash Preview</option>
              <option value="gemini-2.0">Gemini 2.0 Flash</option>
              <option value="gemini-1.5">Gemini 1.5 Flash</option>
              <option value="openai">OpenAI GPT-3.5</option>
            </select>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder="Paste Gemini or OpenAI API key…"
              className="flex-1 min-w-48 bg-gray-800 border border-gray-700 text-sm text-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-gray-600" />
          </div>
          <p className="text-[11px] text-gray-600">When a key is set, clicking Explain on any signal card will generate a unique AI analysis for that specific stock signal.</p>
        </div>
      )}

      {/* How it works */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-5 py-4 text-sm text-gray-400 leading-relaxed">
        <span className="text-blue-400 font-semibold">📡 How Radar Works:</span> Every alert is a detected market signal — not a summary. Click <strong className="text-gray-300">Explain</strong> on any card to see exactly what the signal means in plain English and what action a retail investor should take.
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-0">
        <button onClick={() => setActiveTab('signals')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${activeTab === 'signals' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          <Zap size={15} /> Signals ({signals.length})
        </button>
        <button onClick={() => setActiveTab('news')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${activeTab === 'news' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          <Newspaper size={15} /> Market News ({news.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500 gap-3">
          <RefreshCw className="animate-spin text-blue-500" size={22} />
          <span className="animate-pulse text-sm">Scanning NSE universe for signals…</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-red-400 text-sm">{error}</div>
      ) : activeTab === 'signals' ? (
        <>
          {/* Filter Chips */}
          <div className="flex gap-2 flex-wrap">
            {['ALL', 'INSIDER_BUY', 'BULK_DEAL', 'FILING_CHANGE', 'PRICE_MOVE', 'NEWS_SIGNAL'].map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${filter === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'}`}>
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-gray-500 text-sm p-8 bg-gray-900 border border-gray-800 rounded-xl text-center">No signals matched the selected filter.</div>
            ) : filtered.map((s, i) => (
              <ExpandableSignalCard key={i} signal={s} apiKey={apiKey} apiProvider={apiProvider} />
            ))}
          </div>
        </>
      ) : (
        /* News Tab */
        <div className="space-y-3">
          {news.length === 0 ? (
            <div className="text-gray-500 text-sm p-8 bg-gray-900 border border-gray-800 rounded-xl text-center">No news loaded. Refresh to scan latest headlines.</div>
          ) : news.map((item, i) => {
            const hasLink = item.link && item.link.startsWith('http');
            const Wrapper = hasLink ? 'a' : 'div';
            const wrapperProps = hasLink
              ? { href: item.link, target: '_blank', rel: 'noopener noreferrer' }
              : {};

            return (
              <Wrapper key={i} {...wrapperProps as any}
                className="flex items-start gap-4 bg-gray-900/60 border border-gray-800 hover:border-blue-500/40 rounded-xl p-4 transition-all group">
                <Newspaper size={18} className="text-gray-600 shrink-0 mt-0.5 group-hover:text-blue-400 transition-colors" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-bold text-gray-300 bg-gray-800 px-2 py-0.5 rounded">{item.symbol}</span>
                    <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${sentimentStyle[item.sentiment] || sentimentStyle.NEUTRAL}`}>{item.sentiment}</span>
                    <span className="text-[11px] text-gray-600">{item.publisher} · {item.published_at}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed group-hover:text-white transition-colors">{item.title}</p>
                </div>
                {hasLink
                  ? <ExternalLink size={13} className="text-gray-700 group-hover:text-blue-400 shrink-0 transition-colors" />
                  : <span className="text-[10px] text-gray-700 shrink-0 mt-1">No link</span>
                }
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}