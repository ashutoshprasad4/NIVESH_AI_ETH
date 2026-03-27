'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Chart } from '@/components/Chart';
import SignalCard from '@/components/SignalCard';
import { Search, RefreshCw, Bot, BarChart2, TrendingUp, TrendingDown, Minus, Settings, Send, Trash2 } from 'lucide-react';
import { searchStocks } from '@/lib/nse-stocks';

type ChatMessage = { role: 'user' | 'assistant'; content: string; pattern?: string };

// Timeframe config: label → { period, interval }
const TIMEFRAMES: Record<string, { period: string; interval: string }> = {
  '5D':  { period: '5d',  interval: '30m' },
  '1M':  { period: '1mo', interval: '1d' },
  '3M':  { period: '3mo', interval: '1d' },
  '6M':  { period: '6mo', interval: '1d' },
  '1Y':  { period: '1y',  interval: '1d' },
  '3Y':  { period: '3y',  interval: '1wk' },
};

function PatternBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    BULLISH: 'text-green-400 bg-green-500/10 border-green-500/30',
    BEARISH: 'text-red-400 bg-red-500/10 border-red-500/30',
    ALERT:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
  };
  const icons: Record<string, any> = { BULLISH: TrendingUp, BEARISH: TrendingDown, ALERT: Minus };
  const Icon = icons[type] || Minus;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold border px-2 py-0.5 rounded-md ${styles[type] || styles.ALERT}`}>
      <Icon size={10}/>{type}
    </span>
  );
}

export default function ChartsPage() {
  const searchParams = useSearchParams();
  const [symbol, setSymbol]         = useState(searchParams.get('symbol') || 'HDFCBANK.NS');
  const [searchInput, setSearchInput] = useState((searchParams.get('symbol') || 'HDFCBANK.NS').replace('.NS',''));
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [timeframe, setTimeframe]   = useState('6M');
  const [chartType, setChartType]   = useState<'candlestick' | 'line'>('candlestick');
  const [chartData, setChartData]   = useState<any[]>([]);
  const [patternData, setPatternData] = useState<any>(null);
  const [loadingChart, setLoadingChart]     = useState(false);
  const [loadingPatterns, setLoadingPatterns] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [userLevel, setUserLevel]       = useState('Beginner');
  const [apiKey, setApiKey]             = useState('');
  const [apiProvider, setApiProvider]   = useState('gemini-3');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<any>(null);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadChart = async (sym: string, tf: string) => {
    setLoadingChart(true);
    const { period, interval } = TIMEFRAMES[tf];
    try {
      const res = await fetch(`/api/market?symbol=${sym}&period=${period}&interval=${interval}`);
      const data = await res.json();
      if (!data.error) setChartData(data.historical || []);
    } catch {}
    setLoadingChart(false);
  };

  const loadPatterns = async (sym: string) => {
    setLoadingPatterns(true); setMessages([]); setSelectedPattern(null);
    try {
      const res = await fetch(`/api/patterns?symbol=${sym}`);
      const data = await res.json();
      if (!data.error) setPatternData(data);
    } catch {}
    setLoadingPatterns(false);
  };

  // Auto scroll on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadChart(symbol, timeframe);
  }, [symbol, timeframe]);

  useEffect(() => {
    loadPatterns(symbol);
  }, [symbol]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    setSuggestions(searchStocks(val));
    setShowSuggestions(true);
  };

  const selectSymbol = (sym: string) => {
    setSymbol(sym);
    setSearchInput(sym.replace('.NS', '').replace('.BO', ''));
    setShowSuggestions(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let sym = searchInput.trim().toUpperCase();
    if (!sym.endsWith('.NS') && !sym.endsWith('.BO')) sym += '.NS';
    selectSymbol(sym);
  };

  const sendMessage = async (userMsg: string, pattern?: any) => {
    if (!apiKey) {
      setMessages(prev => [...prev, 
        { role: 'user', content: userMsg },
        { role: 'assistant', content: '⚠️ Please add your API key by clicking the ⚙️ settings icon above.' }
      ]);
      return;
    }
    const p = pattern || patternData?.patterns?.[0];
    if (pattern) setSelectedPattern(pattern);

    const userChatMsg: ChatMessage = { role: 'user', content: userMsg, pattern: p?.name };
    const updatedMessages = [...messages, userChatMsg];
    setMessages(updatedMessages);
    setChatInput('');
    setIsGenerating(true);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          price: patternData?.current_price,
          pattern: p?.name,
          user_level: userLevel,
          apiKey,
          provider: apiProvider,
          messages: messages, // conversation history (without current user msg)
          userMessage: userMsg,
        })
      });
      const data = await res.json();
      const reply = data.error ? `❌ Error: ${data.error}` : data.explanation || 'No response.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Network error. Please try again.' }]);
    }
    setIsGenerating(false);
  };

  const generateAI = (pattern?: any) => {
    const p = pattern || patternData?.patterns?.[0];
    const msg = p
      ? `Explain the ${p.name} pattern detected on ${symbol}.`
      : `Give me an overview of ${symbol}'s current chart setup.`;
    sendMessage(msg, pattern);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isGenerating) return;
    sendMessage(chatInput.trim());
  };

  const current = patternData?.current_price;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── LEFT: Chart + Controls ─────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-800">

        {/* Topbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-[#12131C] shrink-0 flex-wrap">
          {/* Search with autocomplete */}
          <div ref={searchRef} className="relative">
            <form onSubmit={handleSearchSubmit}
              className="flex items-center gap-2 bg-gray-900 border border-gray-700 focus-within:border-blue-500 rounded-lg px-3 py-2">
              <Search size={13} className="text-gray-500 shrink-0"/>
              <input value={searchInput}
                onChange={e => handleSearchChange(e.target.value)}
                onFocus={() => { if (searchInput) setShowSuggestions(true); }}
                className="bg-transparent w-36 text-sm focus:outline-none text-gray-200 placeholder-gray-600"
                placeholder="Company or symbol…"/>
              <button type="submit" className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded shrink-0">Go</button>
            </form>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                {suggestions.map(s => (
                  <button key={s.symbol} onClick={() => selectSymbol(s.symbol)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-800 text-left transition-colors border-b border-gray-800/60 last:border-0">
                    <div>
                      <div className="text-sm font-semibold text-gray-100">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.symbol}</div>
                    </div>
                    <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">NSE</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Price info */}
          {patternData && (
            <div className="flex items-baseline gap-3 min-w-0">
              <span className="font-bold text-gray-100 text-lg truncate">{symbol.replace('.NS','')}</span>
              <span className="font-mono text-lg text-gray-100">₹{Number(current).toFixed(2)}</span>
              <span className="text-xs text-blue-400">S: ₹{patternData.support}</span>
              <span className="text-xs text-red-400">R: ₹{patternData.resistance}</span>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Timeframe Picker */}
            <div className="flex gap-0.5 bg-gray-900 border border-gray-800 rounded-lg p-0.5">
              {Object.keys(TIMEFRAMES).map(tf => (
                <button key={tf} onClick={() => setTimeframe(tf)}
                  className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-all ${timeframe === tf ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}>
                  {tf}
                </button>
              ))}
            </div>

            {/* Chart Type Toggle */}
            <div className="flex gap-0.5 bg-gray-900 border border-gray-800 rounded-lg p-0.5">
              {(['candlestick', 'line'] as const).map(ct => (
                <button key={ct} onClick={() => setChartType(ct)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium capitalize transition-all ${chartType === ct ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}>
                  {ct}
                </button>
              ))}
            </div>

            <button onClick={() => { loadChart(symbol, timeframe); loadPatterns(symbol); }}
              className="text-gray-400 hover:text-white p-2">
              <RefreshCw size={15} className={loadingChart ? 'animate-spin' : ''}/>
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 bg-[#181A20] min-h-0">
          {loadingChart ? (
            <div className="flex h-full items-center justify-center gap-3 text-gray-500">
              <RefreshCw size={18} className="animate-spin text-blue-500"/>
              <span className="animate-pulse text-sm">Fetching NSE data…</span>
            </div>
          ) : chartData.length > 0 ? (
            <Chart data={chartData} chartType={chartType} colors={{ backgroundColor: '#181A20' }}/>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-600 text-sm">No chart data available</div>
          )}
        </div>

        {/* Pattern Detection Strip */}
        <div className="shrink-0 border-t border-gray-800 bg-[#12131C] p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={14} className="text-purple-400"/>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Detected Patterns</h3>
            {loadingPatterns && <RefreshCw size={12} className="animate-spin text-gray-500 ml-1"/>}
          </div>
          {!loadingPatterns && patternData?.patterns?.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
              {patternData.patterns.map((p: any, i: number) => (
                <button key={i} onClick={() => generateAI(p)}
                  className={`flex-shrink-0 bg-gray-900 border rounded-xl px-4 py-3 text-left hover:border-blue-500 transition-all ${selectedPattern?.name === p.name ? 'border-blue-500 bg-blue-500/5' : 'border-gray-800'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-100">{p.name}</span>
                    <PatternBadge type={p.type}/>
                  </div>
                  <div className="text-xs text-gray-500">Confidence: <span className="text-gray-300 font-bold">{p.confidence}%</span></div>
                  {p.key_level && <div className="text-xs text-gray-500 mt-0.5">Key Level: <span className="text-yellow-400 font-mono">₹{p.key_level}</span></div>}
                  <div className="text-[11px] text-blue-400 mt-1.5">Click → AI Explain</div>
                </button>
              ))}
            </div>
          ) : !loadingPatterns ? (
            <div className="text-gray-600 text-sm">No patterns detected yet.</div>
          ) : null}
        </div>
      </div>

      {/* ── RIGHT: AI Chat Panel ────────────────────────────────── */}
      <div className="w-[380px] flex flex-col bg-[#12131C] shrink-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-blue-400">
              <Bot size={18}/><span className="font-bold text-sm uppercase tracking-widest">NIVESHAI</span>
              {messages.length > 0 && (
                <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">{messages.filter(m=>m.role==='assistant').length} replies</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="text-gray-600 hover:text-red-400 transition-colors" title="Clear chat">
                  <Trash2 size={14}/>
                </button>
              )}
              <button onClick={() => setShowKeyInput(v => !v)} className={`transition-colors ${showKeyInput ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
                <Settings size={16}/>
              </button>
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            {['Beginner','Advanced'].map(l => (
              <button key={l} onClick={() => setUserLevel(l)}
                className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-all ${userLevel === l ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'}`}>
                {l}
              </button>
            ))}
          </div>
          {showKeyInput && (
            <div className="space-y-2 mt-2">
              <select value={apiProvider} onChange={e => setApiProvider(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-sm text-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="gemini-3">Gemini 3 Flash Preview</option>
                <option value="gemini-2.0">Gemini 2.0 Flash</option>
                <option value="gemini-1.5">Gemini 1.5 Flash</option>
                <option value="openai">OpenAI GPT-3.5</option>
              </select>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder="Paste API Key…"
                className="w-full bg-gray-900 border border-gray-700 text-sm text-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-600"/>
            </div>
          )}
        </div>

        {/* Backtest pill */}
        {patternData?.backtest && (
          <div className="px-4 pt-3 shrink-0">
            <div className="flex items-center gap-4 bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-3">
              <div className="text-center">
                <div className={`text-lg font-bold ${patternData.backtest.win_rate > 60 ? 'text-green-400' : 'text-yellow-400'}`}>{patternData.backtest.win_rate}%</div>
                <div className="text-[10px] text-gray-500">Win Rate</div>
              </div>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${patternData.backtest.win_rate > 60 ? 'bg-green-500' : 'bg-yellow-500'}`}
                  style={{ width: `${Math.min(patternData.backtest.win_rate, 100)}%` }}/>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${patternData.backtest.avg_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {patternData.backtest.avg_return >= 0 ? '+' : ''}{patternData.backtest.avg_return}%
                </div>
                <div className="text-[10px] text-gray-500">Avg Return</div>
              </div>
            </div>
          </div>
        )}

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Bot size={26} className="text-blue-400/70"/>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-400">Ask NIVESHAI anything</p>
                <p className="text-xs text-gray-600 leading-relaxed px-4">Click a pattern below the chart, or type a question about {symbol.replace('.NS','')}.</p>
              </div>
              {/* Quick prompts */}
              <div className="space-y-2 w-full px-2">
                {[
                  `What patterns are forming on ${symbol.replace('.NS','')}?`,
                  `Is this a good time to buy ${symbol.replace('.NS','')}?`,
                  `What are the key risk levels?`,
                ].map((prompt, i) => (
                  <button key={i} onClick={() => sendMessage(prompt)}
                    className="w-full text-left text-xs text-gray-400 bg-gray-900 border border-gray-800 hover:border-blue-500/50 hover:text-gray-200 px-3 py-2.5 rounded-lg transition-all">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                      <Bot size={14} className="text-white"/>
                    </div>
                  )}
                  <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-gray-800/80 text-gray-200 border border-gray-700/50 rounded-bl-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="space-y-2">
                        {msg.content.split('\n').filter(p => p.trim()).map((para, j) => {
                          const parts = para.split(/(\*\*.*?\*\*)/);
                          return (
                            <p key={j}>
                              {parts.map((pt, k) => pt.startsWith('**') && pt.endsWith('**')
                                ? <strong key={k} className="text-blue-300 font-semibold">{pt.slice(2,-2)}</strong>
                                : pt
                              )}
                            </p>
                          );
                        })}
                      </div>
                    ) : msg.content}
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <Bot size={14} className="text-white"/>
                  </div>
                  <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef}/>
            </>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-gray-800 shrink-0">
          <form onSubmit={handleChatSubmit} className="flex items-center gap-2 bg-gray-900 border border-gray-700 focus-within:border-blue-500 rounded-xl px-3 py-2.5 transition-colors">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={apiKey ? `Ask about ${symbol.replace('.NS','')}…` : 'Add API key (⚙️) to chat…'}
              disabled={isGenerating}
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
            />
            <button type="submit" disabled={!chatInput.trim() || isGenerating}
              className={`p-1.5 rounded-lg transition-all ${chatInput.trim() && !isGenerating ? 'bg-blue-600 text-white hover:bg-blue-500' : 'text-gray-600 cursor-not-allowed'}`}>
              <Send size={15}/>
            </button>
          </form>
          {!apiKey && <p className="text-[11px] text-amber-500 text-center mt-2 font-semibold">⚠️ Click ⚙️ above to add your API key</p>}
        </div>
      </div>
    </div>
  );
}
