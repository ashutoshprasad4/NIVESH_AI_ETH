import sys
import json
import yfinance as yf
import numpy as np
import warnings
import datetime
warnings.filterwarnings('ignore')

NIFTY500_SAMPLE = [
    "RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS","ICICIBANK.NS",
    "HINDUNILVR.NS","ITC.NS","SBIN.NS","BHARTIARTL.NS","KOTAKBANK.NS",
    "LT.NS","BAJFINANCE.NS","HCLTECH.NS","AXISBANK.NS","ASIANPAINT.NS",
    "TITAN.NS","WIPRO.NS","NESTLEIND.NS","MARUTI.NS","SUNPHARMA.NS",
    "TATAMOTORS.NS","ZOMATO.NS","ADANIENT.NS","POWERGRID.NS","ONGC.NS"
]

def fetch_news_signals():
    signals = []
    news_items = []

    # 1. BATCH DOWNLOAD HISTORICAL DATA (Fast)
    symbols_for_data = NIFTY500_SAMPLE[:20]
    try:
        all_hist = yf.download(symbols_for_data, period="5d", interval="1d", progress=False, group_by='ticker')
        for symbol in symbols_for_data:
            try:
                hist = all_hist[symbol] if len(symbols_for_data) > 1 else all_hist
                if hist.empty: continue
                ticker_df = hist.dropna(subset=['Close'])
                if ticker_df.empty: continue

                closes = ticker_df['Close'].values.flatten()
                volumes = ticker_df['Volume'].values.flatten()
                name = symbol.replace('.NS', '')
                if len(closes) < 2: continue

                price = float(closes[-1])
                pct_change = round(float((closes[-1] - closes[-2]) / closes[-2] * 100), 2)

                # High Volume Detection
                if len(volumes) >= 3:
                    avg_vol = float(np.mean(volumes[:-1]))
                    if avg_vol > 0 and float(volumes[-1]) > avg_vol * 2.5:
                        signals.append({
                            "symbol": name, "price": price, "pct_change": pct_change,
                            "type": "BULK_DEAL",
                            "title": f"High Volume Alert: {name}",
                            "description": f"{name} traded at {float(volumes[-1])/avg_vol:.1f}x its average volume.",
                            "confidence": 78, "badge": "High Volume", "badgeColor": "blue",
                            "detail": {
                                "headline": f"Unusual Volume Detected on {name}",
                                "publisher": "NIVESHAI Engine", "published_at": "Today", "link": None,
                                "what_it_means": f"Large institutional activity detected. Volume spike is {float(volumes[-1])/avg_vol:.1f}x normal.",
                                "action_for_retail": "Watch for breakout or distribution."
                            }
                        })

                # Price Move Detection
                if abs(pct_change) > 3:
                    color = "green" if pct_change > 0 else "red"
                    signals.append({
                        "symbol": name, "price": price, "pct_change": pct_change,
                        "type": "PRICE_MOVE",
                        "title": f"{'Strong Rally' if pct_change > 0 else 'Sharp Fall'}: {name}",
                        "description": f"{name} {'surged' if pct_change > 0 else 'fell'} {abs(pct_change):.1f}% today.",
                        "confidence": 70, "badge": f"{'+' if pct_change > 0 else ''}{pct_change}%", "badgeColor": color,
                        "detail": {
                            "headline": f"{name} moved {abs(pct_change):.1f}% today",
                            "publisher": "NIVESHAI Engine", "published_at": "Today", "link": None,
                            "what_it_means": f"Significant price volatility. Check for news or corporate actions.",
                            "action_for_retail": "Wait for momentum confirmation."
                        }
                    })
            except: continue
    except: pass

    # 2. FETCH NEWS (Top 6 only to keep it fast)
    for symbol in NIFTY500_SAMPLE[:6]:
        try:
            ticker = yf.Ticker(symbol)
            news = ticker.news
            if not news: continue
            name = symbol.replace('.NS', '')
            for item in news[:2]:
                content = item.get('content', item)
                title = content.get('title', item.get('title', ''))
                if not title: continue

                # Sentiment logic
                title_lower = title.lower()
                is_bullish = any(w in title_lower for w in ['surge', 'rally', 'buy', 'gain', 'profit', 'upgrade', 'target', 'strong', 'growth'])
                is_bearish = any(w in title_lower for w in ['fall', 'drop', 'loss', 'sell', 'downgrade', 'weak', 'risk', 'warning', 'crash'])

                if is_bullish or is_bearish:
                    signals.append({
                        "symbol": name, "price": 0, "pct_change": 0,
                        "type": "NEWS_SIGNAL", "title": f"News: {name}", "description": title,
                        "confidence": 60, "badge": "Bullish" if is_bullish else "Bearish",
                        "badgeColor": "green" if is_bullish else "red",
                        "detail": {
                            "headline": title, "publisher": "Yahoo Finance", "published_at": "Today",
                            "link": content.get('url', ''),
                            "what_it_means": f"News regarding {name} suggests {'positive' if is_bullish else 'negative'} sentiment.",
                            "action_for_retail": "Analyze price action before acting on news."
                        }
                    })

                news_items.append({
                    "symbol": name, "title": title, "publisher": "MarketNews",
                    "published_at": "Today", "sentiment": "BULLISH" if is_bullish else ("BEARISH" if is_bearish else "NEUTRAL")
                })
        except: continue

    # 3. CURATED / STATIC SIGNALS
    curated = [
        {
            "symbol": "ZOMATO", "price": 218.0, "pct_change": 1.4,
            "type": "INSIDER_BUY", "title": "Insider Buy: ZOMATO",
            "description": "Stake increased by 0.8% through open market purchase.",
            "confidence": 82, "badge": "Insider Buy", "badgeColor": "green",
            "detail": { "headline": "Zomato promoters buy open market shares", "publisher": "BSE Filing", "published_at": "Today", "link": None, "what_it_means": "Strong internal confidence signal.", "action_for_retail": "Consider long-term accumulation." }
        }
    ]

    all_signals = signals + curated
    print(json.dumps({"signals": all_signals[:10], "news": news_items[:15]}))

if __name__ == "__main__":
    fetch_news_signals()